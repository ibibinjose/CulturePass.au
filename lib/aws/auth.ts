/**
 * Cognito auth adapter (replaces previous supabase.auth usage).
 *
 * Kept backend-neutral: callers (features/auth, AuthProvider) get a minimal
 * `{ id, email }` user that matches what the app actually reads, instead of a
 * Supabase `User`. Every entry point configures Amplify first so a direct auth
 * call (no data client constructed yet) still works.
 */
import {
  fetchAuthSession,
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

/**
 * Identity-pool identity id of the current session, or null.
 *
 * NOT the Cognito user-pool `sub`: S3 storage paths (`media/{entity_id}/*`)
 * bind `{entity_id}` to the **identity id**, so uploads keyed by `sub` are
 * denied by the bucket policy. Always build storage paths from this.
 */
export async function getAwsIdentityId(): Promise<string | null> {
  configureAmplify();
  try {
    const { identityId } = await fetchAuthSession();
    return identityId ?? null;
  } catch {
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

/**
 * Human-friendly messages for Cognito auth errors.
 * Always keyed by `error.name` — never surface raw `error.message`.
 */
export const COGNITO_MESSAGES: Record<string, string> = {
  NotAuthorizedException: "That email or password isn't right.",
  UserNotConfirmedException: "Please confirm your email first — check your inbox.",
  UsernameExistsException: "An account with that email already exists.",
  CodeMismatchException: "That code isn't right — please check and try again.",
  ExpiredCodeException: "That code has expired — please request a new one.",
  LimitExceededException: "Too many attempts — please wait a few minutes and try again.",
  InvalidPasswordException: "Password does not meet the requirements.",
  UserAlreadyAuthenticatedException: "You're already signed in.",
  UserNotFoundException: "No account found with that email.",
  AliasExistsException: "An account with that email already exists.",
  InvalidParameterException: "Invalid input. Please check the details and try again.",
};

export function authMessage(err: unknown): string {
  if (err instanceof Error) {
    const mapped = COGNITO_MESSAGES[err.name];
    if (mapped) return mapped;
    // Never leak raw Cognito messages; log name in dev only.
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[authMessage] Unmapped Cognito error name:", err.name);
    }
  }
  return "Something went wrong. Please try again.";
}
