import { defineFunction } from "@aws-amplify/backend";

/**
 * post-confirmation — Cognito trigger that creates the user's Profile right
 * after sign-up confirmation. This replaces the Supabase Postgres trigger that
 * inserted a `profiles` row on `auth.users` insert (without it, new users have
 * no Profile and `getCurrentProfileId()` returns null, breaking create/buy).
 *
 * `resourceGroupName: "auth"` groups this with the auth stack to avoid the
 * circular dependency that otherwise arises from an auth trigger needing data
 * access (the documented Amplify Gen 2 pattern for "create a record on sign-up").
 */
export const postConfirmation = defineFunction({
  name: "post-confirmation",
  entry: "./handler.ts",
  resourceGroupName: "auth",
});
