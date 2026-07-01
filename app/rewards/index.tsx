import { View } from "react-native";

import { Screen, Text, Button, BackButton, Card, Badge, Skeleton, Icon } from "@/components/ui";
import { colors } from "@/lib/theme";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useMyMembership, useJoinRewards, type MembershipRow } from "@/features/rewards/api";
import { REWARDS_TIERS, REWARDS_TIER_LABELS, REWARDS_TIER_MIN_YEARS, type RewardsTier } from "@/lib/constants";

export default function RewardsScreen() {
  return (
    <RequireAuth>
      <Rewards />
    </RequireAuth>
  );
}

const TIER_BADGE_VARIANT: Record<RewardsTier, "neutral" | "terracotta" | "outline" | "ochre" | "ink"> = {
  vip: "neutral",
  bronze: "terracotta",
  silver: "outline",
  gold: "ochre",
  platinum: "ink",
};

/** Calendar-date (UTC) year difference — matches the recompute Lambda's math. */
function yearsSince(joinedAt: string): number {
  const joined = new Date(joinedAt);
  const now = new Date();
  let years = now.getUTCFullYear() - joined.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - joined.getUTCMonth();
  const dayDiff = now.getUTCDate() - joined.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
  return Math.max(years, 0);
}

function nextTier(tier: RewardsTier): RewardsTier | null {
  const index = REWARDS_TIERS.indexOf(tier);
  return index < REWARDS_TIERS.length - 1 ? (REWARDS_TIERS[index + 1] ?? null) : null;
}

function Rewards() {
  const { data: membership, isLoading } = useMyMembership();
  const join = useJoinRewards();

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton className="mb-5" />

      <Text variant="overline" tone="pink">
        Membership
      </Text>
      <Text variant="title" className="mt-2">
        CulturePass Plus
      </Text>

      {isLoading ? (
        <Card className="mt-8 gap-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </Card>
      ) : membership ? (
        <MembershipCard membership={membership} />
      ) : (
        <Card className="mt-8 items-start gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sand">
            <Icon name="star" size={22} color={colors.inkMuted} />
          </View>
          <Text variant="subheading">Join CulturePass Plus</Text>
          <Text variant="caption" tone="muted">
            Members unlock tenure-based tiers — from VIP to Platinum — with perks that grow the
            longer you’re part of CulturePass.
          </Text>
          <Button
            label="Join CulturePass Plus"
            className="mt-2"
            loading={join.isPending}
            onPress={() => join.mutate()}
          />
          {join.isError ? (
            <Text variant="caption" className="text-terracotta-600">
              Couldn’t join right now. Please try again.
            </Text>
          ) : null}
        </Card>
      )}
    </Screen>
  );
}

function MembershipCard({ membership }: { membership: MembershipRow }) {
  const years = yearsSince(membership.joined_at);
  const upcoming = nextTier(membership.tier);
  const yearsToNext = upcoming ? REWARDS_TIER_MIN_YEARS[upcoming] - years : 0;
  const progress = upcoming ? Math.min(1, years / REWARDS_TIER_MIN_YEARS[upcoming]) : 1;

  return (
    <Card className="mt-8 gap-4">
      <View className="gap-1">
        <Badge label={REWARDS_TIER_LABELS[membership.tier]} variant={TIER_BADGE_VARIANT[membership.tier]} />
        <Text variant="caption" tone="faint">
          Member since{" "}
          {new Date(membership.joined_at).toLocaleDateString("en-AU", {
            year: "numeric",
            month: "long",
          })}
        </Text>
      </View>

      {upcoming ? (
        <View className="gap-2">
          <View className="h-2 w-full overflow-hidden rounded-pill bg-sand">
            <View
              className="h-full rounded-pill bg-ochre-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
          <Text variant="caption" tone="muted">
            {yearsToNext > 0
              ? `${yearsToNext} more year${yearsToNext === 1 ? "" : "s"} to ${REWARDS_TIER_LABELS[upcoming]}`
              : `You're eligible for ${REWARDS_TIER_LABELS[upcoming]} — it unlocks at the next tier check`}
          </Text>
        </View>
      ) : (
        <Text variant="caption" tone="muted">
          You’ve reached the top tier — thanks for being with us this long.
        </Text>
      )}
    </Card>
  );
}
