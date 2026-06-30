import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { isAwsBackend } from "@/lib/backend";
import { type AwsItem, getAwsDataClient } from "@/lib/aws/data";
import { collectAll } from "@/lib/aws/list";
import { compact } from "@/lib/aws/map";
import { qk } from "@/lib/query";
import { getCurrentProfileId } from "@/features/auth/api";
import { getAwsCurrentUserId } from "@/lib/aws/auth";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export interface ProfileWithHubs extends Profile {
  hubs?: {
    id: string;
    name: string;
    slug: string;
    images: any;
  }[];
}

// ---- AppSync → Supabase-row mappers ----------------------------------------

function mapProfile(p: AwsItem<"Profile">): Profile {
  return {
    id: p.id,
    user_id: p.userId,
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
    public_links: (p.publicLinks ?? {}) as Profile["public_links"],
    preferences: (p.preferences ?? {}) as Profile["preferences"],
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function mapHubCard(h: AwsItem<"Hub">): NonNullable<ProfileWithHubs["hubs"]>[number] {
  return { id: h.id, name: h.name, slug: h.slug, images: h.images ?? [] };
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
    ...(p.public_links !== undefined ? { publicLinks: p.public_links } : {}),
    ...(p.preferences !== undefined ? { preferences: p.preferences } : {}),
  };
}

/** The signed-in user's own profile (null when signed out). */
export function useMyProfile() {
  return useQuery({
    queryKey: qk.myProfile,
    queryFn: async (): Promise<ProfileWithHubs | null> => {
      if (isAwsBackend) {
        const userId = await getAwsCurrentUserId();
        if (!userId) return null;
        const client = getAwsDataClient();
        const { data } = await client.models.Profile.list({
          filter: { userId: { eq: userId } },
          limit: 1,
        });
        const profile = data[0];
        if (!profile) return null;
        return { ...mapProfile(profile), hubs: await fetchAwsProfileHubs(profile.id) };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!profile) return null;

      const { data: hubs } = await supabase
        .from("hubs")
        .select("id, name, slug, images")
        .eq("owner_id", profile.id)
        .eq("status", "published");

      return {
        ...profile,
        hubs: hubs ?? [],
      };
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
      if (isAwsBackend) {
        const client = getAwsDataClient();
        const { data, errors } = await client.models.Profile.get({ id: id! });
        if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
        if (!data) return null;
        return { ...mapProfile(data), hubs: await fetchAwsProfileHubs(data.id) };
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!profile) return null;

      const { data: hubs } = await supabase
        .from("hubs")
        .select("id, name, slug, images")
        .eq("owner_id", profile.id)
        .eq("status", "published");

      return {
        ...profile,
        hubs: hubs ?? [],
      };
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
      if (isAwsBackend) {
        const client = getAwsDataClient();
        // NOTE: DynamoDB `contains` is case-sensitive, unlike Postgres ilike —
        // real search will want OpenSearch; fine for the dormant AWS branch.
        const rows = await collectAll((nextToken) =>
          client.models.Profile.list({
            filter: {
              isPublicProfessional: { eq: true },
              or: [{ fullName: { contains: query } }, { bio: { contains: query } }],
            },
            nextToken,
          }),
        );
        return rows.map((p) => ({
          id: p.id,
          full_name: p.fullName ?? "",
          avatar_url: p.avatarUrl ?? null,
          bio: p.bio ?? null,
          interests: compact(p.interests),
          professional_category: (p.professionalCategory ??
            null) as Profile["professional_category"],
          professional_title: p.professionalTitle ?? null,
        }));
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, interests, professional_category, professional_title")
        .eq("is_public_professional", true)
        .or(`full_name.ilike.%${query}%,bio.ilike.%${query}%`);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Update the signed-in user's own profile (RLS restricts to user_id = auth.uid()).
 * Used by the edit-profile, privacy and notification settings screens, and to
 * turn a normal account into a Professional Public Account.
 */
export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfileUpdate): Promise<Profile> => {
      if (isAwsBackend) {
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
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to update your profile.");

      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      if (isAwsBackend) {
        // Supabase does this in one `delete_my_account` Postgres function (cascade
        // + auth user removal). On AWS this needs a Lambda that deletes the Cognito
        // user and the owner's DynamoDB rows. Tracked as migration follow-up.
        throw new Error("Account deletion isn't wired up on AWS yet.");
      }
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      await supabase.auth.signOut();
    },
    onSuccess: () => qc.clear(),
  });
}

export function useProfileFollowStatus(profileId: string) {
  return useQuery({
    queryKey: qk.profileFollows(profileId),
    queryFn: async () => {
      const currentId = await getCurrentProfileId().catch(() => null);

      if (isAwsBackend) {
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
      }

      // Fetch total follower count.
      const { count, error: countError } = await supabase
        .from("profile_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId);

      if (countError) throw countError;

      let followed = false;
      if (currentId) {
        const { data, error: followError } = await supabase
          .from("profile_follows")
          .select("id")
          .eq("follower_id", currentId)
          .eq("following_id", profileId)
          .maybeSingle();
        if (followError) throw followError;
        followed = !!data;
      }

      return { count: count ?? 0, followed };
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

      if (isAwsBackend) {
        const client = getAwsDataClient();
        if (followed) {
          const { data } = await client.models.ProfileFollow.list({
            filter: { followerId: { eq: currentId }, followingId: { eq: profileId } },
            limit: 1,
          });
          const row = data[0];
          if (row) await client.models.ProfileFollow.delete({ id: row.id });
        } else {
          await client.models.ProfileFollow.create({
            followerId: currentId,
            followingId: profileId,
          });
        }
        return;
      }

      if (followed) {
        const { error } = await supabase
          .from("profile_follows")
          .delete()
          .eq("follower_id", currentId)
          .eq("following_id", profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profile_follows")
          .insert({ follower_id: currentId, following_id: profileId });
        if (error) throw error;
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

      if (isAwsBackend) {
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
      }

      // Fetch total subscriber count.
      const { count, error: countError } = await supabase
        .from("profile_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("subscribed_to_id", profileId);

      if (countError) throw countError;

      let subscribed = false;
      if (currentId) {
        const { data, error: subError } = await supabase
          .from("profile_subscriptions")
          .select("id")
          .eq("subscriber_id", currentId)
          .eq("subscribed_to_id", profileId)
          .maybeSingle();
        if (subError) throw subError;
        subscribed = !!data;
      }

      return { count: count ?? 0, subscribed };
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

      if (isAwsBackend) {
        const client = getAwsDataClient();
        if (subscribed) {
          const { data } = await client.models.ProfileSubscription.list({
            filter: { profileId: { eq: profileId }, subscriberId: { eq: currentId } },
            limit: 1,
          });
          const row = data[0];
          if (row) await client.models.ProfileSubscription.delete({ id: row.id });
        } else {
          await client.models.ProfileSubscription.create({
            profileId,
            subscriberId: currentId,
          });
        }
        return;
      }

      if (subscribed) {
        const { error } = await supabase
          .from("profile_subscriptions")
          .delete()
          .eq("subscriber_id", currentId)
          .eq("subscribed_to_id", profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profile_subscriptions")
          .insert({ subscriber_id: currentId, subscribed_to_id: profileId });
        if (error) throw error;
      }
    },
    onSuccess: (_, { profileId }) => {
      qc.invalidateQueries({ queryKey: qk.profileSubscriptions(profileId) });
    },
  });
}
