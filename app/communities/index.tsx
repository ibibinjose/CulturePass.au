import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { Screen, Text, Input, Button, Card, Icon, Footer } from "@/components/ui";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { useHubs, useHubStateCounts } from "@/features/hubs/api";
import { HUB_TYPES, HUB_TYPE_LABELS, AUSTRALIAN_STATES, type HubType, type StateCode } from "@/lib/constants";
import { colors } from "@/lib/theme";
import { getHubImage } from "@/lib/hubImages";
import { cn } from "@/lib/utils/cn";

type SortKey = "newest" | "az";

export default function CommunitiesScreen() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<StateCode | "">("");
  const [selectedTypes, setSelectedTypes] = useState<HubType[]>([]);
  const [onlyIndigenousLed, setOnlyIndigenousLed] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");

  const query = searchQuery.trim();

  const { data: stateCounts } = useHubStateCounts();
  const totalAcrossStates = useMemo(
    () => Object.values(stateCounts ?? {}).reduce((sum, n) => sum + n, 0),
    [stateCounts],
  );

  // Server filters: state / search / indigenous are pushed down. Type is sent
  // server-side only when exactly one is chosen; multi-select is refined on the
  // client (mirrors the Discover screen's hub-type handling).
  const { data: hubs, isLoading, isError, refetch, isRefetching } = useHubs({
    state: selectedState || undefined,
    type: selectedTypes.length === 1 ? selectedTypes[0] : undefined,
    indigenousLed: onlyIndigenousLed || undefined,
    search: query || undefined,
  });

  const visibleHubs = useMemo(() => {
    let list = hubs ?? [];
    if (selectedTypes.length > 1) {
      list = list.filter((h) => selectedTypes.includes(h.type as HubType));
    }
    if (sort === "az") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [hubs, selectedTypes, sort]);

  const count = visibleHubs.length;
  const activeFilterCount =
    (query ? 1 : 0) + (selectedState ? 1 : 0) + selectedTypes.length + (onlyIndigenousLed ? 1 : 0);

  const toggleType = (type: HubType) =>
    setSelectedTypes((cur) => (cur.includes(type) ? cur.filter((t) => t !== type) : [...cur, type]));

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedState("");
    setSelectedTypes([]);
    setOnlyIndigenousLed(false);
  };

  return (
    <Screen contentClassName="pt-4 md:pt-6" maxWidth="content">
      {/* Editorial header */}
      <View className="gap-2 border-b border-linen pb-5">
        <Text variant="overline" tone="pink">
          Directory
        </Text>
        <View className="flex-row items-end justify-between gap-3">
          <Text className="font-display text-3xl md:text-5xl text-ink tracking-tight">
            Communities
          </Text>
          {totalAcrossStates > 0 ? (
            <View className="items-end pb-1.5">
              <Text className="font-display text-2xl text-pink-500 leading-none">{totalAcrossStates}</Text>
              <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted mt-1">
                Active hubs
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="font-sans text-sm text-ink-muted leading-6 max-w-xl">
          Discover local creative networks, galleries, artisan workshops, wellness spaces and
          community hubs — across every state, council and First Nations community.
        </Text>
      </View>

      {/* Unified search bar (Luma-style) */}
      <View className="mt-5 flex-row items-center border border-linen bg-card rounded-2xl md:rounded-full px-4 h-12 gap-2 shadow-subtle">
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search communities by name…"
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
          leftIcon={<Icon name="search" size={16} color={colors.inkFaint} />}
          containerClassName="border-0 bg-transparent h-11 px-0 flex-1"
          className="text-sm font-sans"
        />
        {query ? (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={10} className="h-7 w-7 items-center justify-center rounded-full active:bg-sand">
            <Icon name="close" size={15} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* State jurisdiction — edge-to-edge scroller */}
      <View className="mt-5 gap-2">
        <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
          State jurisdiction
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-gutter"
          className="-mx-gutter px-gutter"
        >
          <StatePill
            label="All Australia"
            count={totalAcrossStates}
            active={selectedState === ""}
            onPress={() => setSelectedState("")}
          />
          {AUSTRALIAN_STATES.map((st) => (
            <StatePill
              key={st.code}
              label={st.code}
              count={stateCounts?.[st.code]}
              active={selectedState === st.code}
              onPress={() => setSelectedState(st.code as StateCode)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Community type — edge-to-edge scroller */}
      <View className="mt-4 gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
            Community type
          </Text>
          <FirstNationsToggle active={onlyIndigenousLed} onPress={() => setOnlyIndigenousLed((v) => !v)} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-gutter"
          className="-mx-gutter px-gutter"
        >
          {HUB_TYPES.map((type) => {
            const on = selectedTypes.includes(type);
            return (
              <Pressable
                key={type}
                onPress={() => toggleType(type)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={cn(
                  "h-9 flex-row items-center rounded-full border px-3.5 active:opacity-80",
                  on ? "border-ink bg-ink" : "border-linen bg-card",
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-heading",
                    on ? "text-paper font-semibold" : "text-ink-muted",
                  )}
                >
                  {HUB_TYPE_LABELS[type]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Results toolbar */}
      <View className="mt-6 mb-4 flex-row items-center justify-between border-b border-linen pb-3">
        <View className="flex-row items-baseline gap-2">
          <Text className="font-display text-lg text-ink tracking-tight">
            {isLoading ? "Searching…" : count === 1 ? "1 community" : `${count} communities`}
          </Text>
          {activeFilterCount > 0 ? (
            <Pressable onPress={resetFilters} hitSlop={6} className="flex-row items-center gap-1 active:opacity-70">
              <Icon name="close" size={12} color={colors.pink} />
              <Text className="text-xs font-heading text-pink-600">Clear {activeFilterCount}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Sort toggle */}
        <View className="flex-row items-center rounded-full border border-linen bg-card p-0.5">
          <SortChip label="Newest" active={sort === "newest"} onPress={() => setSort("newest")} />
          <SortChip label="A–Z" active={sort === "az"} onPress={() => setSort("az")} />
        </View>
      </View>

      {/* Grid */}
      {isLoading ? (
        <View className="flex-row flex-wrap gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : isError ? (
        <Card className="items-center gap-3 p-8 border border-danger/25 bg-terracotta-50/50">
          <Icon name="info" size={28} color={colors.danger} />
          <Text variant="subheading" className="font-display tracking-tight text-center">
            Couldn’t load the directory
          </Text>
          <Text variant="caption" tone="muted" className="text-center max-w-sm">
            Something went wrong reaching the community directory. Check your connection and try again.
          </Text>
          <Button
            label={isRefetching ? "Retrying…" : "Try again"}
            variant="secondary"
            size="sm"
            className="mt-1"
            disabled={isRefetching}
            onPress={() => refetch()}
          />
        </Card>
      ) : count > 0 ? (
        <View className="flex-row flex-wrap gap-4">
          {visibleHubs.map((hub) => (
            <CommunityCard key={hub.id} hub={hub} onPress={() => router.push(`/hub/${hub.slug}`)} />
          ))}
        </View>
      ) : (
        <Card className="items-center gap-3 p-10 border border-dashed border-linen bg-sand/15">
          <View className="h-14 w-14 rounded-full bg-pink-50 items-center justify-center">
            <Icon name="users" size={26} color={colors.pink} />
          </View>
          <Text variant="subheading" className="font-display tracking-tight text-center">
            No communities found
          </Text>
          <Text variant="caption" tone="muted" className="text-center max-w-sm leading-6">
            {activeFilterCount > 0
              ? "Nothing matches your current filters. Try clearing them or looking in another state."
              : "No communities have been published yet — be the first to start one."}
          </Text>
          <View className="flex-row gap-2 mt-1">
            {activeFilterCount > 0 ? (
              <Button label="Reset filters" variant="secondary" size="sm" onPress={resetFilters} />
            ) : null}
            <Button
              label="Create a hub"
              variant="whatsapp"
              size="sm"
              onPress={() => router.push("/create/hub")}
            />
          </View>
        </Card>
      )}

      <Footer className="mt-12 border-t border-linen pt-8" />
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Filter controls                                                            */
/* -------------------------------------------------------------------------- */

function StatePill({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "h-9 flex-row items-center gap-1.5 rounded-full border px-3.5 active:opacity-80",
        active ? "border-pink-500 bg-pink-500" : "border-linen bg-card",
      )}
    >
      <Text className={cn("text-xs font-heading", active ? "text-white font-semibold" : "text-ink-muted")}>
        {label}
      </Text>
      {count != null && count > 0 ? (
        <Text className={cn("text-[10px] font-heading", active ? "text-white/80" : "text-ink-faint")}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

function FirstNationsToggle({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "h-8 flex-row items-center gap-1.5 rounded-full border px-3 active:opacity-80",
        active ? "border-country-black bg-country-black" : "border-linen bg-card",
      )}
    >
      <View className="flex-row gap-0.5">
        <View className="h-1.5 w-1.5 rounded-pill bg-country-red" />
        <View className="h-1.5 w-1.5 rounded-pill bg-country-ochre" />
        <View className={cn("h-1.5 w-1.5 rounded-pill", active ? "bg-paper" : "bg-ink")} />
      </View>
      <Text className={cn("text-[10px] font-heading uppercase tracking-wide", active ? "text-paper" : "text-ink")}>
        First Nations
      </Text>
    </Pressable>
  );
}

function SortChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn("rounded-full px-3 py-1.5 active:opacity-80", active ? "bg-ink" : "bg-transparent")}
    >
      <Text className={cn("text-[11px] font-heading", active ? "text-paper font-semibold" : "text-ink-muted")}>
        {label}
      </Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Cards                                                                      */
/* -------------------------------------------------------------------------- */

// Responsive grid widths: 1-up mobile, 2-up tablet, 3-up wide desktop.
// Gap is 16px (gap-4); calc offsets keep rows flush.
const CARD_WIDTH = "w-full md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]";

function CommunityCard({ hub, onPress }: { hub: any; onPress: () => void }) {
  const images = (hub.images ?? []).filter((i: any) => i && i.url);
  const logoUrl = getHubImage(images, "logo");
  const coverUrl =
    getHubImage(images, "cover") ??
    images.find((i: any) => i.type !== "logo")?.url ??
    images[0]?.url ??
    null;
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");
  const isVerified = hub.verification_status === "verified";
  const tags: string[] = (hub.tags ?? []).filter(Boolean).slice(0, 2);

  return (
    <Card padded={false} className={cn("overflow-hidden border border-linen bg-card rounded-2xl", CARD_WIDTH)}>
      <Pressable onPress={onPress} accessibilityRole="button" className="flex-1 justify-between active:opacity-95">
        <View>
          {/* Cover banner */}
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={{ width: "100%", height: 120 }} contentFit="cover" transition={150} />
          ) : (
            <View className="h-[120px] bg-sand items-center justify-center">
              <Icon name="image" size={24} color={colors.inkFaint} />
            </View>
          )}

          {/* Logo crest + status badges */}
          <View className="px-5 -mt-7 flex-row items-end justify-between gap-3">
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={{ width: 54, height: 54, borderRadius: 14, borderWidth: 3, borderColor: colors.card }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View
                style={{ width: 54, height: 54, borderRadius: 14, borderWidth: 3, borderColor: colors.card }}
                className="items-center justify-center bg-sand"
              >
                <Text className="font-display text-lg text-ink-muted font-bold">
                  {hub.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="flex-row items-center gap-1.5 pb-0.5">
              {isVerified ? (
                <View className="h-6 w-6 rounded-full bg-teal-50 items-center justify-center">
                  <Icon name="check-circle" size={15} color={colors.tealDeep} />
                </View>
              ) : null}
              {hub.indigenous_led ? <IndigenousLedBadge /> : null}
            </View>
          </View>

          {/* Details */}
          <View className="px-5 pt-3 gap-2">
            <View className="gap-1">
              <Text className="text-[10px] text-pink-600 font-heading uppercase tracking-wider">
                {HUB_TYPE_LABELS[hub.type as HubType]}
              </Text>
              <Text className="font-display text-lg text-ink font-bold tracking-tight" numberOfLines={1}>
                {hub.name}
              </Text>
            </View>
            {hub.short_description ? (
              <Text className="text-xs text-ink-muted leading-5" numberOfLines={2}>
                {hub.short_description}
              </Text>
            ) : (
              <Text className="text-xs text-ink-faint italic leading-5">No description provided yet.</Text>
            )}
            {tags.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5 pt-0.5">
                {tags.map((tag) => (
                  <View key={tag} className="rounded-full bg-sand px-2.5 py-1">
                    <Text className="text-[10px] font-heading text-ink-muted">{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* Footer row */}
        <View className="mt-3 px-5 py-3.5 border-t border-linen flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
            <Icon name="map-pin" size={12} color={colors.inkFaint} />
            <Text className="text-[11px] text-ink-muted font-heading flex-1" numberOfLines={1}>
              {place || "Australia"}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-heading text-pink-600 font-semibold">Explore</Text>
            <Icon name="arrow-right" size={13} color={colors.pink} />
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <View className={cn("overflow-hidden rounded-2xl border border-linen bg-card", CARD_WIDTH)}>
      <View className="h-[120px] bg-sand" />
      <View className="px-5 -mt-7">
        <View className="h-[54px] w-[54px] rounded-[14px] border-[3px] border-card bg-linen" />
      </View>
      <View className="px-5 pt-3 pb-5 gap-2.5">
        <View className="h-2.5 w-20 rounded-full bg-sand" />
        <View className="h-4 w-2/3 rounded-full bg-linen" />
        <View className="h-2.5 w-full rounded-full bg-sand" />
        <View className="h-2.5 w-4/5 rounded-full bg-sand" />
      </View>
    </View>
  );
}
