import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type AwsItem, getAwsDataClient } from "@/lib/aws/data";
import { collectAll } from "@/lib/aws/list";
import { qk } from "@/lib/query";
import type { StateCode } from "@/lib/constants";
import type { LocationValue } from "@/components/ui/LocationPicker";

// ---- AppSync → Supabase-row mappers ----------------------------------------
// Keep the AWS branches returning the exact snake_case shapes the Supabase
// `select(...)` columns produced, so every consumer is backend-agnostic.

/** Subset of `australian_states` columns `useStates` selects. */
type StateRow = { code: string; name: string; capital_city: string; sort_order: number };
/** Subset of `australian_councils` columns the council hooks select. */
type CouncilRow = {
  id: string;
  name: string;
  slug: string;
  state_code: string;
  is_metro: boolean;
  population: number | null;
  traditional_custodians: string[] | null;
  logo_url: string | null;
  website: string | null;
};

function mapState(s: AwsItem<"AustralianState">): StateRow {
  return {
    code: s.code,
    name: s.name,
    capital_city: s.capitalCity ?? "",
    sort_order: s.sortOrder ?? 0,
  };
}

function mapCouncil(c: AwsItem<"AustralianCouncil">): CouncilRow {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    state_code: c.stateCode,
    is_metro: c.isMetro ?? false,
    population: c.population ?? null,
    traditional_custodians:
      c.traditionalCustodians?.filter((t): t is string => t != null) ?? null,
    logo_url: c.logoUrl ?? null,
    website: c.website ?? null,
  };
}

export function useStates() {
  return useQuery({
    queryKey: qk.states,
    queryFn: async (): Promise<StateRow[]> => {
      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.AustralianState.list({ nextToken }),
      );
      // DynamoDB lists are unordered; mirror Supabase `.order("sort_order")`.
      return rows.map(mapState).sort((a, b) => a.sort_order - b.sort_order);
    },
    staleTime: Infinity, // reference data rarely changes
  });
}

export function useCouncils(stateCode?: string) {
  return useQuery({
    queryKey: qk.councils(stateCode),
    queryFn: async (): Promise<CouncilRow[]> => {
      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.AustralianCouncil.list({
          nextToken,
          ...(stateCode ? { filter: { stateCode: { eq: stateCode } } } : {}),
        }),
      );
      // Mirror Supabase `.order("name")`.
      return rows.map(mapCouncil).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: stateCode === undefined || stateCode.length > 0,
    staleTime: Infinity,
  });
}

/** Full details for a single council (name, custodians, population, …). */
export function useCouncilDetails(councilId?: string) {
  return useQuery({
    queryKey: qk.councilDetails(councilId ?? ""),
    queryFn: async (): Promise<CouncilRow | null> => {
      const client = getAwsDataClient();
      const { data, errors } = await client.models.AustralianCouncil.get({
        id: councilId as string,
      });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
      return data ? mapCouncil(data) : null;
    },
    enabled: !!councilId,
    staleTime: Infinity,
  });
}

/** Admin edit of a council's editorial fields (custodians, population, …). */
export interface UpdateCouncilInput {
  id: string;
  traditionalCustodians: string[] | null;
  population: number | null;
  website: string | null;
  logoUrl: string | null;
  isMetro: boolean;
}

export function useUpdateCouncil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateCouncilInput) => {
      const client = getAwsDataClient();
      const { errors } = await client.models.AustralianCouncil.update(input);
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: qk.councilDetails(id) });
    },
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

      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.AustralianCouncil.list({
          nextToken,
          filter: { stateCode: { eq: stateCode } },
        }),
      );
      const councils = rows.map((c) => ({ id: c.id, name: c.name, state_code: c.stateCode }));

      if (councils.length === 0) {
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
