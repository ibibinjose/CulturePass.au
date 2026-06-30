import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  resetPassword as awsResetPassword,
  signIn as awsSignIn,
  signUp as awsSignUp,
} from "aws-amplify/auth";

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
  const userId = await getAwsCurrentUserId();
  if (!userId) return null;
  const client = getAwsDataClient();
  const { data } = await client.models.Profile.list({
    filter: { userId: { eq: userId } },
    limit: 1,
  });
  return data[0]?.id ?? null;
}

/** Lightweight session hook for gating create/publish actions. */
export function useSession() {
  return useQuery({
    queryKey: qk.session,
    queryFn: () => getAwsAuthUser(),
    staleTime: 30_000,
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: SignInInput) => {
      return awsSignIn({ username: email, password });
    },
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: async ({ full_name, email, password }: SignUpInput) => {
      const res = await awsSignUp({
        username: email,
        password,
        options: { userAttributes: { email, name: full_name } },
      });
      // LINK-style verification (see amplify/auth/resource.ts): the user must
      // click the emailed link before signing in — same contract Supabase had.
      return { needsConfirmation: !res.isSignUpComplete, data: res };
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ email }: ResetRequestInput) => {
      // Cognito emails a confirmation *code* (no link option for reset); the
      // completion screen must collect that code — see useUpdatePassword.
      await awsResetPassword({ username: email });
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async ({ password }: UpdatePasswordInput) => {
      // Supabase completes reset on the recovery session with just the new
      // password. Cognito's confirmResetPassword needs { username, code,
      // newPassword }, so the update-password screen needs an email + code
      // field before this branch can be wired. Tracked as migration follow-up.
      throw new Error(
        "Password reset on AWS requires the emailed confirmation code — the update-password screen needs a code field first.",
      );
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await awsSignOut();
    },
    onSuccess: () => queryClient.clear(),
  });
}
