import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Footer } from "@/components/ui/Footer";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LocationPicker, ANYWHERE, type LocationValue } from "@/components/ui/LocationPicker";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { HubCard } from "@/features/hubs/HubCard";
import { useHubs } from "@/features/hubs/api";
import { EventCard } from "@/features/events/EventCard";
import { FeaturedEventCard } from "@/features/events/FeaturedEventCard";
import { useEvents } from "@/features/events/api";
import { useMyProfile } from "@/features/profiles/api";
import { parsePreferences } from "@/lib/validation/profile";
import {
  AUSTRALIAN_STATES,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  HUB_TYPES,
  HUB_TYPE_LABELS,
  INTEREST_OPTIONS,
  type EventType,
  type HubType,
  type StateCode,
} from "@/lib/constants";

const FN_FOCUS = new Set([
  "indigenous",
  "reconciliation",
  "language",
  "country & land",
  "elders",
  "storytelling",
]);

const CATEGORY_META: Record<EventType, { icon: IconName; tone: string; fg: string }> = {
  event: { icon: "calendar", tone: "bg-pink-50", fg: colors.pinkDeep },
  activity: { icon: "sparkle", tone: "bg-teal-50", fg: colors.tealDeep },
  workshop: { icon: "edit", tone: "bg-gold-50", fg: colors.goldDeep },
  art: { icon: "palette", tone: "bg-pink-50", fg: colors.pinkDeep },
  movie: { icon: "film", tone: "bg-teal-50", fg: colors.tealDeep },
  dining: { icon: "food", tone: "bg-gold-50", fg: colors.goldDeep },
  shopping: { icon: "bag", tone: "bg-pink-50", fg: colors.pinkDeep },
  offer: { icon: "ticket", tone: "bg-teal-50", fg: colors.tealDeep },
  classes_gym: { icon: "dumbbell", tone: "bg-eucalyptus-50", fg: colors.eucalyptus },
  travel: { icon: "compass", tone: "bg-gold-50", fg: colors.goldDeep },
  other: { icon: "grid", tone: "bg-sand", fg: colors.inkMuted },
};

function lowerSet(values: (string | null | undefined)[]): Set<string> {
  return new Set(values.filter(Boolean).map((v) => (v as string).toLowerCase()));
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"box" | "list">("box");
  const { width } = useWindowDimensions();
  const { data: profile } = useMyProfile();

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState<LocationValue>(ANYWHERE);
  const [interests, setInterests] = useState<string[]>([]);
  const [categories, setCategories] = useState<EventType[]>([]);
  const [hubTypes, setHubTypes] = useState<HubType[]>([]);
  const [firstNations, setFirstNations] = useState(false);
  const query = search.trim();

  // Smart default: seed the location filter from the member's saved location once.
  const seededLocation = useRef(false);
  useEffect(() => {
    if (seededLocation.current || !profile) return;
    seededLocation.current = true;
    const loc = parsePreferences(profile.preferences).location;
    if (loc?.state) {
      setLocation({ state: loc.state as StateCode, councilId: loc.councilId ?? undefined, label: loc.label });
    }
  }, [profile]);

  const activeInterests = interests.length > 0 ? interests : profile?.interests ?? [];

  const eventFilters = {
    ...(query ? { search: query } : {}),
    ...(location.state ? { state: location.state } : {}),
    ...(location.councilId ? { councilId: location.councilId } : {}),
  };
  const hubFilters = {
    ...(query ? { search: query } : {}),
    ...(location.state ? { state: location.state } : {}),
    ...(hubTypes.length === 1 ? { type: hubTypes[0] } : {}),
  };

  const { data: events, isLoading: eventsLoading, isError: eventsError } = useEvents(eventFilters);
  const { data: hubs, isLoading: hubsLoading, isError: hubsError } = useHubs(hubFilters);

  const categoryEvents = categories.length
    ? (events ?? []).filter((e) => categories.includes(e.type))
    : events ?? [];

  const interestSet = lowerSet(activeInterests);
  const matches = (haystack: (string | null | undefined)[]) =>
    [...lowerSet(haystack)].some((v) => interestSet.has(v));
  const filteredHubs = hubTypes.length
    ? (hubs ?? []).filter((h) => hubTypes.includes(h.type as HubType))
    : hubs ?? [];

  const eventIsFN = (e: (typeof categoryEvents)[number]) =>
    !!e.hub?.indigenous_led || (e.cultural_focus ?? []).some((f) => FN_FOCUS.has(f.toLowerCase()));
  const hubIsFN = (h: (typeof filteredHubs)[number]) => !!h.indigenous_led;

  const fnEvents = categoryEvents.filter(eventIsFN);
  const fnHubs = filteredHubs.filter(hubIsFN);

  const baseEvents = firstNations ? fnEvents : categoryEvents;
  const baseHubs = firstNations ? fnHubs : filteredHubs;
  const featured = baseEvents.slice(0, 5);
  const comingUp = baseEvents.slice(5, 13);

  const forYouEvents = activeInterests.length
    ? categoryEvents.filter((e) => matches([...(e.cultural_focus ?? []), ...(e.tags ?? [])]))
    : [];
  const hasForYou = !firstNations && forYouEvents.length > 0;

  const likedHubs = activeInterests.length
    ? filteredHubs.filter((h) => matches([...(h.categories ?? []), ...(h.tags ?? [])]))
    : [];
  const hubResults = (likedHubs.length && !firstNations ? likedHubs : baseHubs).slice(0, 8);
  const activeFilterCount =
    (query ? 1 : 0) +
    (location.state ? 1 : 0) +
    (location.councilId ? 1 : 0) +
    interests.length +
    categories.length +
    hubTypes.length +
    (firstNations ? 1 : 0);

  const showFnSection = !firstNations && (fnEvents.length > 0 || fnHubs.length > 0);
  const featuredWidth = Math.min(width - 56, 440);

  const toggleCategory = (c: EventType) =>
    setCategories((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  const toggleHubType = (type: HubType) =>
    setHubTypes((cur) => (cur.includes(type) ? cur.filter((x) => x !== type) : [...cur, type]));
  const clearFilters = () => {
    setSearch("");
    setLocation(ANYWHERE);
    setInterests([]);
    setCategories([]);
    setHubTypes([]);
    setFirstNations(false);
  };

  return (
    <Screen contentClassName="pt-6 md:pt-8">
      {/* Hero — hot pink background, turquoise border detail, gold accents */}
      <View className="overflow-hidden rounded-3xl border-2 border-teal-500 bg-pink-500 p-7 md:p-12">
        <View className="flex-row items-center gap-2">
          <Icon name="sparkle" size={15} color={colors.gold} filled />
          <Text variant="overline" className="text-white/90">
            CulturePass Australia · Unity in diversity
          </Text>
        </View>
        <Text variant="displayLarge" tone="white" className="mt-4 max-w-[760px]">
          {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}.` : "Culture, nearby."}
        </Text>
        <Text variant="lead" className="mt-4 max-w-[520px] text-white/90">
          Discover events, hubs, organisers and community spaces in one place — with First Nations
          voices at the centre.
        </Text>
        <View className="mt-7 flex-row flex-wrap gap-3">
          <Button
            label="Edit interests"
            variant="ghost"
            className="bg-gold-500 active:bg-gold-600"
            leftIcon={<Icon name="sparkle" size={16} color={colors.ink} />}
            onPress={() => router.push("/onboarding")}
          />
          <Button
            label="Create hub"
            variant="primary"
            onPress={() => router.push("/create/hub")}
          />
        </View>
        <View className="mt-7 flex-row border-t border-white/20 pt-4">
          <Metric label="Events shown" value={eventsLoading ? "…" : String(baseEvents.length)} />
          <Metric label="Hubs shown" value={hubsLoading ? "…" : String(baseHubs.length)} />
          <Metric label="States" value={String(AUSTRALIAN_STATES.length)} />
        </View>
      </View>

      {/* Search + a single compact row of filters */}
      <View className="mt-6 gap-3">
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search events, hubs or places"
          returnKeyType="search"
          autoCorrect={false}
          leftIcon={<Icon name="search" size={18} color={colors.inkFaint} />}
        />
        <View className="flex-row flex-wrap gap-2">
          <LocationPicker value={location} onChange={setLocation} />
          <MultiSelectFilter
            label="Interests"
            icon="sparkle"
            options={INTEREST_OPTIONS as readonly string[]}
            selected={interests}
            onChange={setInterests}
          />
          <MultiSelectFilter
            label="Category"
            icon="filter"
            options={EVENT_TYPES as readonly string[]}
            labels={EVENT_TYPE_LABELS as Record<string, string>}
            selected={categories as string[]}
            onChange={(next) => setCategories(next as EventType[])}
          />
          <MultiSelectFilter
            label="Hub type"
            icon="grid"
            options={HUB_TYPES as readonly string[]}
            labels={HUB_TYPE_LABELS as Record<string, string>}
            selected={hubTypes as string[]}
            onChange={(next) => setHubTypes(next as HubType[])}
          />
          <FirstNationsToggle active={firstNations} onPress={() => setFirstNations((v) => !v)} />
          {activeFilterCount > 0 ? (
            <Button label="Clear filters" variant="outline" size="sm" onPress={clearFilters} />
          ) : null}
        </View>
      </View>

      {/* Browse by category — visual quick-filter tiles */}
      <View className="mt-section gap-4">
        <Text variant="overline" tone="pink">
          Browse by category
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 pr-4"
          className="-mx-gutter px-gutter"
        >
          {EVENT_TYPES.map((type) => {
            const meta = CATEGORY_META[type];
            const on = categories.includes(type);
            return (
              <Pressable
                key={type}
                onPress={() => toggleCategory(type)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className="w-[76px] items-center gap-2"
              >
                <View
                  className={cn(
                    "h-16 w-16 items-center justify-center rounded-2xl border-2",
                    on ? "border-ink bg-ink" : `border-transparent ${meta.tone}`,
                  )}
                >
                  <Icon name={meta.icon} size={24} color={on ? colors.paper : meta.fg} />
                </View>
                <Text
                  variant="caption"
                  numberOfLines={1}
                  className={cn("text-center text-xs", on ? "text-ink" : "text-ink-muted")}
                >
                  {EVENT_TYPE_LABELS[type]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Browse by hub purpose — merged from Explore */}
      <View className="mt-section gap-4">
        <View className="flex-row items-end justify-between gap-3">
          <View className="gap-1">
            <Text variant="overline" tone="pink">
              Explore hubs
            </Text>
            <Text variant="title">Browse by purpose</Text>
          </View>
          <Button label="My hubs" variant="outline" size="sm" onPress={() => router.push("/my-hubs")} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 pr-4"
          className="-mx-gutter px-gutter"
        >
          {HUB_TYPES.map((type) => {
            const on = hubTypes.includes(type);
            return (
              <Pressable
                key={type}
                onPress={() => toggleHubType(type)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={cn(
                  "w-[220px] gap-2 rounded-2xl border p-4",
                  on ? "border-ink bg-ink" : "border-linen bg-card active:bg-sand",
                )}
              >
                <View className="flex-row items-center gap-2">
                  <View
                    className={cn(
                      "h-9 w-9 items-center justify-center rounded-xl",
                      on ? "bg-paper/15" : "bg-sand",
                    )}
                  >
                    <Icon name="grid" size={17} color={on ? colors.paper : colors.inkMuted} />
                  </View>
                  <Text
                    variant="label"
                    numberOfLines={2}
                    className={cn("flex-1 font-heading", on ? "text-paper" : "text-ink")}
                  >
                    {HUB_TYPE_LABELS[type]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Featured / Happening soon — image-forward banner rail */}
      <View className="mt-section gap-5">
        <SectionHeader
          eyebrow={firstNations ? "First Nations" : "Happening soon"}
          title="Featured"
          onSeeAll={() => router.push("/calendar")}
          showSeeAll={featured.length > 0}
        />
        {eventsLoading ? (
          <Card>
            <Text variant="caption" tone="faint">
              Loading…
            </Text>
          </Card>
        ) : eventsError ? (
          <Card>
            <Text variant="caption" tone="muted">
              Could not load events. Check your connection and try again.
            </Text>
          </Card>
        ) : featured.length > 0 ? (
          <Carousel>
            {featured.map((event) => (
              <View key={event.id} style={{ width: featuredWidth }}>
                <FeaturedEventCard event={event} />
              </View>
            ))}
          </Carousel>
        ) : (
          <EmptyCard
            title="No matching events yet"
            body="Try clearing a filter, or add the first event for this community."
            action="Add an event"
            onPress={() => router.push("/create/event")}
          />
        )}
      </View>

      {/* First Nations voices — kept near the top, honouring the core mission */}
      {showFnSection ? (
        <View className="mt-section gap-5">
          <View className="gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-pill bg-country-red" />
              <View className="h-2 w-2 rounded-pill bg-country-ochre" />
              <View className="h-2 w-2 rounded-pill bg-ink" />
              <Text variant="overline" className="ml-1 text-ink-muted">
                First Nations voices
              </Text>
            </View>
            <Text variant="title">Always was, always will be</Text>
          </View>
          <Carousel>
            {fnEvents.slice(0, 6).map((event) => (
              <View key={event.id} className="w-[300px]">
                <EventCard event={event} />
              </View>
            ))}
            {fnHubs.slice(0, 4).map((hub) => (
              <View key={hub.slug} className="w-[300px]">
                <HubCard hub={hub} />
              </View>
            ))}
          </Carousel>
        </View>
      ) : null}

      {/* For you */}
      {hasForYou ? (
        <View className="mt-section gap-5">
          <SectionHeader eyebrow="Tuned to you" title="For you" />
          <View className="gap-4 md:flex-row md:flex-wrap">
            {forYouEvents.slice(0, 4).map((event) => (
              <View key={event.id} className="md:w-[calc(50%-8px)]">
                <EventCard event={event} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Coming up */}
      {comingUp.length > 0 ? (
        <View className="mt-section gap-5">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1">
              <Text variant="overline" tone="pink">
                {hasForYou ? "More to explore" : "On the calendar"}
              </Text>
              <Text variant="title">Coming up</Text>
            </View>
            <View className="flex-row items-center gap-4">
              {/* View Layout Toggle */}
              <View className="flex-row items-center gap-1 bg-sand/50 p-0.5 rounded-xl border border-linen/40">
                <Pressable
                  onPress={() => setViewMode("box")}
                  className={cn(
                    "px-3 py-1 rounded-lg flex-row items-center gap-1.5",
                    viewMode === "box" ? "bg-card shadow-subtle border border-linen/20" : ""
                  )}
                >
                  <Icon name="grid" size={13} color={viewMode === "box" ? colors.ink : colors.inkMuted} />
                  <Text variant="caption" className={cn("text-xs font-heading", viewMode === "box" ? "text-ink" : "text-ink-muted")}>
                    Box
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setViewMode("list")}
                  className={cn(
                    "px-3 py-1 rounded-lg flex-row items-center gap-1.5",
                    viewMode === "list" ? "bg-card shadow-subtle border border-linen/20" : ""
                  )}
                >
                  <Icon name="menu" size={13} color={viewMode === "list" ? colors.ink : colors.inkMuted} />
                  <Text variant="caption" className={cn("text-xs font-heading", viewMode === "list" ? "text-ink" : "text-ink-muted")}>
                    List
                  </Text>
                </Pressable>
              </View>
              <Button
                label="See all"
                variant="ghost"
                size="sm"
                onPress={() => router.push("/calendar")}
              />
            </View>
          </View>
          <View className={cn("gap-4", viewMode === "box" ? "md:flex-row md:flex-wrap" : "flex-column")}>
            {comingUp.map((event) => (
              <View
                key={event.id}
                className={cn(
                  viewMode === "box"
                    ? "w-full md:w-[calc(50%-8px)]"
                    : "w-full"
                )}
              >
                <EventCard event={event} variant={viewMode} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Hubs — merged Explore results */}
      <View className="mt-section gap-5">
        <SectionHeader
          eyebrow={
            activeFilterCount > 0
              ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`
              : "Communities"
          }
          title={query ? "Matching hubs" : "Hubs to explore"}
          showSeeAll={false}
        />
        {hubsLoading ? (
          <Card>
            <Text variant="caption" tone="faint">
              Loading…
            </Text>
          </Card>
        ) : hubsError ? (
          <Card>
            <Text variant="caption" tone="muted">
              Could not load communities.
            </Text>
          </Card>
        ) : hubResults.length > 0 ? (
          <View className="gap-4 md:flex-row md:flex-wrap">
            {hubResults.map((hub) => (
              <View key={hub.slug} className="md:w-[calc(50%-8px)]">
                <HubCard hub={hub} />
              </View>
            ))}
          </View>
        ) : (
          <EmptyCard
            title="No hubs match that yet"
            body="Try clearing a filter, or create the first hub for this community."
            action="Create a hub"
            onPress={() => router.push("/create/hub")}
          />
        )}
      </View>

      <Footer className="mt-section" />
    </Screen>
  );
}

function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-4 pr-4"
      className="-mx-gutter px-gutter"
    >
      {children}
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[100px] flex-1 py-1 pr-3">
      <Text variant="title" tone="white">
        {value}
      </Text>
      <Text variant="caption" className="mt-0.5 text-white/75">
        {label}
      </Text>
    </View>
  );
}

function FirstNationsToggle({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "h-11 flex-row items-center gap-2 self-start rounded-pill border px-4",
        active ? "border-country-black bg-country-black" : "border-linen bg-card active:bg-sand",
      )}
    >
      <View className="flex-row gap-0.5">
        <View className="h-2 w-2 rounded-pill bg-country-red" />
        <View className="h-2 w-2 rounded-pill bg-country-ochre" />
        <View className={cn("h-2 w-2 rounded-pill", active ? "bg-paper" : "bg-ink")} />
      </View>
      <Text variant="label" className={cn("font-heading text-sm", active ? "text-paper" : "text-ink")}>
        First Nations
      </Text>
    </Pressable>
  );
}

function SectionHeader({
  eyebrow,
  title,
  onSeeAll,
  showSeeAll,
}: {
  eyebrow: string;
  title: string;
  onSeeAll?: () => void;
  showSeeAll?: boolean;
}) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="gap-1">
        <Text variant="overline" tone="pink">
          {eyebrow}
        </Text>
        <Text variant="title">{title}</Text>
      </View>
      {onSeeAll && showSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8} className="flex-row items-center gap-1 pb-1 active:opacity-60">
          <Text variant="label" tone="muted" className="font-heading">
            View all
          </Text>
          <Icon name="arrow-right" size={16} color={colors.inkMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyCard({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Card className="items-start gap-3">
      <Text variant="subheading">{title}</Text>
      <Text variant="caption" tone="muted">
        {body}
      </Text>
      <Button label={action} variant="whatsapp" size="sm" onPress={onPress} />
    </Card>
  );
}
