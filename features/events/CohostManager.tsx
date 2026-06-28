import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import {
  Avatar,
  Badge,
  Icon,
  Input,
  Text,
} from "@/components/ui";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import {
  useSearchAccounts,
  useEventCohosts,
  useInviteCohost,
  useRemoveCohost,
  COHOST_ROLE_LABELS,
  type AccountResult,
  type CohostRole,
  type CohostStatus,
  type EventCohost,
} from "@/features/events/cohosts";

const ROLE_ORDER: CohostRole[] = ["cohost", "venue", "partner", "sponsor"];

const STATUS_META: Record<CohostStatus, { label: string; variant: "warning" | "eucalyptus" | "neutral" }> = {
  pending: { label: "Pending", variant: "warning" },
  accepted: { label: "Accepted", variant: "eucalyptus" },
  declined: { label: "Declined", variant: "neutral" },
};

interface CohostManagerProps {
  eventId: string;
  /** The hub hosting the event — excluded from search (can't co-host itself). */
  hostHubId: string;
}

/**
 * Host/editor surface to invite existing accounts (hubs or profiles) as
 * co-hosts/partners and manage their invitations. Display-only credit: accepting
 * lists them on the event but grants no edit access.
 */
export function CohostManager({ eventId, hostHubId }: CohostManagerProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AccountResult | null>(null);

  const { data: cohosts } = useEventCohosts(eventId);
  const { data: results, isFetching } = useSearchAccounts(query, { excludeHubId: hostHubId });
  const invite = useInviteCohost(eventId);
  const remove = useRemoveCohost(eventId);

  // Already-invited target ids so we don't offer duplicates.
  const invitedIds = useMemo(() => {
    const set = new Set<string>();
    (cohosts ?? []).forEach((c) => set.add(c.hubId ?? c.profileId ?? ""));
    return set;
  }, [cohosts]);

  const visibleResults = (results ?? []).filter((r) => !invitedIds.has(r.id));

  const handleInvite = (role: CohostRole) => {
    if (!selected) return;
    invite.mutate(
      { account: { kind: selected.kind, id: selected.id }, role },
      {
        onSuccess: () => {
          setSelected(null);
          setQuery("");
        },
      },
    );
  };

  return (
    <View className="gap-5">
      {/* Search */}
      <View className="gap-2">
        <Input
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setSelected(null);
          }}
          placeholder="Search communities, businesses, venues or people…"
          autoCapitalize="none"
          leftIcon={<Icon name="search" size={16} color={colors.inkMuted} />}
        />
        <Text variant="caption" tone="faint" className="text-[11px]">
          Co-hosts must already have a CulturePass account, and each must approve before they appear.
        </Text>

        {query.trim().length >= 2 ? (
          <View className="rounded-2xl border border-linen bg-card overflow-hidden">
            {isFetching ? (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color={colors.pink} />
              </View>
            ) : visibleResults.length === 0 ? (
              <Text variant="caption" tone="faint" className="p-4">
                No matching accounts found.
              </Text>
            ) : (
              visibleResults.map((r, i) => {
                const active = selected?.kind === r.kind && selected?.id === r.id;
                return (
                  <View key={`${r.kind}:${r.id}`}>
                    {i > 0 ? <View className="h-px bg-linen/60" /> : null}
                    <Pressable
                      onPress={() => setSelected(active ? null : r)}
                      className={cn("flex-row items-center gap-3 p-3 active:bg-sand/40", active && "bg-sand/50")}
                    >
                      <Avatar name={r.name} uri={r.avatarUrl} size={40} />
                      <View className="flex-1 min-w-0">
                        <Text variant="label" className="font-heading text-ink" numberOfLines={1}>
                          {r.name}
                        </Text>
                        <Text variant="caption" tone="faint" className="text-xs" numberOfLines={1}>
                          {r.subtitle}
                        </Text>
                      </View>
                      <Badge label={r.kind === "hub" ? "Page" : "Person"} variant="outline" />
                    </Pressable>

                    {/* Role chooser for the selected result */}
                    {active ? (
                      <View className="gap-2 px-3 pb-3 pt-1">
                        <Text variant="overline" tone="muted">
                          Invite as
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          {ROLE_ORDER.map((role) => (
                            <Pressable
                              key={role}
                              disabled={invite.isPending}
                              onPress={() => handleInvite(role)}
                              className="rounded-xl border border-ink bg-card px-3 py-2 active:bg-sand"
                            >
                              <Text className="text-xs font-heading text-ink">{COHOST_ROLE_LABELS[role]}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {invite.isError ? (
          <Text variant="caption" className="text-terracotta-600">
            {(invite.error as Error)?.message ?? "Couldn’t send that invite."}
          </Text>
        ) : null}
      </View>

      {/* Current co-hosts */}
      {cohosts && cohosts.length > 0 ? (
        <View className="gap-2">
          <Text variant="overline" tone="muted">
            Invited ({cohosts.length})
          </Text>
          <View className="rounded-2xl border border-linen bg-card overflow-hidden">
            {cohosts.map((c, i) => (
              <CohostRow
                key={c.id}
                cohost={c}
                first={i === 0}
                removing={remove.isPending}
                onRemove={() => remove.mutate({ id: c.id })}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function CohostRow({
  cohost,
  first,
  removing,
  onRemove,
}: {
  cohost: EventCohost;
  first: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  const status = STATUS_META[cohost.status];
  return (
    <View>
      {!first ? <View className="h-px bg-linen/60" /> : null}
      <View className="flex-row items-center gap-3 p-3">
        <Avatar name={cohost.name} uri={cohost.avatarUrl} size={40} />
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text variant="label" className="font-heading text-ink" numberOfLines={1}>
              {cohost.name}
            </Text>
            {cohost.indigenousLed ? <IndigenousLedBadge /> : null}
          </View>
          <Text variant="caption" tone="faint" className="text-xs" numberOfLines={1}>
            {COHOST_ROLE_LABELS[cohost.role]} · {cohost.subtitle}
          </Text>
        </View>
        <Badge label={status.label} variant={status.variant} dot />
        <Pressable
          onPress={onRemove}
          disabled={removing}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${cohost.name}`}
          className="h-8 w-8 items-center justify-center rounded-pill bg-sand active:bg-linen"
        >
          <Icon name="close" size={14} color={colors.inkMuted} />
        </Pressable>
      </View>
    </View>
  );
}
