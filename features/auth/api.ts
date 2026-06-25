import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";

import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import type {
  SignInInput,
  SignUpInput,
  ResetRequestInput,
  UpdatePasswordInput,
} from "@/lib/validation/auth";

/** Resolve the current user's profile id (null when signed out). */
export async function getCurrentProfileId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.id ?? null;
}

/** Lightweight session hook for gating create/publish actions. */
export function useSession() {
  return useQuery({
    queryKey: qk.session,
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30_000,
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: SignInInput) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: async ({ full_name, email, password }: SignUpInput) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name },
          emailRedirectTo: Linking.createURL("/"),
        },
      });
      if (error) throw error;
      // When email confirmation is enabled, session is null until confirmed.
      return { needsConfirmation: !data.session, data };
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ email }: ResetRequestInput) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL("/update-password"),
      });
      if (error) throw error;
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async ({ password }: UpdatePasswordInput) => {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return data;
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => queryClient.clear(),
  });
}
