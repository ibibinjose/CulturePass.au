import { defineFunction } from "@aws-amplify/backend";

/**
 * rewards-tier-recompute — nightly CulturePass Plus tier recalculation.
 * Invoked on a schedule via an EventBridge rule (see amplify/backend.ts), not
 * from GraphQL or Cognito. Iterates active Memberships, upgrades `tier` when
 * `joinedAt` crosses a tenure threshold, and writes a `tier_upgrade`
 * Notification. Needs more headroom than the 20s query handlers since it
 * paginates every active membership in one run.
 */
export const rewardsTierRecompute = defineFunction({
  name: "rewards-tier-recompute",
  entry: "./handler.ts",
  timeoutSeconds: 60,
});
