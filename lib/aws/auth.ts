/**
 * Cognito auth adapter — the AWS counterpart to the `supabase.auth.*` calls.
 *
 * Kept backend-neutral: callers (features/auth, AuthProvider) get a minimal
 * `{ id, email }` user that matches what the app actually reads, instead of a
 * Supabase `User`. Every entry point configures Amplify first so a direct auth
 * call (no data client constructed yet) still works.
 */
import {
  fetchUserAttributes,
  getCurrentUser,
  signOut as amplifySignOut,
} from "aws-amplify/auth";

import { configureAmplify } from "./config";

export interface AwsAuthUser {
  id: string;
  email?: string;
}

/** Cognito `sub` of the signed-in user, or null when signed out. */
export async function getAwsCurrentUserId(): Promise<string | null> {
  configureAmplify();
  try {
    const { userId } = await getCurrentUser();
    return userId;
  } catch {
    // Amplify throws when there is no authenticated user — treat as signed out.
    return null;
  }
}

/** Signed-in user as the neutral `{ id, email }` shape, or null when signed out. */
export async function getAwsAuthUser(): Promise<AwsAuthUser | null> {
  configureAmplify();
  try {
    const { userId, signInDetails } = await getCurrentUser();
    let email = signInDetails?.loginId;
    if (!email) {
      const attrs = await fetchUserAttributes().catch(() => undefined);
      email = attrs?.email;
    }
    return { id: userId, email };
  } catch {
    return null;
  }
}

export async function awsSignOut(): Promise<void> {
  configureAmplify();
  await amplifySignOut();
}
