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
    email: true,
  },
  // "admin" replaces the Supabase `profiles.is_admin` / SQL admin role; the data
  // schema grants this group elevated access via `allow.group("admin")`.
  groups: ["admin"],
});
