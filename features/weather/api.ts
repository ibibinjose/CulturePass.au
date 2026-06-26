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

export function useWeather() {
  return useQuery({
    queryKey: ["weather"],
    staleTime: 15 * 60_000, // 15 min — weather doesn't need to be realtime
    gcTime: 60 * 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Weather | null> => {
      const geo = await ipGeo();
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}` +
        `&longitude=${geo.lon}&current=temperature_2m,weather_code`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("weather");
      const j = await res.json();
      const temp = j?.current?.temperature_2m;
      if (typeof temp !== "number") return null;
      const code = typeof j?.current?.weather_code === "number" ? j.current.weather_code : 0;
      return {
        tempC: Math.round(temp),
        code,
        name: geo.name || SYDNEY.name,
        emoji: emojiFor(code),
      };
    },
  });
}
