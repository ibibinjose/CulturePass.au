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
  // userAttributes / groups (e.g. an "admin" group to replace the SQL admin
  // role) can be declared here once the data layer is ported.
});
