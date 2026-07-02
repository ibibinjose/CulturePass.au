// =============================================================================
// post-confirmation handler — create a Profile for a newly confirmed user.
// =============================================================================
// Creates a Profile for newly confirmed Cognito users. Idempotent: skips
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
import { findFirst } from "../shared/list";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>({ authMode: "iam" });

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const attrs = event.request.userAttributes ?? {};
  const userId = attrs.sub;
  if (!userId) return event;

  // Idempotent — don't double-create on re-confirmation.
  const existing = await findFirst((nextToken) =>
    client.models.Profile.list({ filter: { userId: { eq: userId } }, nextToken }),
  );
  if (existing) return event;

  const fullName = attrs.name || (attrs.email ? attrs.email.split("@")[0] : "");
  // Generate initial username handle (users can change later). Real name policy
  // applies: usernames should reflect real identity where possible. Celebrities
  // and businesses can request claims via support/admin.
  const baseHandle = (attrs.email ? attrs.email.split("@")[0] : fullName || userId)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20) || `user${userId.slice(0, 6)}`;
  await client.models.Profile.create({
    userId,
    fullName,
    username: baseHandle,
    // IAM creates don't auto-populate the owner claim, and without it the user
    // can never pass the `allow.owner()` rule to edit their own profile. Plain
    // sub is accepted by the owner check (`sub` / `username` / `sub::username`).
    owner: userId,
  });

  return event;
};
