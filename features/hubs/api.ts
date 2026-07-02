import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type AwsItem, getAwsDataClient } from "@/lib/aws/data";
import { collectAll } from "@/lib/aws/list";
import { compact, fromAwsJson, slugify, toAwsJson } from "@/lib/aws/map";
import { qk } from "@/lib/query";
import { getCurrentProfileId } from "@/features/auth/api";
import type { Database, HubImage } from "@/lib/supabase/database.types";

export interface HubFilters {
  state?: string;
  councilId?: string;
  type?: Database["public"]["Enums"]["hub_type"];
  indigenousLed?: boolean;
  search?: string;
  tag?: string;
}

type HubRow = Database["public"]["Tables"]["hubs"]["Row"];
type HubInsert = Database["public"]["Tables"]["hubs"]["Insert"];
type HubUpdate = Database["public"]["Tables"]["hubs"]["Update"];

type HubCard = Pick<
  HubRow,
  | "id"
  | "name"
  | "slug"
  | "type"
  | "short_description"
  | "location_state"
  | "location_city"
  | "indigenous_led"
  | "traditional_custodians"
  | "images"
  | "verification_status"
  | "status"
  | "categories"
  | "tags"
>;

type HubCouncil = { name: string; traditional_custodians: string[] | null };
type HubDetail = HubRow & { council: HubCouncil | null };

// ---- AppSync → Supabase-row mappers ----------------------------------------

function mapHub(h: AwsItem<"Hub">): HubRow {
  return {
    id: h.id,
    owner_id: h.ownerId,
    type: (h.type ?? "community_cultural_group") as HubRow["type"],
    name: h.name,
    slug: h.slug,
    short_description: h.shortDescription ?? "",
    full_description: h.fullDescription ?? null,
    welcome_to_country: h.welcomeToCountry ?? null,
    traditional_custodians: compact(h.traditionalCustodians),
    indigenous_led: h.indigenousLed ?? false,
    indigenous_partners: compact(h.indigenousPartners),
    location_state: h.locationState ?? null,
    location_council_id: h.locationCouncilId ?? null,
    location_postcode: h.locationPostcode ?? null,
    location_city: h.locationCity ?? null,
    coordinates: h.coordinates ?? null,
    address: h.address ?? null,
    website: h.website ?? null,
    contact_email: h.contactEmail ?? null,
    phone: h.phone ?? null,
    images: fromAwsJson<HubImage[]>(h.images, []),
    categories: compact(h.categories),
    tags: compact(h.tags),
    verification_status: (h.verificationStatus ?? "pending") as HubRow["verification_status"],
    status: (h.status ?? "draft") as HubRow["status"],
    metadata: fromAwsJson<HubRow["metadata"]>(h.metadata, {}),
    created_at: h.createdAt,
    updated_at: h.updatedAt,
  };
}

function mapHubCard(h: AwsItem<"Hub">): HubCard {
  return {
    id: h.id,
    name: h.name,
    slug: h.slug,
    type: (h.type ?? "community_cultural_group") as HubRow["type"],
    short_description: h.shortDescription ?? "",
    location_state: h.locationState ?? null,
    location_city: h.locationCity ?? null,
    indigenous_led: h.indigenousLed ?? false,
    traditional_custodians: compact(h.traditionalCustodians),
    images: fromAwsJson<HubImage[]>(h.images, []),
    verification_status: (h.verificationStatus ?? "pending") as HubRow["verification_status"],
    status: (h.status ?? "draft") as HubRow["status"],
    categories: compact(h.categories),
    tags: compact(h.tags),
  };
}

/** Translate a snake_case hub insert into the AppSync model's camelCase input. */
function toAwsHubInput(input: HubInsert) {
  return {
    ownerId: input.owner_id,
    name: input.name,
    slug: input.slug ?? slugify(input.name),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.short_description !== undefined ? { shortDescription: input.short_description } : {}),
    ...(input.full_description !== undefined ? { fullDescription: input.full_description } : {}),
    ...(input.welcome_to_country !== undefined ? { welcomeToCountry: input.welcome_to_country } : {}),
    ...(input.traditional_custodians !== undefined
      ? { traditionalCustodians: input.traditional_custodians }
      : {}),
    ...(input.indigenous_led !== undefined ? { indigenousLed: input.indigenous_led } : {}),
    ...(input.indigenous_partners !== undefined
      ? { indigenousPartners: input.indigenous_partners }
      : {}),
    ...(input.location_state !== undefined ? { locationState: input.location_state } : {}),
    ...(input.location_council_id !== undefined
      ? { locationCouncilId: input.location_council_id }
      : {}),
    ...(input.location_postcode !== undefined ? { locationPostcode: input.location_postcode } : {}),
    ...(input.location_city !== undefined ? { locationCity: input.location_city } : {}),
    ...(input.coordinates !== undefined ? { coordinates: input.coordinates } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.website !== undefined ? { website: input.website } : {}),
    ...(input.contact_email !== undefined ? { contactEmail: input.contact_email } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.images !== undefined ? { images: toAwsJson(input.images) } : {}),
    ...(input.categories !== undefined ? { categories: input.categories } : {}),
    ...(input.tags !== undefined ? { tags: input.tags } : {}),
    ...(input.verification_status !== undefined
      ? { verificationStatus: input.verification_status }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.metadata !== undefined ? { metadata: toAwsJson(input.metadata) } : {}),
  };
}

/** Translate a snake_case hub patch into the AppSync model's camelCase update input. */
function toAwsHubPatch(patch: HubUpdate) {
  return {
    ...(patch.owner_id !== undefined ? { ownerId: patch.owner_id } : {}),
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    ...(patch.short_description !== undefined ? { shortDescription: patch.short_description } : {}),
    ...(patch.full_description !== undefined ? { fullDescription: patch.full_description } : {}),
    ...(patch.welcome_to_country !== undefined ? { welcomeToCountry: patch.welcome_to_country } : {}),
    ...(patch.traditional_custodians !== undefined
      ? { traditionalCustodians: patch.traditional_custodians }
      : {}),
    ...(patch.indigenous_led !== undefined ? { indigenousLed: patch.indigenous_led } : {}),
    ...(patch.indigenous_partners !== undefined
      ? { indigenousPartners: patch.indigenous_partners }
      : {}),
    ...(patch.location_state !== undefined ? { locationState: patch.location_state } : {}),
    ...(patch.location_council_id !== undefined
      ? { locationCouncilId: patch.location_council_id }
      : {}),
    ...(patch.location_postcode !== undefined ? { locationPostcode: patch.location_postcode } : {}),
    ...(patch.location_city !== undefined ? { locationCity: patch.location_city } : {}),
    ...(patch.coordinates !== undefined ? { coordinates: patch.coordinates } : {}),
    ...(patch.address !== undefined ? { address: patch.address } : {}),
    ...(patch.website !== undefined ? { website: patch.website } : {}),
    ...(patch.contact_email !== undefined ? { contactEmail: patch.contact_email } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.images !== undefined ? { images: toAwsJson(patch.images) } : {}),
    ...(patch.categories !== undefined ? { categories: patch.categories } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    ...(patch.verification_status !== undefined
      ? { verificationStatus: patch.verification_status }
      : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.metadata !== undefined ? { metadata: toAwsJson(patch.metadata) } : {}),
  };
}

export function useHubs(filters: HubFilters = {}) {
  return useQuery({
    queryKey: qk.hubs(filters),
    queryFn: async (): Promise<HubCard[]> => {
      const client = getAwsDataClient();
      const filter = {
        status: { eq: "published" as const },
        ...(filters.state ? { locationState: { eq: filters.state } } : {}),
        ...(filters.councilId ? { locationCouncilId: { eq: filters.councilId } } : {}),
        ...(filters.type ? { type: { eq: filters.type } } : {}),
        ...(filters.indigenousLed ? { indigenousLed: { eq: true } } : {}),
        ...(filters.search ? { name: { contains: filters.search } } : {}),
        ...(filters.tag ? { tags: { contains: filters.tag } } : {}),
      };
      const rows = await collectAll((nextToken) =>
        client.models.Hub.list({ filter, nextToken }),
      );
      // Mirror `.order("created_at", desc).limit(24)`.
      return rows.sort(byCreatedDesc).slice(0, 24).map(mapHubCard);
    },
  });
}

export function useHubStateCounts() {
  return useQuery({
    queryKey: qk.hubStateCounts,
    queryFn: async (): Promise<Record<string, number>> => {
      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.Hub.list({
          filter: { status: { eq: "published" } },
          nextToken,
        }),
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

export function useHub(slug: string) {
  return useQuery({
    queryKey: qk.hub(slug),
    queryFn: async (): Promise<HubDetail | null> => {
      const client = getAwsDataClient();
      const { data } = await client.models.Hub.list({
        filter: { slug: { eq: slug } },
        limit: 1,
      });
      const hub = data[0];
      if (!hub) return null;
      let council: HubCouncil | null = null;
      if (hub.locationCouncilId) {
        const res = await client.models.AustralianCouncil.get({ id: hub.locationCouncilId });
        if (res.data) {
          council = {
            name: res.data.name,
            traditional_custodians: compact(res.data.traditionalCustodians),
          };
        }
      }
      return { ...mapHub(hub), council };
    },
    enabled: slug.length > 0,
  });
}

/**
 * Create a hub. owner_id must be the caller's profile id; AppSync auth enforces this.
 * Returns the created row (with its generated slug).
 */
export function useCreateHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: HubInsert): Promise<HubRow> => {
      const client = getAwsDataClient();
      const { data, errors } = await client.models.Hub.create(toAwsHubInput(input));
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
      if (!data) throw new Error("Hub create failed.");
      return mapHub(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myHubs });
      qc.invalidateQueries({ queryKey: ["hubs"] });
    },
  });
}

/**
 * Update a hub. AppSync auth ensures only the owner can update their hub.
 */
export function useUpdateHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: HubUpdate }): Promise<HubRow> => {
      const client = getAwsDataClient();
      const { data, errors } = await client.models.Hub.update({ id, ...toAwsHubPatch(patch) });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
      if (!data) throw new Error("Hub not found.");
      return mapHub(data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.hub(data.slug) });
      qc.invalidateQueries({ queryKey: qk.myHubs });
      qc.invalidateQueries({ queryKey: ["hubs"] });
    },
  });
}

/**
 * Delete a hub. AppSync auth ensures only the owner can delete their hub.
 */
export function useDeleteHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const client = getAwsDataClient();
      const { errors } = await client.models.Hub.delete({ id });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
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
    queryFn: async (): Promise<HubCard[]> => {
      const profileId = await getCurrentProfileId();
      if (!profileId) {
        throw new Error("User not authenticated");
      }

      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.Hub.list({ filter: { ownerId: { eq: profileId } }, nextToken }),
      );
      return rows.sort(byCreatedDesc).map(mapHubCard);
    },
  });
}

export function useHubLikeStatus(hubId: string) {
  return useQuery({
    queryKey: qk.hubLikes(hubId),
    queryFn: async () => {
      const profileId = await getCurrentProfileId().catch(() => null);

      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.HubLike.list({ filter: { hubId: { eq: hubId } }, nextToken }),
      );
      return {
        count: rows.length,
        liked: profileId ? rows.some((r) => r.profileId === profileId) : false,
      };
    },
    enabled: !!hubId,
  });
}

export function useToggleHubLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ hubId, liked }: { hubId: string; liked: boolean }) => {
      const profileId = await getCurrentProfileId();
      if (!profileId) throw new Error("Must be signed in to like a hub");

      const client = getAwsDataClient();
      if (liked) {
        const { data } = await client.models.HubLike.list({
          filter: { hubId: { eq: hubId }, profileId: { eq: profileId } },
          limit: 1,
        });
        const row = data[0];
        if (row) await client.models.HubLike.delete({ id: row.id });
      } else {
        await client.models.HubLike.create({ hubId, profileId });
      }
    },
    onSuccess: (_, { hubId }) => {
      qc.invalidateQueries({ queryKey: qk.hubLikes(hubId) });
    },
  });
}

export function useHubFollowStatus(hubId: string) {
  return useQuery({
    queryKey: qk.hubFollows(hubId),
    queryFn: async () => {
      const profileId = await getCurrentProfileId().catch(() => null);

      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.HubFollow.list({ filter: { hubId: { eq: hubId } }, nextToken }),
      );
      return {
        count: rows.length,
        followed: profileId ? rows.some((r) => r.profileId === profileId) : false,
      };
    },
    enabled: !!hubId,
  });
}

export function useToggleHubFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ hubId, followed }: { hubId: string; followed: boolean }) => {
      const profileId = await getCurrentProfileId();
      if (!profileId) throw new Error("Must be signed in to follow a hub");

      const client = getAwsDataClient();
      if (followed) {
        const { data } = await client.models.HubFollow.list({
          filter: { hubId: { eq: hubId }, profileId: { eq: profileId } },
          limit: 1,
        });
        const row = data[0];
        if (row) await client.models.HubFollow.delete({ id: row.id });
      } else {
        await client.models.HubFollow.create({ hubId, profileId });
      }
    },
    onSuccess: (_, { hubId }) => {
      qc.invalidateQueries({ queryKey: qk.hubFollows(hubId) });
      qc.invalidateQueries({ queryKey: ["my-followed-hubs"] });
    },
  });
}

export function useMyFollowedHubs() {
  return useQuery({
    queryKey: ["my-followed-hubs"],
    queryFn: async (): Promise<HubCard[]> => {
      const profileId = await getCurrentProfileId().catch(() => null);
      if (!profileId) return [];

      const client = getAwsDataClient();
      const follows = await collectAll((nextToken) =>
        client.models.HubFollow.list({ filter: { profileId: { eq: profileId } }, nextToken }),
      );
      if (follows.length === 0) return [];
      const hubs = await Promise.all(
        follows.map((f) => client.models.Hub.get({ id: f.hubId })),
      );
      return hubs.flatMap((r) => (r.data ? [mapHubCard(r.data)] : []));
    },
  });
}

/** Order Amplify rows by their ISO `createdAt`, newest first. */
function byCreatedDesc(a: { createdAt: string }, b: { createdAt: string }): number {
  return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
}
