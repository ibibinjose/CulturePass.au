// =============================================================================
// rewards-join handler — create (or reactivate) a CulturePass Plus membership.
// =============================================================================
// AppSync custom-mutation Lambda. All membership fields are derived from the
// caller's Cognito identity server-side: a direct client create would let a
// user backdate `joinedAt` (instant Platinum), pick a high `tier`, or create a
// row under someone else's `userId`. Idempotent — re-joining after cancelling
// reactivates the row and keeps the original joinedAt.
//
// Excluded from `amplify/tsconfig.json` typecheck (imports the build-time
// `$amplify/env/*` module); type-checked/bundled by `ampx`.
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/rewards-join";

import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>({ authMode: "iam" });

export const handler: Schema["rewardsJoin"]["functionHandler"] = async (event) => {
  const sub = event.identity && "sub" in event.identity ? event.identity.sub : null;
  if (!sub) {
    return { userId: null, joinedAt: null, tier: null, status: null, error: "Sign in to join CulturePass Plus." };
  }

  const { data: existing } = await client.models.Membership.get({ userId: sub });
  if (existing) {
    if (existing.status !== "active") {
      const { data: updated, errors } = await client.models.Membership.update({
        userId: sub,
        status: "active",
      });
      if (errors || !updated) {
        console.error("[rewards-join] reactivate failed:", JSON.stringify(errors));
        return { userId: null, joinedAt: null, tier: null, status: null, error: "Couldn't rejoin CulturePass Plus." };
      }
      return {
        userId: updated.userId,
        joinedAt: updated.joinedAt,
        tier: updated.tier ?? "vip",
        status: updated.status ?? "active",
        error: null,
      };
    }
    return {
      userId: existing.userId,
      joinedAt: existing.joinedAt,
      tier: existing.tier ?? "vip",
      status: existing.status ?? "active",
      error: null,
    };
  }

  const { data: created, errors } = await client.models.Membership.create({
    userId: sub,
    joinedAt: new Date().toISOString(),
    tier: "vip",
    status: "active",
    // Plain Cognito sub — the owner check accepts `sub`, `username`, or
    // `sub::username`, so the member can read their row via `allow.owner()`.
    owner: sub,
  });
  if (errors || !created) {
    console.error("[rewards-join] create failed:", JSON.stringify(errors));
    return { userId: null, joinedAt: null, tier: null, status: null, error: "Couldn't join CulturePass Plus." };
  }
  return {
    userId: created.userId,
    joinedAt: created.joinedAt,
    tier: created.tier ?? "vip",
    status: created.status ?? "active",
    error: null,
  };
};
