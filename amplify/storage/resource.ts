import { defineStorage } from "@aws-amplify/backend";

/**
 * Media storage (replaces the Supabase public `media` bucket).
 *
 * Matches the current model: public read for everyone, but writes/deletes are
 * scoped to the owner's own prefix. In Supabase the path had to start with the
 * user's id (`<auth.uid()>/…`); here `entity('identity')` binds the
 * `{entity_id}` path token to the signed-in user's identity id.
 */
export const storage = defineStorage({
  name: "culturepassMedia",
  access: (allow) => ({
    "media/{entity_id}/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read"]),
      allow.entity("identity").to(["read", "write", "delete"]),
    ],
  }),
});
