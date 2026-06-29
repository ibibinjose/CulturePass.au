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
  ids?: string[];
}

export function useEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: qk.events(filters),
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(`
          *,
          hub: hubs (name, slug, type, indigenous_led, traditional_custodians, images),
          event_cohosts (
            *,
            hub: hubs (id, name, slug, type, images, indigenous_led),
            profile: profiles!event_cohosts_profile_id_fkey (id, full_name, avatar_url, professional_category)
          )
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
      if (filters.ids && filters.ids.length > 0) query = query.in("id", filters.ids);

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
      const SELECT_FIELDS = `
        *,
        hub: hubs (name, slug, type, indigenous_led, traditional_custodians, images),
        event_cohosts (
          *,
          hub: hubs (id, name, slug, type, images, indigenous_led),
          profile: profiles!event_cohosts_profile_id_fkey (id, full_name, avatar_url, professional_category)
        )
      `;

      // 1. Fetch events hosted by this hub
      const hostedPromise = supabase
        .from("events")
        .select(SELECT_FIELDS)
        .eq("hub_id", hubId)
        .eq("status", "published");

      // 2. Fetch events co-hosted by this hub (accepted only)
      const cohostedPromise = supabase
        .from("event_cohosts")
        .select(`
          event:events (
            ${SELECT_FIELDS}
          )
        `)
        .eq("hub_id", hubId)
        .eq("status", "accepted")
        .eq("event.status", "published");

      const [hostedRes, cohostedRes] = await Promise.all([hostedPromise, cohostedPromise]);

      if (hostedRes.error) throw hostedRes.error;
      if (cohostedRes.error) throw cohostedRes.error;

      const hostedEvents = hostedRes.data ?? [];
      const cohostedEvents = (cohostedRes.data ?? [])
        .map((row) => row.event)
        .filter(Boolean) as any[];

      // Merge and deduplicate by event ID
      const allEventsMap = new Map<string, any>();
      hostedEvents.forEach((e) => allEventsMap.set(e.id, e));
      cohostedEvents.forEach((e) => allEventsMap.set(e.id, e));

      return Array.from(allEventsMap.values()).sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });
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

export function useEventLikes(eventId: string) {
  return useQuery({
    queryKey: qk.eventLikes(eventId),
    queryFn: async () => {
      const profileId = await getCurrentProfileId().catch(() => null);

      // Fetch total count.
      const { count, error: countError } = await supabase
        .from("event_likes")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      if (countError) throw countError;

      let liked = false;
      if (profileId) {
        const { data, error: likeError } = await supabase
          .from("event_likes")
          .select("id")
          .eq("event_id", eventId)
          .eq("profile_id", profileId)
          .maybeSingle();
        if (likeError) throw likeError;
        liked = !!data;
      }

      return { count: count ?? 0, liked };
    },
    enabled: !!eventId,
  });
}

export function useToggleEventLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, liked }: { eventId: string; liked: boolean }) => {
      const profileId = await getCurrentProfileId();
      if (!profileId) throw new Error("Must be signed in to like an event");

      if (liked) {
        const { error } = await supabase
          .from("event_likes")
          .delete()
          .eq("event_id", eventId)
          .eq("profile_id", profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("event_likes")
          .insert({ event_id: eventId, profile_id: profileId });
        if (error) throw error;
      }
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: qk.eventLikes(eventId) });
    },
  });
}

export function useEventSaveStatus(eventId: string) {
  return useQuery({
    queryKey: qk.eventSaves(eventId),
    queryFn: async () => {
      const profileId = await getCurrentProfileId().catch(() => null);
      if (!profileId) return { saved: false };

      const { data, error } = await supabase
        .from("event_saves")
        .select("id")
        .eq("event_id", eventId)
        .eq("profile_id", profileId)
        .maybeSingle();

      if (error) throw error;
      return { saved: !!data };
    },
    enabled: !!eventId,
  });
}

export function useToggleEventSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, saved }: { eventId: string; saved: boolean }) => {
      const profileId = await getCurrentProfileId();
      if (!profileId) throw new Error("Must be signed in to save an event");

      if (saved) {
        const { error } = await supabase
          .from("event_saves")
          .delete()
          .eq("event_id", eventId)
          .eq("profile_id", profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("event_saves")
          .insert({ event_id: eventId, profile_id: profileId });
        if (error) throw error;
      }
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: qk.eventSaves(eventId) });
    },
  });
}
