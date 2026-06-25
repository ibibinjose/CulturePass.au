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

      const { data, error } = await query;
      if (error) throw error;
      return data;
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
          hub: hubs (name, slug, type, indigenous_led, traditional_custodians)
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      // We'll get the event data to find the hub_id before deletion
      // For now, invalidate all events queries
      qc.invalidateQueries({ queryKey: qk.events({}) });
    },
  });
}