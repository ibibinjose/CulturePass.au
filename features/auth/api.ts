import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmResetPassword as awsConfirmResetPassword,
  confirmSignUp as awsConfirmSignUp,
  resendSignUpCode as awsResendSignUpCode,
  resetPassword as awsResetPassword,
  signIn as awsSignIn,
  signUp as awsSignUp,
  updatePassword as awsUpdatePassword,
} from "aws-amplify/auth";

import { getAwsCurrentUserId, getAwsAuthUser, awsSignOut } from "@/lib/aws/auth";
import { getAwsDataClient } from "@/lib/aws/data";
import { findFirst } from "@/lib/aws/list";
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
  const profile = await findFirst((nextToken) =>
    client.models.Profile.list({ filter: { userId: { eq: userId } }, nextToken }),
  );
  return profile?.id ?? null;
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
      // Verification (CODE style) requires confirm via code (or link in email) before
      // sign-in succeeds. useConfirmSignUp + the sign-up/sign-in screens handle the flow.
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
    mutationFn: async ({
      email,
      code,
      password,
    }: {
      email: string;
      code: string;
      password: UpdatePasswordInput;
    }) => {
      await awsConfirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: password.password,
      });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({
      oldPassword,
      newPassword,
    }: {
      oldPassword: string;
      newPassword: string;
    }) => {
      await awsUpdatePassword({
        oldPassword,
        newPassword,
      });
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

/** Resend the sign-up verification email (code or link depending on pool config). */
export function useResendVerification() {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      await awsResendSignUpCode({ username: email });
    },
  });
}

/** Confirm sign-up using the code from the verification email. */
export function useConfirmSignUp() {
  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      await awsConfirmSignUp({ username: email, confirmationCode: code });
      return { email };
    },
  });
}
