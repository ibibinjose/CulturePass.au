// =============================================================================
// post-confirmation handler — create a Profile for a newly confirmed user.
// =============================================================================
// AWS equivalent of the Supabase `handle_new_user` trigger. Idempotent: skips
// if a Profile already exists for this Cognito sub. Writes with the function's
// IAM role (granted via allow.resource in amplify/data/resource.ts).
//
// Excluded from amplify tsconfig typecheck (imports $amplify/env/*); typed/bundled by ampx.
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/post-confirmation";
import type { PostConfirmationTriggerHandler } from "aws-lambda";

import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>({ authMode: "iam" });

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const attrs = event.request.userAttributes ?? {};
  const userId = attrs.sub;
  if (!userId) return event;

  // Idempotent — don't double-create on re-confirmation.
  const { data: existing } = await client.models.Profile.list({
    filter: { userId: { eq: userId } },
    limit: 1,
  });
  if (existing && existing.length > 0) return event;

  const fullName = attrs.name || (attrs.email ? attrs.email.split("@")[0] : "");
  await client.models.Profile.create({
    userId,
    fullName,
    // IAM creates don't auto-populate the owner claim, and without it the user
    // can never pass the `allow.owner()` rule to edit their own profile. Plain
    // sub is accepted by the owner check (`sub` / `username` / `sub::username`).
    owner: userId,
  });

  return event;
};
