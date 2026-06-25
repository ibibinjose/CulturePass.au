import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/** The signed-in user's own profile (null when signed out). */
export function useMyProfile() {
  return useQuery({
    queryKey: qk.myProfile,
    queryFn: async (): Promise<Profile | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

/** A profile by id — used to render a Public (Professional) Profile page. */
export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: qk.profile(id ?? "none"),
    enabled: !!id,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
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
