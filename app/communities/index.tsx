import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, Input, Button, Card, Icon, Footer, Avatar } from "@/components/ui";
import { FirstNationsToggle } from "@/components/cultural/FirstNationsToggle";
import { useHubs, useHubStateCounts } from "@/features/hubs/api";
import { useSearchProfiles } from "@/features/profiles/api";
import { CommunityCard, SkeletonCard } from "@/features/hubs/components/CommunityCard";
import { HUB_TYPES, HUB_TYPE_LABELS, AUSTRALIAN_STATES, type HubType, type StateCode } from "@/lib/constants";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

type SortKey = "newest" | "az";

export default function CommunitiesScreen() {
  const router = useRouter();
  const CARD_WIDTH = "w-full md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<StateCode | "">("");
  const [selectedTypes, setSelectedTypes] = useState<HubType[]>([]);
  const [onlyIndigenousLed, setOnlyIndigenousLed] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [searchFocused, setSearchFocused] = useState(false);

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

  const { data: profiles } = useSearchProfiles(query);

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
        <View className="flex-row items-end gap-3">
          <Text className="font-display text-3xl md:text-5xl text-ink tracking-tight font-bold">
            Communities
          </Text>
          {totalAcrossStates > 0 ? (
            <View className="items-end pb-1">
              <Text className="font-display text-2xl text-pink-500 leading-none">{totalAcrossStates}</Text>
              <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted mt-1">
                Active hubs
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Primary controls — search · First Nations · sort, one line */}
      <View className="mt-4 flex-row flex-wrap items-center gap-2.5">
        {/* Search + people */}
        <View
          className={cn(
            "h-11 min-w-[240px] flex-1 flex-row items-center gap-1.5 rounded-full border bg-card px-3 md:h-12 md:px-5",
            searchFocused ? "border-teal-500 shadow-card" : "border-linen shadow-subtle",
          )}
        >
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search communities & people…"
            returnKeyType="search"
            autoCorrect={false}
            leftIcon={<Icon name="search" size={17} color={searchFocused ? colors.teal : colors.inkFaint} />}
            rightIcon={
              query ? (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  className="h-5 w-5 items-center justify-center rounded-full bg-sand active:opacity-60"
                >
                  <Icon name="close" size={13} color={colors.inkMuted} strokeWidth={2.5} />
                </Pressable>
              ) : undefined
            }
            containerClassName="flex-1 border-0 bg-transparent h-full px-0"
            className="font-sans text-sm md:text-base"
          />
        </View>

        {/* First Nations */}
        <FirstNationsToggle
          active={onlyIndigenousLed}
          onPress={() => setOnlyIndigenousLed((v) => !v)}
          className="h-11 self-center px-4 md:h-12"
        />

        {/* Sort */}
        <View className="h-11 flex-row rounded-full border border-linen bg-card p-1 md:h-12">
          <SortChip label="Newest" active={sort === "newest"} onPress={() => setSort("newest")} />
          <SortChip label="A–Z" active={sort === "az"} onPress={() => setSort("az")} />
        </View>
      </View>

      {/* Filters — states · types on one scrolling line */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-center gap-2 pr-gutter"
        className="-mx-gutter px-gutter mt-3"
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
        <View className="mx-1 h-6 w-[1px] bg-linen" />
        {HUB_TYPES.map((type) => (
          <TogglePill
            key={type}
            label={HUB_TYPE_LABELS[type]}
            selected={selectedTypes.includes(type)}
            onPress={() => toggleType(type)}
          />
        ))}
      </ScrollView>

      {/* Results toolbar */}
      <View className="mt-4 mb-2 flex-row items-center justify-between border-b border-linen pb-2">
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
      </View>

      {/* Grid */}
      {!isLoading && !isError && profiles && profiles.length > 0 ? (
        <View className="gap-3 mb-6 bg-sand/10 border border-linen/35 p-3.5 rounded-2xl">
          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
            People & Professionals ({profiles.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pr-gutter py-1"
            className="-mx-gutter px-gutter"
          >
            {profiles.map((prof) => (
              <Pressable
                key={prof.id}
                onPress={() => router.push(`/profile/${prof.id}`)}
                className="w-[180px] bg-card border border-linen/50 p-4 rounded-2xl items-center gap-2.5 active:scale-[0.98] shadow-sm"
              >
                <Avatar
                  name={prof.full_name}
                  uri={prof.avatar_url}
                  size={52}
                />
                <View className="items-center min-w-0 w-full mt-1">
                  <Text className="font-heading text-xs text-ink text-center truncate w-full" numberOfLines={1}>
                    {prof.full_name}
                  </Text>
                  {prof.professional_title ? (
                    <Text className="text-[9px] text-pink-600 font-medium tracking-tight text-center truncate w-full mt-0.5" numberOfLines={1}>
                      {prof.professional_title}
                    </Text>
                  ) : null}
                  {prof.bio ? (
                    <Text className="text-[10px] text-ink-faint text-center mt-1.5 truncate w-full" numberOfLines={2}>
                      {prof.bio}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {isLoading ? (
        <View className="flex-row flex-wrap gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className={CARD_WIDTH} />
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
      ) : (count > 0 || (profiles && profiles.length > 0)) ? (
        <View className="gap-6">
          {count > 0 ? (
            <View className="flex-row flex-wrap gap-4">
              {visibleHubs.map((hub) => (
                <CommunityCard key={hub.id} hub={hub} className={CARD_WIDTH} onPress={() => router.push(`/hub/${hub.slug}`)} />
              ))}
            </View>
          ) : (
            <Card className="items-center gap-2 p-6 border border-dashed border-linen bg-sand/5">
              <Text variant="caption" tone="muted" className="text-center">
                No matching community pages. See matching profiles above.
              </Text>
            </Card>
          )}
        </View>
      ) : (
        <Card className="items-center gap-3 p-10 border border-dashed border-linen bg-sand/15">
          <View className="h-14 w-14 rounded-full bg-pink-50 items-center justify-center">
            <Icon name="users" size={26} color={colors.pink} />
          </View>
          <Text variant="subheading" className="font-display tracking-tight text-center">
            No results found
          </Text>
          <Text variant="caption" tone="muted" className="text-center max-w-sm leading-6">
            {activeFilterCount > 0
              ? "Nothing matches your search or filters. Try clearing them or looking in another state."
              : "No communities or profiles have been published yet."}
          </Text>
          <View className="flex-row gap-2 mt-1">
            {activeFilterCount > 0 ? (
              <Button label="Reset filters" variant="secondary" size="sm" onPress={resetFilters} />
            ) : null}
            <Button
              label="Create a page"
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
        active ? "border-pink-500 bg-pink-500 shadow-subtle" : "border-linen bg-card hover:bg-sand",
      )}
    >
      <Text className={cn("text-xs font-heading", active ? "text-ink font-semibold" : "text-ink-muted")}>
        {label}
      </Text>
      {count != null && count > 0 ? (
        <Text className={cn("text-[10px] font-heading", active ? "text-ink/70" : "text-ink-faint")}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Unified selectable pill — shared look with the Discover screen's filters. */
function TogglePill({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      className={cn(
        "h-9 flex-row items-center gap-1.5 rounded-full border px-3.5 active:opacity-80",
        selected
          ? "border-ink bg-ink shadow-subtle"
          : "border-linen bg-card hover:border-ink/30 hover:bg-sand",
      )}
    >
      {selected ? <Icon name="check" size={11} color={colors.paper} strokeWidth={2.5} /> : null}
      <Text className={cn("font-heading text-[11px]", selected ? "font-semibold text-paper" : "text-ink-muted")}>
        {label}
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
      className={cn("h-full items-center justify-center rounded-full px-3.5 active:opacity-80", active && "bg-ink")}
    >
      <Text className={cn("font-heading text-xs", active ? "text-paper font-semibold" : "text-ink-muted")}>
        {label}
      </Text>
    </Pressable>
  );
}
