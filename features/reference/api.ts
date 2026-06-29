import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import type { StateCode } from "@/lib/constants";
import type { LocationValue } from "@/components/ui/LocationPicker";

export function useStates() {
  return useQuery({
    queryKey: qk.states,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("australian_states")
        .select("code, name, capital_city, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    staleTime: Infinity, // reference data rarely changes
  });
}

export function useCouncils(stateCode?: string) {
  return useQuery({
    queryKey: qk.councils(stateCode),
    queryFn: async () => {
      let query = supabase
        .from("australian_councils")
        .select("id, name, slug, state_code, is_metro, population, traditional_custodians")
        .order("name");
      if (stateCode) query = query.eq("state_code", stateCode);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: stateCode === undefined || stateCode.length > 0,
    staleTime: Infinity,
  });
}

/** Full details for a single council (name, custodians, population, …). */
export function useCouncilDetails(councilId?: string) {
  return useQuery({
    queryKey: qk.councilDetails(councilId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("australian_councils")
        .select("id, name, slug, state_code, is_metro, population, traditional_custodians")
        .eq("id", councilId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!councilId,
    staleTime: Infinity,
  });
}

// Map of OpenStreetMap state names → our state codes (for geolocation matching).
const STATE_NAME_TO_CODE: Record<string, StateCode> = {
  "new south wales": "NSW",
  victoria: "VIC",
  queensland: "QLD",
  "western australia": "WA",
  "south australia": "SA",
  tasmania: "TAS",
  "australian capital territory": "ACT",
  "northern territory": "NT",
};

/**
 * Detects the user's local council from device geolocation: reverse-geocodes via
 * OpenStreetMap Nominatim, then fuzzy-matches the council name against
 * `australian_councils`. UI-free — `detect()` resolves a `LocationValue` or
 * throws with a user-readable message, so callers own the success/error UX.
 */
export function useDetectCouncil() {
  const [detecting, setDetecting] = useState(false);

  const detect = useCallback(async (): Promise<LocationValue> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      throw new Error("Geolocation isn't supported on this device.");
    }
    setDetecting(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const { latitude, longitude } = position.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
      );
      if (!res.ok) throw new Error("Couldn't resolve your location — please choose manually.");
      const geo = await res.json();

      const stateName: string | undefined = geo.address?.state?.toLowerCase();
      const county: string | undefined =
        geo.address?.county || geo.address?.city_district || geo.address?.city;
      if (!stateName || !county) {
        throw new Error("Couldn't resolve your local council — please choose manually.");
      }
      const stateCode = STATE_NAME_TO_CODE[stateName];
      if (!stateCode) throw new Error("That state isn't supported yet.");

      const { data: councils } = await supabase
        .from("australian_councils")
        .select("id, name, state_code")
        .eq("state_code", stateCode);
      if (!councils || councils.length === 0) {
        throw new Error("No councils found for your state.");
      }

      const cleanCounty = county.toLowerCase().replace("council", "").replace("city of", "").trim();
      const matched =
        councils.find((c) => {
          const cleanName = c.name
            .toLowerCase()
            .replace("council", "")
            .replace("city of", "")
            .trim();
          return cleanName.includes(cleanCounty) || cleanCounty.includes(cleanName);
        }) ?? councils[0];
      if (!matched) throw new Error("Couldn't match your council — please choose manually.");

      return { state: stateCode, councilId: matched.id, label: matched.name };
    } finally {
      setDetecting(false);
    }
  }, []);

  return { detect, detecting };
}
