import { defineAuth } from "@aws-amplify/backend";

import { postConfirmation } from "../functions/post-confirmation/resource";

/**
 * Cognito auth for CulturePass.
 *
 * Email/password + verification flow (ported from previous implementation) so the
 * like-for-like swap at the call sites. Add social providers, MFA, or custom
 * attributes here as the migration progresses.
 */
export const auth = defineAuth({
  loginWith: {
    // CODE style supports entering a verification code directly in-app (shown
    // during sign-up and immediately prompted on sign-in for unverified users).
    // Users may also verify via any links included in the email. Reset password
    // already uses codes. See features/auth/api.ts (useConfirmSignUp, useResendVerification)
    // and the sign-in / sign-up screens.
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Confirm your CulturePass account",
      verificationEmailBody: (createCode) =>
        `Welcome to CulturePass Australia. Your verification code is ${createCode()}. Enter it in the app (or use any link in this email) to confirm your account.`,
    },
  },
  // "admin" group for elevated access (replaces previous is_admin flag); the data
  // schema grants this group elevated access via `allow.group("admin")`.
  groups: ["admin"],
  // Create the user's Profile on sign-up (replacement for previous trigger)
  // `handle_new_user` Postgres trigger).
  triggers: {
    postConfirmation,
  },
});
