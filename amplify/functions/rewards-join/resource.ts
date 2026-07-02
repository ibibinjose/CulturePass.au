import { defineFunction } from "@aws-amplify/backend";

/**
 * rewards-join — join CulturePass Plus via the `rewardsJoin` AppSync mutation.
 * Runs with IAM data access so `userId`, `joinedAt` and `tier` come from the
 * caller's Cognito identity, never from client input (the Membership model is
 * owner read-only — see amplify/data/resource.ts).
 */
export const rewardsJoin = defineFunction({
  name: "rewards-join",
  entry: "./handler.ts",
});
