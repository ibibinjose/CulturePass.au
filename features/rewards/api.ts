import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { type AwsItem, getAwsDataClient } from "@/lib/aws/data";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import type { RewardsTier } from "@/lib/constants";

/**
 * CulturePass Plus membership row. No legacy Supabase table to mirror (this is
 * a brand-new model), so the row type is defined here rather than in
 * lib/supabase/database.types.ts.
 */
export interface MembershipRow {
  user_id: string;
  joined_at: string;
  tier: RewardsTier;
  status: "active" | "cancelled";
  last_tier_check_at: string | null;
}

function mapMembership(m: AwsItem<"Membership">): MembershipRow {
  return {
    user_id: m.userId,
    joined_at: m.joinedAt,
    tier: (m.tier ?? "vip") as RewardsTier,
    status: (m.status ?? "active") as MembershipRow["status"],
    last_tier_check_at: m.lastTierCheckAt ?? null,
  };
}

/** The signed-in user's CulturePass Plus membership, or null if not joined. */
export function useMyMembership() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.myMembership,
    enabled: isAuthenticated && !!user,
    queryFn: async (): Promise<MembershipRow | null> => {
      const client = getAwsDataClient();
      const { data } = await client.models.Membership.get({ userId: user!.id });
      return data ? mapMembership(data) : null;
    },
  });
}

/**
 * Join CulturePass Plus via the `rewardsJoin` mutation (Lambda). The server
 * derives userId/joinedAt/tier from the caller's identity — the Membership
 * model is owner read-only, so a direct create would be rejected.
 */
export function useJoinRewards() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (): Promise<MembershipRow> => {
      if (!user) throw new Error("Sign in to join CulturePass Plus.");
      const client = getAwsDataClient();
      const { data, errors } = await client.mutations.rewardsJoin();
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
      if (data?.error) throw new Error(data.error);
      if (!data?.userId || !data.joinedAt) throw new Error("Couldn't join CulturePass Plus.");
      return {
        user_id: data.userId,
        joined_at: data.joinedAt,
        tier: (data.tier ?? "vip") as RewardsTier,
        status: (data.status ?? "active") as MembershipRow["status"],
        last_tier_check_at: null,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myMembership });
    },
  });
}
