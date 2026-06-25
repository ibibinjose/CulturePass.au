import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/**
 * Update the signed-in user's own profile (RLS restricts to user_id = auth.uid()).
 * Used to turn a normal account into a Professional Public Account.
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
      qc.invalidateQueries({ queryKey: ["profile", data.id] });
    },
  });
}
