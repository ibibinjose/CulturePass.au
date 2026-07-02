// =============================================================================
// rewards-tier-recompute handler — nightly CulturePass Plus tier recalculation.
// Invoked on a schedule (see the EventBridge rule in amplify/backend.ts), not
// from GraphQL, so there's no Schema["x"]["functionHandler"] typing here.
//
// Excluded from amplify tsconfig typecheck (imports $amplify/env/*); typed/bundled by ampx.
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/rewards-tier-recompute";

import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>({ authMode: "iam" });

type Tier = "vip" | "bronze" | "silver" | "gold" | "platinum";

// Duplicated from lib/constants.ts — amplify/functions/** is excluded from the
// app tsconfig (CLAUDE.md gotcha #7) and only uses relative imports, so this
// can't be shared directly. Keep both in sync if tier thresholds change.
const TIER_ORDER: Tier[] = ["vip", "bronze", "silver", "gold", "platinum"];
const TIER_MIN_YEARS: Record<Tier, number> = {
  vip: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 5,
};
const TIER_LABELS: Record<Tier, string> = {
  vip: "VIP",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

/** Calendar-date (UTC) year difference — avoids day-count/365 leap-year drift. */
function yearsElapsed(joinedAt: string, now: Date): number {
  const joined = new Date(joinedAt);
  let years = now.getUTCFullYear() - joined.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - joined.getUTCMonth();
  const dayDiff = now.getUTCDate() - joined.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
  return years;
}

function tierForYears(years: number): Tier {
  let result: Tier = "vip";
  for (const tier of TIER_ORDER) {
    if (years >= TIER_MIN_YEARS[tier]) result = tier;
  }
  return result;
}

export const handler = async () => {
  const now = new Date();
  const nowIso = now.toISOString();

  let nextToken: string | undefined;
  let checked = 0;
  let upgraded = 0;

  do {
    const { data: page, nextToken: token } = await client.models.Membership.list({
      filter: { status: { eq: "active" } },
      nextToken,
    });
    nextToken = token ?? undefined;

    for (const membership of page) {
      checked += 1;
      // Trust floor: tenure can't start before the row existed. `createdAt` is
      // server-set, so a backdated `joinedAt` (e.g. written before joins moved
      // into the rewards-join Lambda) can never fake extra years.
      const joinedAt =
        membership.createdAt && membership.createdAt > membership.joinedAt
          ? membership.createdAt
          : membership.joinedAt;
      const targetTier = tierForYears(yearsElapsed(joinedAt, now));
      const currentIndex = membership.tier ? TIER_ORDER.indexOf(membership.tier as Tier) : 0;
      const targetIndex = TIER_ORDER.indexOf(targetTier);

      if (targetIndex !== currentIndex) {
        // `!==` (not `>`) so a tier that was ever set too high gets corrected
        // back down to what tenure actually earns.
        await client.models.Membership.update({
          userId: membership.userId,
          tier: targetTier,
          lastTierCheckAt: nowIso,
        });
        if (targetIndex > currentIndex) {
          await client.models.Notification.create({
            userId: membership.userId,
            type: "tier_upgrade",
            title: `You've reached ${TIER_LABELS[targetTier]}!`,
            body: `Your CulturePass Plus tier is now ${TIER_LABELS[targetTier]}.`,
            data: JSON.stringify({ tier: targetTier }),
          });
          upgraded += 1;
        }
      } else {
        await client.models.Membership.update({
          userId: membership.userId,
          lastTierCheckAt: nowIso,
        });
      }
    }
  } while (nextToken);

  return { checked, upgraded };
};
