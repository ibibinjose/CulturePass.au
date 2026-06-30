import { defineAuth } from "@aws-amplify/backend";

/**
 * Cognito auth for CulturePass.
 *
 * Mirrors the current Supabase email/password auth so the migration is a
 * like-for-like swap at the call sites. Add social providers, MFA, or custom
 * attributes here as the migration progresses.
 */
export const auth = defineAuth({
  loginWith: {
    // LINK (not CODE) verification keeps sign-up like-for-like with Supabase:
    // the user clicks a confirmation link and Cognito auto-confirms, so the
    // existing "we've sent a confirmation link" sign-up screen works unchanged.
    // (Password *reset* is code-only in Cognito — that flow still needs a code
    // field; see features/auth/api.ts useUpdatePassword.)
    email: {
      verificationEmailStyle: "LINK",
      verificationEmailSubject: "Confirm your CulturePass account",
      verificationEmailBody: (createLink) =>
        `Welcome to CulturePass Australia. Confirm your account: ${createLink("Confirm my account")}`,
    },
  },
  // "admin" replaces the Supabase `profiles.is_admin` / SQL admin role; the data
  // schema grants this group elevated access via `allow.group("admin")`.
  groups: ["admin"],
});
