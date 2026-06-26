import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import { getCurrentProfileId } from "@/features/auth/api";
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

export function useHubStateCounts() {
  return useQuery({
    queryKey: qk.hubStateCounts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hubs")
        .select("location_state")
        .eq("status", "published")
        .not("location_state", "is", null)
        .limit(1000);

      if (error) throw error;

      return (data ?? []).reduce<Record<string, number>>((counts, row) => {
        if (row.location_state) {
          counts[row.location_state] = (counts[row.location_state] ?? 0) + 1;
        }
        return counts;
      }, {});
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

/**
 * Update a hub. RLS ensures only the owner can update their hub.
 */
export function useUpdateHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Database["public"]["Tables"]["hubs"]["Update"];
    }) => {
      const { data, error } = await supabase
        .from("hubs")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.hub(data.slug) });
      qc.invalidateQueries({ queryKey: qk.myHubs });
      qc.invalidateQueries({ queryKey: ["hubs"] });
    },
  });
}

/**
 * Delete a hub. RLS ensures only the owner can delete their hub.
 */
export function useDeleteHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hubs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myHubs });
      qc.invalidateQueries({ queryKey: ["hubs"] });
    },
  });
}

/**
 * Fetch hubs owned by the current user.
 */
export function useMyHubs() {
  return useQuery({
    queryKey: qk.myHubs,
    queryFn: async () => {
      // Scope to the signed-in user. RLS lets authenticated users read every
      // profile, so an unfiltered `.single()` on `profiles` would error — we
      // must resolve the caller's own profile id explicitly.
      const profileId = await getCurrentProfileId();
      if (!profileId) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("hubs")
        .select(HUB_CARD_COLUMNS)
        .eq("owner_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
