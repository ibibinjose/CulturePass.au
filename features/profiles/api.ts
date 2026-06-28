import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import { getCurrentProfileId } from "@/features/auth/api";
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

/** The signed-in user's own profile (null when signed out). */
export function useMyProfile() {
  return useQuery({
    queryKey: qk.myProfile,
    queryFn: async (): Promise<ProfileWithHubs | null> => {
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
    mutationFn: async (patch: ProfileUpdate) => {
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
