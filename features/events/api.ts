import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import type { Database } from "@/lib/supabase/database.types";

export interface EventFilters {
  hubId?: string;
  state?: string;
  councilId?: string;
  type?: Database["public"]["Enums"]["event_type"];
  search?: string;
  /** Inclusive lower bound on start_time (ISO). */
  from?: string;
  /** Inclusive upper bound on start_time (ISO). */
  to?: string;
}

export function useEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: qk.events(filters),
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(`
          *,
          hub: hubs (name, slug, type, indigenous_led, traditional_custodians)
        `)
        .eq("status", "published")
        .order("start_time", { ascending: true });

      if (filters.hubId) query = query.eq("hub_id", filters.hubId);
      if (filters.state) query = query.eq("location_state", filters.state);
      if (filters.councilId) query = query.eq("location_council_id", filters.councilId);
      if (filters.type) query = query.eq("type", filters.type);
      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      if (filters.from) query = query.gte("start_time", filters.from);
      if (filters.to) query = query.lte("start_time", filters.to);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useEventStateCounts() {
  return useQuery({
    queryKey: qk.eventStateCounts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
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

export function useHubEvents(hubId: string) {
  return useQuery({
    queryKey: qk.hubEvents(hubId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          hub: hubs (name, slug, type, indigenous_led, traditional_custodians)
        `)
        .eq("hub_id", hubId)
        .eq("status", "published")
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!hubId,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: qk.event(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          hub: hubs (name, slug, type, indigenous_led, traditional_custodians, owner_id)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: id.length > 0,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Database["public"]["Tables"]["events"]["Insert"],
    ) => {
      const { data, error } = await supabase.from("events").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.events({ hubId: data.hub_id }) });
      qc.invalidateQueries({ queryKey: qk.hubEvents(data.hub_id) });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Database["public"]["Tables"]["events"]["Update"];
    }) => {
      const { data, error } = await supabase
        .from("events")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.event(data.id) });
      qc.invalidateQueries({ queryKey: qk.events({ hubId: data.hub_id }) });
      qc.invalidateQueries({ queryKey: qk.hubEvents(data.hub_id) });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; hubId?: string }) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, hubId }) => {
      qc.removeQueries({ queryKey: qk.event(id) });
      if (hubId) qc.invalidateQueries({ queryKey: qk.hubEvents(hubId) });
      // Prefix-match invalidates every ["events", …] filtered list.
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
