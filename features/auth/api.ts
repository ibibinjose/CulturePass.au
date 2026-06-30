import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import {
  resetPassword as awsResetPassword,
  signIn as awsSignIn,
  signUp as awsSignUp,
} from "aws-amplify/auth";

import { supabase } from "@/lib/supabase/client";
import { isAwsBackend } from "@/lib/backend";
import { getAwsCurrentUserId, getAwsAuthUser, awsSignOut } from "@/lib/aws/auth";
import { getAwsDataClient } from "@/lib/aws/data";
import { qk } from "@/lib/query";
import type {
  SignInInput,
  SignUpInput,
  ResetRequestInput,
  UpdatePasswordInput,
} from "@/lib/validation/auth";

/** Resolve the current user's profile id (null when signed out). */
export async function getCurrentProfileId(): Promise<string | null> {
  if (isAwsBackend) {
    const userId = await getAwsCurrentUserId();
    if (!userId) return null;
    const client = getAwsDataClient();
    const { data } = await client.models.Profile.list({
      filter: { userId: { eq: userId } },
      limit: 1,
    });
    return data[0]?.id ?? null;
  }

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
      if (isAwsBackend) return getAwsAuthUser();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      return session ? { id: session.user.id, email: session.user.email } : null;
    },
    staleTime: 30_000,
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: SignInInput) => {
      if (isAwsBackend) {
        return awsSignIn({ username: email, password });
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: async ({ full_name, email, password }: SignUpInput) => {
      if (isAwsBackend) {
        const res = await awsSignUp({
          username: email,
          password,
          options: { userAttributes: { email, name: full_name } },
        });
        // LINK-style verification (see amplify/auth/resource.ts): the user must
        // click the emailed link before signing in — same contract Supabase had.
        return { needsConfirmation: !res.isSignUpComplete, data: res };
      }
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
      if (isAwsBackend) {
        // Cognito emails a confirmation *code* (no link option for reset); the
        // completion screen must collect that code — see useUpdatePassword.
        await awsResetPassword({ username: email });
        return;
      }
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
      if (isAwsBackend) {
        // Supabase completes reset on the recovery session with just the new
        // password. Cognito's confirmResetPassword needs { username, code,
        // newPassword }, so the update-password screen needs an email + code
        // field before this branch can be wired. Tracked as migration follow-up.
        throw new Error(
          "Password reset on AWS requires the emailed confirmation code — the update-password screen needs a code field first.",
        );
      }
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
      if (isAwsBackend) {
        await awsSignOut();
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => queryClient.clear(),
  });
}
