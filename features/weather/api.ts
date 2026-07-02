import { useQuery } from "@tanstack/react-query";

// Free, key-less weather for the top bar. Location is best-effort via IP
// geolocation; we fall back to Sydney so something sensible always shows.
// Both endpoints degrade gracefully — any failure just yields the fallback.

const SYDNEY = { lat: -33.8688, lon: 151.2093, name: "Sydney" } as const;

interface Geo {
  lat: number;
  lon: number;
  name: string;
}

export interface Weather {
  tempC: number;
  code: number;
  name: string;
  emoji: string;
  windDirection?: number; // degrees, 0 = north, direction wind is blowing FROM
  windSpeed?: number; // km/h
  pollution?: {
    pm25: number;
    aqi: number; // approximate 0-500 or EU scale
    level: string;
    emoji: string;
  };
  surf?: {
    waveHeight?: number; // meters
    swellHeight?: number; // meters
    period?: number; // seconds
  };
}

async function ipGeo(): Promise<Geo> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("geo");
    const j = await res.json();
    if (typeof j.latitude === "number" && typeof j.longitude === "number") {
      return { lat: j.latitude, lon: j.longitude, name: j.city || "" };
    }
  } catch {
    // ignore — fall through to the default
  }
  return SYDNEY;
}

/** Map a WMO weather code to a small emoji glyph. */
function emojiFor(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

export function useWeather(customLocation?: { lat: number; lon: number; name?: string }) {
  return useQuery({
    queryKey: ["weather", customLocation?.lat, customLocation?.lon],
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Weather | null> => {
      let geo: Geo;
      let useCustom = false;
      if (customLocation && typeof customLocation.lat === 'number' && typeof customLocation.lon === 'number') {
        geo = { lat: customLocation.lat, lon: customLocation.lon, name: customLocation.name || '' };
        useCustom = true;
      } else {
        geo = await ipGeo();
      }
      const base = `latitude=${geo.lat}&longitude=${geo.lon}`;
      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast?${base}` +
        `&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m`;
      const aqUrl =
        `https://air-quality-api.open-meteo.com/v1/air-quality?${base}` +
        `&current=pm2_5,pm10,european_aqi`;
      const marineUrl =
        `https://marine-api.open-meteo.com/v1/marine?${base}` +
        `&current=wave_height,wave_direction,swell_wave_height,swell_wave_period`;

      const [weatherRes, aqRes, marineRes] = await Promise.all([
        fetch(weatherUrl),
        fetch(aqUrl),
        fetch(marineUrl),
      ]);

      if (!weatherRes.ok) throw new Error("weather");
      const w = await weatherRes.json();
      const temp = w?.current?.temperature_2m;
      if (typeof temp !== "number") return null;
      const code = typeof w?.current?.weather_code === "number" ? w.current.weather_code : 0;
      const windDir = typeof w?.current?.wind_direction_10m === "number" ? w.current.wind_direction_10m : undefined;
      const windSp = typeof w?.current?.wind_speed_10m === "number" ? w.current.wind_speed_10m : undefined;

      let pollution: Weather["pollution"] | undefined;
      if (aqRes.ok) {
        const a = await aqRes.json();
        const pm25 = a?.current?.pm2_5;
        const aqi = a?.current?.european_aqi;
        if (typeof pm25 === "number") {
          const level = aqi != null
            ? aqi <= 20 ? "Good" : aqi <= 40 ? "Fair" : aqi <= 60 ? "Moderate" : aqi <= 100 ? "Poor" : "Very Poor"
            : "Moderate";
          const emoji = level === "Good" ? "🌿" : level === "Fair" ? "🌤️" : level === "Moderate" ? "🌫️" : level === "Poor" ? "😷" : "☠️";
          pollution = {
            pm25: Math.round(pm25),
            aqi: typeof aqi === "number" ? Math.round(aqi) : 50,
            level,
            emoji,
          };
        }
      }

      let surf: { waveHeight?: number; swellHeight?: number; period?: number } | undefined;
      if (marineRes.ok) {
        const m = await marineRes.json();
        const wh = m?.current?.wave_height;
        const sh = m?.current?.swell_wave_height;
        const sp = m?.current?.swell_wave_period;
        if (typeof wh === 'number' || typeof sh === 'number') {
          surf = {
            waveHeight: typeof wh === 'number' ? Math.round(wh * 10) / 10 : undefined,
            swellHeight: typeof sh === 'number' ? Math.round(sh * 10) / 10 : undefined,
            period: typeof sp === 'number' ? Math.round(sp) : undefined,
          };
        }
      }

      return {
        tempC: Math.round(temp),
        code,
        name: useCustom ? (geo.name || 'Location') : (geo.name || SYDNEY.name),
        emoji: emojiFor(code),
        windDirection: windDir,
        windSpeed: windSp,
        pollution,
        surf,
      };
    },
  });
}
