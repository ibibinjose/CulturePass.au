import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import { getCurrentProfileId } from "@/features/auth/api";
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
  tag?: string;
}

export function useEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: qk.events(filters),
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(`
          *,
          hub: hubs (name, slug, type, indigenous_led, traditional_custodians, images)
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
      if (filters.tag) query = query.contains("tags", [filters.tag]);

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
          hub: hubs (name, slug, type, indigenous_led, traditional_custodians, images)
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

export function useMyHubEvents(hubId: string) {
  return useQuery({
    queryKey: qk.myHubEvents(hubId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          hub: hubs (name, slug, type, indigenous_led, traditional_custodians, owner_id, images)
        `)
        .eq("hub_id", hubId)
        .order("start_time", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
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
          hub: hubs (name, slug, type, indigenous_led, traditional_custodians, owner_id, images)
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
      qc.invalidateQueries({ queryKey: qk.myHubEvents(data.hub_id) });
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
      qc.invalidateQueries({ queryKey: qk.myHubEvents(data.hub_id) });
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
      if (hubId) {
        qc.invalidateQueries({ queryKey: qk.hubEvents(hubId) });
        qc.invalidateQueries({ queryKey: qk.myHubEvents(hubId) });
      }
      // Prefix-match invalidates every ["events", …] filtered list.
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useEventSubscriptionStatus(eventId: string) {
  return useQuery({
    queryKey: qk.eventRsvps(eventId),
    queryFn: async () => {
      const profileId = await getCurrentProfileId().catch(() => null);
      if (!profileId) return { subscribed: false, status: null };

      const { data, error } = await supabase
        .from("event_rsvps")
        .select("status")
        .eq("event_id", eventId)
        .eq("profile_id", profileId)
        .maybeSingle();

      if (error) throw error;
      return {
        subscribed: !!data,
        status: data?.status ?? null,
      };
    },
    enabled: !!eventId,
  });
}

export function useToggleEventSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, subscribed }: { eventId: string; subscribed: boolean }) => {
      const profileId = await getCurrentProfileId();
      if (!profileId) throw new Error("Must be signed in to subscribe to an event");

      if (subscribed) {
        const { error } = await supabase
          .from("event_rsvps")
          .delete()
          .eq("event_id", eventId)
          .eq("profile_id", profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("event_rsvps")
          .insert({ event_id: eventId, profile_id: profileId, status: "going" });
        if (error) throw error;
      }
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: qk.eventRsvps(eventId) });
      qc.invalidateQueries({ queryKey: qk.event(eventId) });
    },
  });
}
