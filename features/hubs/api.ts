import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import type { Database } from "@/lib/supabase/database.types";

export interface HubFilters {
  state?: string;
  councilId?: string;
  type?: Database["public"]["Enums"]["hub_type"];
  indigenousLed?: boolean;
  search?: string;
}

const HUB_CARD_COLUMNS =
  "id, name, slug, type, short_description, location_state, location_city, indigenous_led, traditional_custodians, images, verification_status";

export function useHubs(filters: HubFilters = {}) {
  return useQuery({
    queryKey: qk.hubs(filters),
    queryFn: async () => {
      let query = supabase
        .from("hubs")
        .select(HUB_CARD_COLUMNS)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(24);

      if (filters.state) query = query.eq("location_state", filters.state);
      if (filters.councilId) query = query.eq("location_council_id", filters.councilId);
      if (filters.type) query = query.eq("type", filters.type);
      if (filters.indigenousLed) query = query.eq("indigenous_led", true);
      if (filters.search) query = query.ilike("name", `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useHub(slug: string) {
  return useQuery({
    queryKey: qk.hub(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hubs")
        .select("*, council:australian_councils(name, traditional_custodians)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: slug.length > 0,
  });
}

/**
 * Create a hub. owner_id must be the caller's profile id; RLS enforces this.
 * Returns the created row (with its generated slug).
 */
export function useCreateHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Database["public"]["Tables"]["hubs"]["Insert"],
    ) => {
      const { data, error } = await supabase.from("hubs").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myHubs });
      qc.invalidateQueries({ queryKey: ["hubs"] });
    },
  });
}
