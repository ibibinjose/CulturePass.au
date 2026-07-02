import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteUser } from "aws-amplify/auth";
import { type AwsItem, getAwsDataClient } from "@/lib/aws/data";
import { collectAll, findFirst } from "@/lib/aws/list";
import { compact, fromAwsJson, toAwsJson } from "@/lib/aws/map";
import { qk } from "@/lib/query";
import { getCurrentProfileId } from "@/features/auth/api";
import { getAwsCurrentUserId } from "@/lib/aws/auth";
import type { Database, HubImage } from "@/lib/types/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export interface ProfileWithHubs extends Profile {
  hubs?: {
    id: string;
    name: string;
    slug: string;
    images: HubImage[];
  }[];
}

// ---- AppSync → legacy row mappers (snake_case shapes) ----------------------------------------

function mapProfile(p: AwsItem<"Profile">): Profile {
  return {
    id: p.id,
    user_id: p.userId,
    username: p.username ?? null,
    full_name: p.fullName ?? "",
    avatar_url: p.avatarUrl ?? null,
    bio: p.bio ?? null,
    location: p.location ?? null,
    coordinates: p.coordinates ?? null,
    interests: compact(p.interests),
    cultural_background: p.culturalBackground ?? null,
    indigenous_connection: p.indigenousConnection ?? null,
    preferred_languages: compact(p.preferredLanguages),
    is_public_professional: p.isPublicProfessional ?? false,
    is_admin: p.isAdmin ?? false,
    professional_category: (p.professionalCategory ?? null) as Profile["professional_category"],
    professional_title: p.professionalTitle ?? null,
    public_bio: p.publicBio ?? null,
    public_links: fromAwsJson<Profile["public_links"]>(p.publicLinks, {}),
    preferences: fromAwsJson<Profile["preferences"]>(p.preferences, {}),
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function mapHubCard(h: AwsItem<"Hub">): NonNullable<ProfileWithHubs["hubs"]>[number] {
  // `images` is AWSJSON — a string until parsed (gotcha: never pass it through raw).
  return { id: h.id, name: h.name, slug: h.slug, images: fromAwsJson<HubImage[]>(h.images, []) };
}

/** Published hub cards owned by a profile — the `hubs` half of ProfileWithHubs. */
async function fetchAwsProfileHubs(profileId: string) {
  const client = getAwsDataClient();
  const hubs = await collectAll((nextToken) =>
    client.models.Hub.list({
      filter: { ownerId: { eq: profileId }, status: { eq: "published" } },
      nextToken,
    }),
  );
  return hubs.map(mapHubCard);
}

/** Translate a snake_case profile patch into the AppSync model's camelCase input. */
function toAwsProfilePatch(p: ProfileUpdate) {
  return {
    ...(p.username !== undefined ? { username: p.username } : {}),
    ...(p.full_name !== undefined ? { fullName: p.full_name } : {}),
    ...(p.avatar_url !== undefined ? { avatarUrl: p.avatar_url } : {}),
    ...(p.bio !== undefined ? { bio: p.bio } : {}),
    ...(p.location !== undefined ? { location: p.location } : {}),
    ...(p.coordinates !== undefined ? { coordinates: p.coordinates } : {}),
    ...(p.interests !== undefined ? { interests: p.interests } : {}),
    ...(p.cultural_background !== undefined ? { culturalBackground: p.cultural_background } : {}),
    ...(p.indigenous_connection !== undefined
      ? { indigenousConnection: p.indigenous_connection }
      : {}),
    ...(p.preferred_languages !== undefined ? { preferredLanguages: p.preferred_languages } : {}),
    ...(p.is_public_professional !== undefined
      ? { isPublicProfessional: p.is_public_professional }
      : {}),
    ...(p.is_admin !== undefined ? { isAdmin: p.is_admin } : {}),
    ...(p.professional_category !== undefined
      ? { professionalCategory: p.professional_category }
      : {}),
    ...(p.professional_title !== undefined ? { professionalTitle: p.professional_title } : {}),
    ...(p.public_bio !== undefined ? { publicBio: p.public_bio } : {}),
    ...(p.public_links !== undefined ? { publicLinks: toAwsJson(p.public_links) } : {}),
    ...(p.preferences !== undefined ? { preferences: toAwsJson(p.preferences) } : {}),
  };
}

/** The signed-in user's own profile (null when signed out). */
export function useMyProfile() {
  return useQuery({
    queryKey: qk.myProfile,
    queryFn: async (): Promise<ProfileWithHubs | null> => {
      const userId = await getAwsCurrentUserId();
      if (!userId) return null;
      const client = getAwsDataClient();
      const profile = await findFirst((nextToken) =>
        client.models.Profile.list({ filter: { userId: { eq: userId } }, nextToken }),
      );
      if (!profile) return null;
      return { ...mapProfile(profile), hubs: await fetchAwsProfileHubs(profile.id) };
    },
    staleTime: 30_000,
  });
}

/** A profile by id — used to render a Public (Professional) Profile page. */
export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: qk.profile(id ?? "none"),
    enabled: !!id,
    queryFn: async (): Promise<ProfileWithHubs | null> => {
      const client = getAwsDataClient();
      const { data, errors } = await client.models.Profile.get({ id: id! });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
      if (!data) return null;
      return { ...mapProfile(data), hubs: await fetchAwsProfileHubs(data.id) };
    },
  });
}

/** Search public professional profiles by name or bio. */
export function useSearchProfiles(searchQuery: string) {
  const query = searchQuery.trim();
  return useQuery({
    queryKey: ["profiles", "search", query],
    enabled: query.length > 0,
    queryFn: async () => {
      const client = getAwsDataClient();
      // NOTE: DynamoDB `contains` is case-sensitive, unlike Postgres ilike —
      // real search will want OpenSearch; fine for the current AWS branch.
      const rows = await collectAll((nextToken) =>
        client.models.Profile.list({
          filter: {
            isPublicProfessional: { eq: true },
            or: [
              { fullName: { contains: query } },
              { username: { contains: query } },
              { bio: { contains: query } },
            ],
          },
          nextToken,
        }),
      );
      return rows.map((p) => ({
        id: p.id,
        username: p.username ?? null,
        full_name: p.fullName ?? "",
        avatar_url: p.avatarUrl ?? null,
        bio: p.bio ?? null,
        interests: compact(p.interests),
        professional_category: (p.professionalCategory ??
          null) as Profile["professional_category"],
        professional_title: p.professionalTitle ?? null,
      }));
    },
  });
}

/**
 * Update the signed-in user's own profile.
 * Used by the edit-profile, privacy and notification settings screens, and to
 * turn a normal account into a Professional Public Account.
 */
export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfileUpdate): Promise<Profile> => {
      const id = await getCurrentProfileId();
      if (!id) throw new Error("Sign in to update your profile.");
      const client = getAwsDataClient();
      const { data, errors } = await client.models.Profile.update({
        id,
        ...toAwsProfilePatch(patch),
      });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
      if (!data) throw new Error("Profile not found.");
      return mapProfile(data);
    },
    onSuccess: (data) => {
      qc.setQueryData(qk.myProfile, data);
      qc.invalidateQueries({ queryKey: qk.profile(data.id) });
    },
  });
}

/** Permanently delete the signed-in user's account (cascades to their data). */
export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const profileId = await getCurrentProfileId().catch(() => null);
      if (profileId) {
        const client = getAwsDataClient();
        await client.models.Profile.delete({ id: profileId });
      }
      await deleteUser();
    },
    onSuccess: () => qc.clear(),
  });
}

export function useProfileFollowStatus(profileId: string) {
  return useQuery({
    queryKey: qk.profileFollows(profileId),
    queryFn: async () => {
      const currentId = await getCurrentProfileId().catch(() => null);

      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.ProfileFollow.list({
          filter: { followingId: { eq: profileId } },
          nextToken,
        }),
      );
      return {
        count: rows.length,
        followed: currentId ? rows.some((r) => r.followerId === currentId) : false,
      };
    },
    enabled: !!profileId,
  });
}

export function useToggleProfileFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, followed }: { profileId: string; followed: boolean }) => {
      const currentId = await getCurrentProfileId();
      if (!currentId) throw new Error("Must be signed in to follow a profile");

      const client = getAwsDataClient();
      if (followed) {
        const row = await findFirst((nextToken) =>
          client.models.ProfileFollow.list({
            filter: { followerId: { eq: currentId }, followingId: { eq: profileId } },
            nextToken,
          }),
        );
        if (row) await client.models.ProfileFollow.delete({ id: row.id });
      } else {
        await client.models.ProfileFollow.create({
          followerId: currentId,
          followingId: profileId,
        });
      }
    },
    onSuccess: (_, { profileId }) => {
      qc.invalidateQueries({ queryKey: qk.profileFollows(profileId) });
    },
  });
}

export function useProfileSubscriptionStatus(profileId: string) {
  return useQuery({
    queryKey: qk.profileSubscriptions(profileId),
    queryFn: async () => {
      const currentId = await getCurrentProfileId().catch(() => null);

      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.ProfileSubscription.list({
          filter: { profileId: { eq: profileId } },
          nextToken,
        }),
      );
      return {
        count: rows.length,
        subscribed: currentId ? rows.some((r) => r.subscriberId === currentId) : false,
      };
    },
    enabled: !!profileId,
  });
}

export function useToggleProfileSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, subscribed }: { profileId: string; subscribed: boolean }) => {
      const currentId = await getCurrentProfileId();
      if (!currentId) throw new Error("Must be signed in to subscribe to a profile");

      const client = getAwsDataClient();
      if (subscribed) {
        const row = await findFirst((nextToken) =>
          client.models.ProfileSubscription.list({
            filter: { profileId: { eq: profileId }, subscriberId: { eq: currentId } },
            nextToken,
          }),
        );
        if (row) await client.models.ProfileSubscription.delete({ id: row.id });
      } else {
        await client.models.ProfileSubscription.create({
          profileId,
          subscriberId: currentId,
        });
      }
    },
    onSuccess: (_, { profileId }) => {
      qc.invalidateQueries({ queryKey: qk.profileSubscriptions(profileId) });
    },
  });
}
