import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type AwsItem, getAwsDataClient } from "@/lib/aws/data";
import { collectAll } from "@/lib/aws/list";
import { compact, fromAwsJson, nullableList, toAwsJson } from "@/lib/aws/map";
import { qk } from "@/lib/query";
import { getCurrentProfileId } from "@/features/auth/api";
import type { Database, HubImage } from "@/lib/supabase/database.types";

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

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

// ---- AppSync → Supabase-row mappers ----------------------------------------

function mapEventRow(e: AwsItem<"Event">): EventRow {
  return {
    id: e.id,
    hub_id: e.hubId,
    type: (e.type ?? "event") as EventRow["type"],
    title: e.title ?? "",
    description: e.description ?? null,
    start_time: e.startTime ?? null,
    end_time: e.endTime ?? null,
    is_free: e.isFree ?? false,
    price: e.price ?? null,
    ticket_url: e.ticketUrl ?? null,
    location_city: e.locationCity ?? null,
    location_state: e.locationState ?? null,
    location_council_id: e.locationCouncilId ?? null,
    coordinates: e.coordinates ?? null,
    capacity: e.capacity ?? null,
    rsvp_count: e.rsvpCount ?? 0,
    images: fromAwsJson<HubImage[]>(e.images, []),
    tags: compact(e.tags),
    cultural_focus: compact(e.culturalFocus),
    status: (e.status ?? "draft") as EventRow["status"],
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    event_dates: nullableList(e.eventDates),
    has_assigned_seating: e.hasAssignedSeating ?? null,
    seating_layout: fromAwsJson<EventRow["seating_layout"]>(e.seatingLayout, null),
    venue_map_url: e.venueMapUrl ?? null,
  };
}

/** Translate a snake_case event insert into the AppSync model's camelCase input. */
function toAwsEventInput(input: EventInsert) {
  return {
    hubId: input.hub_id,
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.start_time !== undefined ? { startTime: input.start_time } : {}),
    ...(input.end_time !== undefined ? { endTime: input.end_time } : {}),
    ...(input.is_free !== undefined ? { isFree: input.is_free } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.ticket_url !== undefined ? { ticketUrl: input.ticket_url } : {}),
    ...(input.location_city !== undefined ? { locationCity: input.location_city } : {}),
    ...(input.location_state !== undefined ? { locationState: input.location_state } : {}),
    ...(input.location_council_id !== undefined
      ? { locationCouncilId: input.location_council_id }
      : {}),
    ...(input.coordinates !== undefined ? { coordinates: input.coordinates } : {}),
    ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
    ...(input.rsvp_count !== undefined ? { rsvpCount: input.rsvp_count } : {}),
    ...(input.images !== undefined ? { images: toAwsJson(input.images) } : {}),
    ...(input.tags !== undefined ? { tags: input.tags } : {}),
    ...(input.cultural_focus !== undefined ? { culturalFocus: input.cultural_focus } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.event_dates !== undefined ? { eventDates: input.event_dates } : {}),
    ...(input.has_assigned_seating !== undefined
      ? { hasAssignedSeating: input.has_assigned_seating }
      : {}),
    ...(input.seating_layout !== undefined ? { seatingLayout: toAwsJson(input.seating_layout) } : {}),
    ...(input.venue_map_url !== undefined ? { venueMapUrl: input.venue_map_url } : {}),
  };
}

function toAwsEventPatch(patch: EventUpdate) {
  // Update input is the same shape minus the required hubId; reuse the builder
  // and only forward hub_id when the patch sets it.
  const { hub_id, ...rest } = patch;
  const base = toAwsEventInput({ ...rest, hub_id: hub_id ?? "" } as EventInsert);
  const { hubId, ...withoutHub } = base;
  return hub_id !== undefined ? { hubId, ...withoutHub } : withoutHub;
}

// ---- AWS nested-embed builders ---------------------------------------------

function buildHubEmbed(h: AwsItem<"Hub">) {
  return {
    id: h.id,
    name: h.name,
    slug: h.slug,
    type: h.type ?? "community_cultural_group",
    owner_id: h.ownerId,
    indigenous_led: h.indigenousLed ?? false,
    traditional_custodians: compact(h.traditionalCustodians),
    images: fromAwsJson<HubImage[]>(h.images, []),
  };
}

async function loadHubEmbed(hubId: string | null | undefined) {
  if (!hubId) return null;
  const client = getAwsDataClient();
  const res = await client.models.Hub.get({ id: hubId });
  return res.data ? buildHubEmbed(res.data) : null;
}

async function loadCohostEmbeds(eventId: string) {
  const client = getAwsDataClient();
  const cohosts = await collectAll((nextToken) =>
    client.models.EventCohost.list({ filter: { eventId: { eq: eventId } }, nextToken }),
  );
  return Promise.all(
    cohosts.map(async (c) => {
      const [hub, profile] = await Promise.all([
        loadHubEmbed(c.hubId),
        c.profileId
          ? client.models.Profile.get({ id: c.profileId }).then((r) => r.data)
          : Promise.resolve(null),
      ]);
      return {
        id: c.id,
        event_id: c.eventId,
        hub_id: c.hubId ?? null,
        profile_id: c.profileId ?? null,
        role: (c.role ?? "cohost") as Database["public"]["Enums"]["cohost_role"],
        status: (c.status ?? "pending") as Database["public"]["Enums"]["cohost_status"],
        invited_by: c.invitedBy,
        message: c.message ?? null,
        created_at: c.createdAt,
        responded_at: c.respondedAt ?? null,
        updated_at: c.updatedAt,
        hub: hub ? { id: hub.id, name: hub.name, slug: hub.slug, images: hub.images } : null,
        profile: profile
          ? {
              id: profile.id,
              full_name: profile.fullName ?? "",
              avatar_url: profile.avatarUrl ?? null,
              professional_category: profile.professionalCategory ?? null,
            }
          : null,
      };
    }),
  );
}

/** Build the full nested event object (event row + hub + cohosts) for AWS. */
async function buildAwsEvent(e: AwsItem<"Event">, withCohosts: boolean) {
  const [hub, event_cohosts] = await Promise.all([
    loadHubEmbed(e.hubId),
    withCohosts ? loadCohostEmbeds(e.id) : Promise.resolve([]),
  ]);
  return { ...mapEventRow(e), hub, event_cohosts };
}

function byStartTimeAsc(a: { startTime?: string | null }, b: { startTime?: string | null }): number {
  if (!a.startTime) return 1;
  if (!b.startTime) return -1;
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}

// ---- Read queries ----------------------------------------------------------

async function fetchEventsAws(filters: EventFilters) {
  const client = getAwsDataClient();
  const filter = {
    status: { eq: "published" as const },
    ...(filters.hubId ? { hubId: { eq: filters.hubId } } : {}),
    ...(filters.state ? { locationState: { eq: filters.state } } : {}),
    ...(filters.councilId ? { locationCouncilId: { eq: filters.councilId } } : {}),
    ...(filters.type ? { type: { eq: filters.type } } : {}),
    ...(filters.search ? { title: { contains: filters.search } } : {}),
    ...(filters.from ? { startTime: { ge: filters.from } } : {}),
    ...(filters.to ? { startTime: { le: filters.to } } : {}),
    ...(filters.tag ? { tags: { contains: filters.tag } } : {}),
  };
  let rows = await collectAll((nextToken) => client.models.Event.list({ filter, nextToken }));
  if (filters.ids && filters.ids.length > 0) {
    const ids = new Set(filters.ids);
    rows = rows.filter((e) => ids.has(e.id));
  }
  rows.sort(byStartTimeAsc);
  return Promise.all(rows.map((e) => buildAwsEvent(e, true)));
}

export function useEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: qk.events(filters),
    queryFn: () => fetchEventsAws(filters),
  });
}

export function useEventStateCounts() {
  return useQuery({
    queryKey: qk.eventStateCounts,
    queryFn: async (): Promise<Record<string, number>> => {
      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.Event.list({ filter: { status: { eq: "published" } }, nextToken }),
      );
      return rows.reduce<Record<string, number>>((counts, row) => {
        if (row.locationState) {
          counts[row.locationState] = (counts[row.locationState] ?? 0) + 1;
        }
        return counts;
      }, {});
    },
  });
}

async function fetchHubEventsAws(hubId: string): Promise<any[]> {
  const client = getAwsDataClient();
  // Hosted events.
  const hosted = await collectAll((nextToken) =>
    client.models.Event.list({
      filter: { hubId: { eq: hubId }, status: { eq: "published" } },
      nextToken,
    }),
  );
  // Accepted co-host invitations for this hub → their (published) events.
  const cohostLinks = await collectAll((nextToken) =>
    client.models.EventCohost.list({
      filter: { hubId: { eq: hubId }, status: { eq: "accepted" } },
      nextToken,
    }),
  );
  const cohostedResults = await Promise.all(
    cohostLinks.map((c) =>
      client.models.Event.list({
        filter: { id: { eq: c.eventId }, status: { eq: "published" } },
        limit: 1,
      }),
    ),
  );
  const cohosted = cohostedResults.flatMap((r) => r.data);

  const dedup = new Map<string, (typeof hosted)[number]>();
  hosted.forEach((e) => dedup.set(e.id, e));
  cohosted.forEach((e) => dedup.set(e.id, e));

  const merged = Array.from(dedup.values()).sort(byStartTimeAsc);
  return Promise.all(merged.map((e) => buildAwsEvent(e, true)));
}

export function useHubEvents(hubId: string) {
  return useQuery({
    queryKey: qk.hubEvents(hubId),
    queryFn: () => fetchHubEventsAws(hubId),
    enabled: !!hubId,
  });
}

async function fetchMyHubEventsAws(hubId: string) {
  const client = getAwsDataClient();
  const rows = await collectAll((nextToken) =>
    client.models.Event.list({ filter: { hubId: { eq: hubId } }, nextToken }),
  );
  rows.sort(byStartTimeAsc);
  return Promise.all(rows.map((e) => buildAwsEvent(e, false)));
}

export function useMyHubEvents(hubId: string) {
  return useQuery({
    queryKey: qk.myHubEvents(hubId),
    queryFn: () => fetchMyHubEventsAws(hubId),
    enabled: !!hubId,
  });
}

async function fetchEventAws(id: string) {
  const client = getAwsDataClient();
  const { data, errors } = await client.models.Event.get({ id });
  if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
  if (!data) return null;
  return buildAwsEvent(data, false);
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: qk.event(id),
    queryFn: () => fetchEventAws(id),
    enabled: id.length > 0,
  });
}

// ---- Mutations -------------------------------------------------------------

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EventInsert): Promise<EventRow> => {
      const client = getAwsDataClient();
      const { data, errors } = await client.models.Event.create(toAwsEventInput(input));
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
      if (!data) throw new Error("Event create failed.");
      return mapEventRow(data);
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
    mutationFn: async ({ id, patch }: { id: string; patch: EventUpdate }): Promise<EventRow> => {
      const client = getAwsDataClient();
      const { data, errors } = await client.models.Event.update({ id, ...toAwsEventPatch(patch) });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
      if (!data) throw new Error("Event not found.");
      return mapEventRow(data);
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
      const client = getAwsDataClient();
      const { errors } = await client.models.Event.delete({ id });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
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

// ---- RSVP / likes / saves --------------------------------------------------

export function useEventSubscriptionStatus(eventId: string) {
  return useQuery({
    queryKey: qk.eventRsvps(eventId),
    queryFn: async () => {
      const profileId = await getCurrentProfileId().catch(() => null);
      if (!profileId) return { subscribed: false, status: null };

      const client = getAwsDataClient();
      const { data } = await client.models.EventRsvp.list({
        filter: { eventId: { eq: eventId }, profileId: { eq: profileId } },
        limit: 1,
      });
      const row = data[0];
      return { subscribed: !!row, status: row?.status ?? null };
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

      const client = getAwsDataClient();
      if (subscribed) {
        const { data } = await client.models.EventRsvp.list({
          filter: { eventId: { eq: eventId }, profileId: { eq: profileId } },
          limit: 1,
        });
        const row = data[0];
        if (row) await client.models.EventRsvp.delete({ id: row.id });
      } else {
        await client.models.EventRsvp.create({ eventId, profileId, status: "going" });
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

      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.EventLike.list({ filter: { eventId: { eq: eventId } }, nextToken }),
      );
      return {
        count: rows.length,
        liked: profileId ? rows.some((r) => r.profileId === profileId) : false,
      };
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

      const client = getAwsDataClient();
      if (liked) {
        const { data } = await client.models.EventLike.list({
          filter: { eventId: { eq: eventId }, profileId: { eq: profileId } },
          limit: 1,
        });
        const row = data[0];
        if (row) await client.models.EventLike.delete({ id: row.id });
      } else {
        await client.models.EventLike.create({ eventId, profileId });
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

      const client = getAwsDataClient();
      const { data } = await client.models.EventSave.list({
        filter: { eventId: { eq: eventId }, profileId: { eq: profileId } },
        limit: 1,
      });
      return { saved: data.length > 0 };
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

      const client = getAwsDataClient();
      if (saved) {
        const { data } = await client.models.EventSave.list({
          filter: { eventId: { eq: eventId }, profileId: { eq: profileId } },
          limit: 1,
        });
        const row = data[0];
        if (row) await client.models.EventSave.delete({ id: row.id });
      } else {
        await client.models.EventSave.create({ eventId, profileId });
      }
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: qk.eventSaves(eventId) });
    },
  });
}
