import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import {
  Screen,
  Text,
  Input,
  Button,
  Card,
  Footer,
  Icon,
  LocationPicker,
  ANYWHERE,
  Carousel,
  SectionHeader,
  EmptyCard,
  useToast,
} from "@/components/ui";
import { FirstNationsToggle } from "@/components/cultural/FirstNationsToggle";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { useHubs } from "@/features/hubs/api";
import { EventCard } from "@/features/events/EventCard";
import { FeaturedEventCard } from "@/features/events/FeaturedEventCard";
import { CohostInvitationsBanner } from "@/features/events/CohostInvitationsBanner";
import { useEvents } from "@/features/events/api";
import { useMyProfile, useUpdateMyProfile } from "@/features/profiles/api";
import { parsePreferences } from "@/lib/validation/profile";
import { useSavedLocation } from "@/features/reference/useSavedLocation";
import { useCouncilDetails, useDetectCouncil } from "@/features/reference/api";
import { ExploreCities } from "@/features/reference/ExploreCities";
import {
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



function lowerSet(values: (string | null | undefined)[]): Set<string> {
  return new Set(values.filter(Boolean).map((v) => (v as string).toLowerCase()));
}

function groupEventsByDate(eventsList: any[]) {
  const groups: { dateLabel: string; items: any[] }[] = [];
  eventsList.forEach((e) => {
    if (!e.start_time) return;
    const dateObj = new Date(e.start_time);
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    let dateLabel = "";
    if (dateObj.toDateString() === today.toDateString()) {
      dateLabel = "Today";
    } else if (dateObj.toDateString() === tomorrow.toDateString()) {
      dateLabel = "Tomorrow";
    } else {
      dateLabel = new Intl.DateTimeFormat("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(dateObj); // e.g. "Sat, 27 Jun"
    }

    const existing = groups.find((g) => g.dateLabel === dateLabel);
    if (existing) {
      existing.items.push(e);
    } else {
      groups.push({ dateLabel, items: [e] });
    }
  });
  return groups;
}

function getGreeting(name?: string | null) {
  const hour = new Date().getHours();
  const dayPart = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `Good ${dayPart}, ${firstName}` : `Good ${dayPart}`;
}

function getWhatsOnLabel(locationLabel: string) {
  return locationLabel === "Australia" ? "What's On Near You" : `What's On ${locationLabel}`;
}

const FRIENDLY_PLACE_NAMES: Record<string, string> = {
  "city of sydney": "Sydney",
  "sydney": "Sydney",
  "inner west council": "Newtown",
  "inner west": "Newtown",
  "city of newcastle": "Newcastle",
  "newcastle": "Newcastle",
  "city of melbourne": "Melbourne",
  "melbourne": "Melbourne",
  "brisbane city council": "Brisbane",
  "city of brisbane": "Brisbane",
  "brisbane": "Brisbane",
  "city of adelaide": "Adelaide",
  "adelaide": "Adelaide",
  "city of perth": "Perth",
  "perth": "Perth",
};

function getFriendlyPlaceName(label: string) {
  if (label === "Anywhere") return "Australia";

  const normalized = label.trim().toLowerCase().replace(/\s+/g, " ");
  const mapped = FRIENDLY_PLACE_NAMES[normalized];
  if (mapped) return mapped;

  return label
    .replace(/^city of\s+/i, "")
    .replace(/^municipality of\s+/i, "")
    .replace(/\s+city council$/i, "")
    .replace(/\s+regional council$/i, "")
    .replace(/\s+shire council$/i, "")
    .replace(/\s+shire$/i, "")
    .replace(/\s+council$/i, "")
    .trim();
}



export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data: profile } = useMyProfile();
  const updateProfile = useUpdateMyProfile();

  const [search, setSearch] = useState("");
  const { location, setLocation } = useSavedLocation();
  const [interests, setInterests] = useState<string[]>([]);
  const [categories, setCategories] = useState<EventType[]>([]);
  const [hubTypes, setHubTypes] = useState<HubType[]>([]);
  const [firstNations, setFirstNations] = useState(false);
  const query = search.trim();

  const [homeTab, setHomeTab] = useState<"discover" | "council">("discover");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const toast = useToast();
  const { detect, detecting } = useDetectCouncil();
  const { data: councilDetails, isLoading: councilLoading } = useCouncilDetails(
    location.councilId ?? undefined,
  );

  const handleDetect = async () => {
    try {
      setLocation(await detect());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't detect your location.");
    }
  };

  const { data: councilEvents, isLoading: councilEventsLoading } = useEvents({
    councilId: location.councilId ?? undefined,
  });

  const { data: councilHubs, isLoading: councilHubsLoading } = useHubs({
    councilId: location.councilId ?? undefined,
  });

  const groupedCouncilEvents = groupEventsByDate(councilEvents ?? []);

  // Seed user saved location on startup
  const seededLocation = useRef(false);
  useEffect(() => {
    if (seededLocation.current || !profile) return;
    seededLocation.current = true;
    const loc = parsePreferences(profile.preferences).location;
    if (loc?.state) {
      setLocation({ state: loc.state as StateCode, councilId: loc.councilId ?? undefined, label: loc.label });
    }
  }, [profile, setLocation]);

  // Sync local location selection back to Supabase profile preferences
  useEffect(() => {
    if (!profile) return;
    const currentPrefs = parsePreferences(profile.preferences);
    const dbLoc = currentPrefs.location;
    
    // Check if dbLoc is different from local location
    const isDifferent =
      dbLoc?.state !== location.state ||
      dbLoc?.councilId !== location.councilId ||
      dbLoc?.label !== location.label;

    if (isDifferent && location.state) {
      updateProfile.mutate({
        location: location.label !== "Anywhere" ? location.label : null,
        preferences: {
          ...currentPrefs,
          location: {
            state: location.state,
            councilId: location.councilId ?? null,
            label: location.label,
          },
        },
      });
    }
  }, [location, profile, updateProfile]);

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

  const { data: events } = useEvents(eventFilters);
  const { data: hubs, isLoading: hubsLoading, isError: hubsError } = useHubs(hubFilters);

  const now = new Date();
  const activeEvents = (events ?? []).filter((e) => {
    if (!e.start_time) return false;
    const eventTime = e.end_time ? new Date(e.end_time) : new Date(e.start_time);
    return eventTime >= now;
  });

  const categoryEvents = categories.length
    ? activeEvents.filter((e) => categories.includes(e.type))
    : activeEvents;

  const interestSet = lowerSet(activeInterests);
  const matches = (haystack: (string | null | undefined)[]) =>
    [...lowerSet(haystack)].some((v) => interestSet.has(v));
  const filteredHubs = hubTypes.length
    ? (hubs ?? []).filter((h) => hubTypes.includes(h.type as HubType))
    : hubs ?? [];

  const eventIsFN = (e: any) =>
    !!e.hub?.indigenous_led || (e.cultural_focus ?? []).some((f: string) => FN_FOCUS.has(f.toLowerCase()));
  const hubIsFN = (h: any) => !!h.indigenous_led;

  const fnEvents = categoryEvents.filter(eventIsFN);
  const fnHubs = filteredHubs.filter(hubIsFN);

  const baseEvents = firstNations ? fnEvents : categoryEvents;
  const baseHubs = firstNations ? fnHubs : filteredHubs;
  const featured = baseEvents.slice(0, 5);
  const comingUp = baseEvents.slice(5, 20);

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
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const gridItemStyle: ViewStyle = {
    width: isDesktop ? "23.5%" : isTablet ? "48%" : "100%",
  };

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

  const locationLabel = getFriendlyPlaceName(location.label);
  const greeting = getGreeting(profile?.full_name);
  const whatsOnLabel = getWhatsOnLabel(locationLabel);
  const discoverStats = [
    { label: "Events", value: activeEvents.length },
    { label: "Communities", value: filteredHubs.length },
    { label: "Featured", value: featured.length },
  ];

  return (
    <Screen contentClassName="pt-4 md:pt-6" maxWidth="content">
      
      {/* Hero Header */}
      <View className="overflow-hidden rounded-3xl border border-night-line bg-night p-5 md:p-7 shadow-raised">
        <View className="absolute -right-8 -top-8 h-40 w-40 opacity-25">
          <Image source={require("../assets/logo.png")} style={{ width: "100%", height: "100%" }} contentFit="contain" />
        </View>

        <View className="relative gap-5">
          <View className="flex-row flex-wrap items-center justify-between gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">
                <Image source={require("../assets/logo.png")} style={{ width: 36, height: 36 }} contentFit="contain" />
              </View>
              <View>
                <Text className="font-display text-lg text-paper">CulturePass</Text>
                <Text variant="overline" className="text-night-muted">
                  Belong anywhere
                </Text>
              </View>
            </View>

            <View className="rounded-pill border border-white/15 bg-white/10 px-3 py-1.5">
              <Text variant="overline" className="font-bold text-teal-100 tracking-[1.6px]">
                {locationLabel}
              </Text>
            </View>
          </View>

          <View className="gap-2">
            <Text className="font-display text-4xl md:text-5xl lg:text-6xl text-paper font-extrabold leading-[1.05]">
              {greeting}
              {"\n"}
              {whatsOnLabel}
            </Text>
            <Text className="font-sans text-sm md:text-base text-night-muted max-w-prose">
              {"Discover what's on this week: cultural events, communities, tickets, and local experiences tailored to your city."}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {discoverStats.map((stat) => (
              <View key={stat.label} className="min-w-[104px] rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
                <Text className="font-display text-xl text-paper">{stat.value}</Text>
                <Text variant="overline" className="text-night-muted">
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Search & Location block */}
      <View className="flex-row items-center border border-linen bg-card rounded-2xl md:rounded-full px-3 md:px-4 h-12 md:h-14 gap-2 shadow-subtle w-full max-w-3xl mt-4">
        <View className="flex-1 flex-row items-center h-full">
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Discover events near you..."
            returnKeyType="search"
            autoCorrect={false}
            leftIcon={<Icon name="search" size={15} color={colors.inkFaint} />}
            containerClassName="border-0 bg-transparent h-full px-0 flex-1"
            className="text-xs md:text-sm font-sans"
          />
        </View>

        {/* Vertical divider */}
        <View className="w-[1px] h-5 md:h-6 bg-ink/20 mx-0.5" />

        {/* Location picker */}
        <View className="flex-row items-center h-full pr-0.5">
          <View className="mr-1">
            <Icon name="map-pin" size={13} color={colors.inkFaint} />
          </View>
          <LocationPicker
            value={location}
            onChange={setLocation}
            className="h-full border-0 bg-transparent px-0 active:bg-transparent"
          />
        </View>
      </View>

      {/* Search Filter Toggle and Collapsible Panel */}
      <View className="flex-row flex-wrap items-center gap-3 mt-5 w-full max-w-4xl">
        <Pressable
          onPress={() => setShowFilterPanel(!showFilterPanel)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showFilterPanel }}
          accessibilityLabel={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
          className={cn(
            "h-11 px-5 rounded-full border flex-row items-center gap-2 active:opacity-75 shadow-sm",
            showFilterPanel || activeFilterCount > 0 ? "border-ink bg-ink" : "border-linen bg-card"
          )}
        >
          <Icon name="filter" size={15} color={showFilterPanel || activeFilterCount > 0 ? colors.paper : colors.ink} />
          <Text className={cn("text-xs font-heading font-semibold", showFilterPanel || activeFilterCount > 0 ? "text-paper" : "text-ink")}>
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
          </Text>
        </Pressable>

        <FirstNationsToggle active={firstNations} onPress={() => setFirstNations((v) => !v)} />

        {activeFilterCount > 0 ? (
          <Button label="Clear all" variant="outline" size="sm" className="h-9 px-3 rounded-full" onPress={clearFilters} />
        ) : null}
      </View>

      {showFilterPanel && (
        <View className="w-full max-w-4xl border border-linen bg-card rounded-2xl p-5 mt-4 gap-5 shadow-card">
          <View className="flex-row items-center justify-between border-b border-linen pb-2.5">
            <Text className="font-heading text-sm font-bold text-ink">Discover Filters</Text>
            <Pressable
              onPress={() => setShowFilterPanel(false)}
              accessibilityRole="button"
              accessibilityLabel="Hide filters panel"
              className="active:opacity-75"
            >
              <Text className="text-xs font-semibold text-ink-muted">Hide panel</Text>
            </Pressable>
          </View>

          {/* Interests Section */}
          <View className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <Icon name="sparkle" size={13} color={colors.inkMuted} />
              <Text className="text-[10px] font-heading font-bold uppercase tracking-wider text-ink-muted">Interests</Text>
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              {INTEREST_OPTIONS.map((opt) => {
                const on = interests.includes(opt);
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setInterests(cur => cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt])}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={opt}
                    className={cn(
                      "px-3 py-1.5 rounded-full border flex-row items-center gap-1.5 active:opacity-85",
                      on ? "border-ink bg-ink" : "border-linen/75 bg-paper"
                    )}
                  >
                    {on && <Icon name="check" size={10} color={colors.paper} strokeWidth={2.5} />}
                    <Text className={cn("text-xs font-medium", on ? "text-paper" : "text-ink")}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Categories Section */}
          <View className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <Icon name="filter" size={13} color={colors.inkMuted} />
              <Text className="text-[10px] font-heading font-bold uppercase tracking-wider text-ink-muted">Categories</Text>
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              {EVENT_TYPES.map((type) => {
                const on = categories.includes(type);
                return (
                  <Pressable
                    key={type}
                    onPress={() => toggleCategory(type)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={EVENT_TYPE_LABELS[type]}
                    className={cn(
                      "px-3 py-1.5 rounded-full border flex-row items-center gap-1.5 active:opacity-85",
                      on ? "border-ink bg-ink" : "border-linen/75 bg-paper"
                    )}
                  >
                    {on && <Icon name="check" size={10} color={colors.paper} strokeWidth={2.5} />}
                    <Text className={cn("text-xs font-medium", on ? "text-paper" : "text-ink")}>
                      {EVENT_TYPE_LABELS[type]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Page Type Section */}
          <View className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <Icon name="grid" size={13} color={colors.inkMuted} />
              <Text className="text-[10px] font-heading font-bold uppercase tracking-wider text-ink-muted">Page Types</Text>
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              {HUB_TYPES.map((type) => {
                const on = hubTypes.includes(type);
                return (
                  <Pressable
                    key={type}
                    onPress={() => toggleHubType(type)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={HUB_TYPE_LABELS[type]}
                    className={cn(
                      "px-3 py-1.5 rounded-full border flex-row items-center gap-1.5 active:opacity-85",
                      on ? "border-ink bg-ink" : "border-linen/75 bg-paper"
                    )}
                  >
                    {on && <Icon name="check" size={10} color={colors.paper} strokeWidth={2.5} />}
                    <Text className={cn("text-xs font-medium", on ? "text-paper" : "text-ink")}>
                      {HUB_TYPE_LABELS[type]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Active Filter Chips Row */}
      {activeFilterCount > 0 && (
        <View className="flex-row flex-wrap items-center gap-2 mt-3 w-full max-w-4xl">
          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted mr-1">Active Filters:</Text>
          {interests.map((opt) => (
            <Pressable
              key={`active-int-${opt}`}
              onPress={() => setInterests(cur => cur.filter(x => x !== opt))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${opt} filter`}
              className="bg-sand hover:bg-linen px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-linen active:opacity-75"
            >
              <Text className="text-xs text-ink">{opt}</Text>
              <Icon name="close" size={10} color={colors.inkMuted} strokeWidth={2.5} />
            </Pressable>
          ))}
          {categories.map((type) => (
            <Pressable
              key={`active-cat-${type}`}
              onPress={() => toggleCategory(type)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${EVENT_TYPE_LABELS[type]} filter`}
              className="bg-sand hover:bg-linen px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-linen active:opacity-75"
            >
              <Text className="text-xs text-ink">{EVENT_TYPE_LABELS[type]}</Text>
              <Icon name="close" size={10} color={colors.inkMuted} strokeWidth={2.5} />
            </Pressable>
          ))}
          {hubTypes.map((type) => (
            <Pressable
              key={`active-hub-${type}`}
              onPress={() => toggleHubType(type)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${HUB_TYPE_LABELS[type]} filter`}
              className="bg-sand hover:bg-linen px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-linen active:opacity-75"
            >
              <Text className="text-xs text-ink">{HUB_TYPE_LABELS[type]}</Text>
              <Icon name="close" size={10} color={colors.inkMuted} strokeWidth={2.5} />
            </Pressable>
          ))}
          {firstNations && (
            <Pressable
              key="active-fn"
              onPress={() => setFirstNations(false)}
              accessibilityRole="button"
              accessibilityLabel="Remove First Nations Spotlight filter"
              className="bg-country-ochre/15 px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-country-ochre/30 active:opacity-75"
            >
              <Text className="text-xs text-country-red font-semibold">First Nations Spotlight</Text>
              <Icon name="close" size={10} color={colors.inkMuted} strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
      )}

      {/* Category navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-gutter py-2"
        className="-mx-gutter px-gutter mt-5"
      >
        {EVENT_TYPES.map((type) => {
          const on = categories.includes(type);
          return (
            <Pressable
              key={type}
              onPress={() => toggleCategory(type)}
              className={cn(
                "rounded-full border px-4 py-2 active:opacity-85",
                on ? "border-ink bg-ink" : "border-linen/70 bg-card"
              )}
            >
              <Text
                className={cn(
                  "text-[10px] font-heading uppercase tracking-[1px] text-center",
                  on ? "text-paper font-semibold" : "text-ink"
                )}
              >
                {EVENT_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Home Switcher Tabs */}
      <View className="mt-6 mb-4 flex-row self-start rounded-full border border-linen bg-card p-1">
        <Pressable onPress={() => setHomeTab("discover")} className={cn("rounded-full px-4 py-2", homeTab === "discover" && "bg-ink")}>
          <Text className={cn("font-heading text-sm", homeTab === "discover" ? "text-paper font-semibold" : "text-ink-faint")}>
            Discover Feed
          </Text>
        </Pressable>
        <Pressable onPress={() => setHomeTab("council")} className={cn("rounded-full px-4 py-2", homeTab === "council" && "bg-ink")}>
          <Text className={cn("font-heading text-sm", homeTab === "council" ? "text-paper font-semibold" : "text-ink-faint")}>
            My Council
          </Text>
        </Pressable>
      </View>

      {homeTab === "discover" ? (
        <>
          <CohostInvitationsBanner />
          {/* Curated featured slider */}
          {featured.length > 0 ? (
            <View className="mt-6 gap-4">
              <SectionHeader
                eyebrow={firstNations ? "First Nations voices" : "Featured"}
                title="Editor's picks"
              />
              <Carousel>
                {featured.map((event) => (
                  <View key={event.id} style={{ width: featuredWidth }}>
                    <FeaturedEventCard event={event} />
                  </View>
                ))}
              </Carousel>
            </View>
          ) : null}

          {/* Explore Cities — nationwide discovery rail */}
          <View className="mt-8">
            <ExploreCities />
          </View>

          {/* First Nations acknowledgement banner */}
          {showFnSection ? (
            <View className="mt-8 rounded-2xl border border-country-ochre/40 bg-card p-5 gap-4 shadow-card">
              <View className="flex-row items-center gap-1.5 border-b border-linen pb-3">
                <View className="h-2 w-2 rounded-full bg-country-ochre" />
                <Text variant="overline" className="text-country-red font-bold tracking-[2px]">
                  First Nations Spotlight
                </Text>
              </View>
              <Carousel>
                {fnEvents.slice(0, 6).map((event) => (
                  <View key={event.id} className="w-[280px]">
                    <EventCard event={event} variant="list" />
                  </View>
                ))}
                {fnHubs.slice(0, 4).map((hub) => {
                  const images = (hub.images ?? []).filter((img) => img && img.url);
                  const logoUrl =
                    images.find((img) => img.type === "logo")?.url ??
                    images.find((img) => img.type !== "cover")?.url ??
                    images[0]?.url ??
                    null;
                  return (
                    <Pressable
                      key={hub.slug}
                      onPress={() => router.push(`/hub/${hub.slug}`)}
                      className="w-[280px] bg-card border border-linen p-3 rounded-2xl flex-row items-center gap-3 active:opacity-75"
                    >
                      {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                      ) : (
                        <View className="h-9 w-9 rounded-full bg-sand items-center justify-center">
                          <Text className="font-heading text-sm text-ink-muted">
                            {hub.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="flex-1 min-w-0">
                        <Text className="text-xs font-heading text-ink truncate">{hub.name}</Text>
                        <Text className="text-[10px] text-ink-faint truncate">{HUB_TYPE_LABELS[hub.type]}</Text>
                      </View>
                      <Icon name="chevron-right" size={12} color={colors.inkMuted} />
                    </Pressable>
                  );
                })}
              </Carousel>
            </View>
          ) : null}

          {/* Main Full-Width Feed Layout */}
          <View className="mt-8 gap-8 w-full">
            
            {/* For You events feed */}
            {hasForYou ? (
              <View className="gap-3">
                <SectionHeader eyebrow="Tailored to you" title="Recommended" />
                <View className="flex-row flex-wrap gap-5 mt-2">
                  {forYouEvents.slice(0, 4).map((event) => (
                    <View key={event.id} style={gridItemStyle}>
                      <EventCard event={event} />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* EventGrid listing */}
            {comingUp.length > 0 ? (
              <View className="gap-6">
                <View className="flex-row items-baseline justify-between border-t border-linen pt-5 mt-2">
                  <Text variant="heading" className="font-heading text-xl text-ink font-extrabold">Upcoming events</Text>
                  <Pressable onPress={() => router.push("/calendar")} className="active:opacity-75">
                    <Text variant="overline" tone="pink" className="font-bold tracking-[1px]">Calendar view</Text>
                  </Pressable>
                </View>

                <View className="flex-row flex-wrap gap-5 mt-2">
                  {comingUp.map((event) => (
                    <View key={event.id} style={gridItemStyle}>
                      <EventCard event={event} />
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <EmptyCard
                title="No events found"
                body="Try clearing some search filters or changing locations."
                action="Add event"
                onPress={() => router.push("/create/event")}
              />
            )}

            {/* Active Hubs Section */}
            <View className="gap-6 mt-8 border-t border-linen pt-6">
              <View className="flex-row items-baseline justify-between">
                <Text variant="heading" className="font-heading text-xl text-ink font-extrabold">Active hubs</Text>
                <Pressable onPress={() => router.push("/my-hubs")} className="active:opacity-75">
                  <Text variant="overline" tone="pink" className="font-bold tracking-[1px]">My hubs</Text>
                </Pressable>
              </View>

              {/* Hub Type Filters */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 pr-4 pt-1"
                className="-mx-gutter px-gutter mt-2"
              >
                {HUB_TYPES.map((type) => {
                  const on = hubTypes.includes(type);
                  return (
                    <Pressable
                      key={type}
                      onPress={() => toggleHubType(type)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 active:opacity-85",
                        on ? "border-ink bg-ink" : "border-linen/70 bg-card"
                      )}
                    >
                      <Text className={cn("text-[9px] font-heading uppercase tracking-wider", on ? "text-paper" : "text-ink-muted")}>
                        {HUB_TYPE_LABELS[type].split(" ")[0]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {hubsLoading ? (
                <Card className="p-4 items-center"><Text variant="caption" tone="faint">Loading hubs...</Text></Card>
              ) : hubsError ? (
                <Card className="p-4 items-center"><Text variant="caption" tone="muted">Could not load hubs.</Text></Card>
              ) : hubResults.length > 0 ? (
                <View className="flex-row flex-wrap gap-5 mt-2">
                  {hubResults.map((hub) => {
                    const images = (hub.images ?? []).filter((img: any) => img && img.url);
                    const logoUrl =
                      images.find((img: any) => img.type === "logo")?.url ??
                      images.find((img: any) => img.type !== "logo")?.url ??
                      images[0]?.url ??
                      null;
                    const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");

                    return (
                      <View key={hub.slug} style={gridItemStyle}>
                        <Pressable
                          onPress={() => router.push(`/hub/${hub.slug}`)}
                          className="bg-card border border-linen p-4 rounded-2xl h-full justify-between active:opacity-75 shadow-sm"
                        >
                          <View className="flex-row items-center gap-3">
                            {logoUrl ? (
                              <Image
                                source={{ uri: logoUrl }}
                                style={{ width: 44, height: 44, borderRadius: 22 }}
                                contentFit="cover"
                              />
                            ) : (
                              <View className="h-11 w-11 items-center justify-center rounded-full bg-sand">
                                <Text className="font-heading text-lg text-ink-muted">
                                  {hub.name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            
                            <View className="flex-1 min-w-0">
                              <View className="flex-row items-center gap-1">
                                <Text className="text-sm font-heading text-ink truncate font-semibold">{hub.name}</Text>
                                {hub.indigenous_led && (
                                  <View className="h-3.5 w-3.5 rounded-full bg-country-ochre items-center justify-center">
                                    <View className="h-2 w-2 rounded-full bg-country-red" />
                                  </View>
                                )}
                              </View>
                              <Text className="text-[10px] text-ink-faint mt-0.5 truncate">
                                {HUB_TYPE_LABELS[hub.type]}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-linen/30">
                            <Text className="text-[10px] text-ink-muted truncate flex-1">
                              {place || "Australia"}
                            </Text>
                            <Icon name="arrow-right" size={14} color={colors.inkFaint} />
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <EmptyCard
                  title="No hubs matching"
                  body="Try modifying your state or category filters."
                  action="Create a page"
                  onPress={() => router.push("/create/hub")}
                />
              )}
            </View>

          </View>
        </>
      ) : (
        <>
          {/* My Council Board View */}
          {!location.councilId ? (
            <Card className="p-8 items-center justify-center gap-4 border border-linen bg-card rounded-3xl mt-4">
              <View className="h-14 w-14 rounded-full bg-pink-50 items-center justify-center">
                <Icon name="map-pin" size={24} color={colors.pink} />
              </View>
              <View className="items-center gap-1">
                <Text className="font-display text-xl text-ink text-center">Unlock Local Discoveries</Text>
                <Text className="font-sans text-xs text-ink-muted text-center max-w-[320px]">
                  Detect your current council area to view local events, communities, and council resources on your doorstep.
                </Text>
              </View>
              <Button
                label={detecting ? "Locating..." : "Detect my location"}
                variant="primary"
                size="sm"
                leftIcon={detecting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="map-pin" size={14} color="#FFFFFF" />}
                onPress={handleDetect}
                disabled={detecting}
              />
            </Card>
          ) : councilLoading ? (
            <Card className="p-10 items-center justify-center mt-4">
              <ActivityIndicator size="large" color={colors.pink} />
              <Text variant="caption" tone="faint" className="mt-3">Fetching local council coordinates...</Text>
            </Card>
          ) : councilDetails ? (
            <View className="mt-4 gap-6">              {/* Council details card */}
              <View className="rounded-2xl border border-linen bg-card p-6 gap-4 shadow-card">
                <View className="flex-row items-center gap-2">
                  <Icon name="map-pin" size={16} color={colors.pink} />
                  <Text variant="overline" tone="pink" className="text-2xs font-bold tracking-widest text-pink-600">
                    Local Government Area
                  </Text>
                </View>
                <Text className="font-display text-3xl text-ink font-extrabold">
                  {councilDetails.name}
                </Text>
                
                {/* Traditional Custodians Acknowledgement */}
                {councilDetails.traditional_custodians && councilDetails.traditional_custodians.length > 0 ? (
                  <View className="flex-row items-center gap-2.5 bg-country-ochre/5 border border-country-ochre/25 p-4 rounded-2xl">
                    <View className="h-1.5 w-1.5 rounded-full bg-country-red" />
                    <Text className="text-xs text-country-red font-heading tracking-wide leading-5 flex-1">
                      We acknowledge the {councilDetails.traditional_custodians.join(" and ")} people, the Traditional Custodians of this land. We pay our respects to Elders past, present and emerging.
                    </Text>
                  </View>
                ) : null}

                <View className="flex-row gap-8 mt-1 border-t border-linen/30 pt-4">
                  <View>
                    <Text variant="title" className="font-display font-extrabold text-ink">{(councilEvents ?? []).length}</Text>
                    <Text className="text-[9px] font-heading uppercase tracking-wider text-ink-muted mt-0.5">Events Active</Text>
                  </View>
                  <View>
                    <Text variant="title" className="font-display font-extrabold text-ink">{(councilHubs ?? []).length}</Text>
                    <Text className="text-[9px] font-heading uppercase tracking-wider text-ink-muted mt-0.5">Hubs Affiliated</Text>
                  </View>
                  {councilDetails.population ? (
                    <View>
                      <Text variant="title" className="font-display font-extrabold text-ink">{councilDetails.population.toLocaleString()}</Text>
                      <Text className="text-[9px] font-heading uppercase tracking-wider text-ink-muted mt-0.5">Estimated Pop.</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Two-column dashboard for local council */}
              <View className="gap-8 lg:flex-row lg:items-start lg:gap-10">
                
                {/* Left Column: Events in the council */}
                <View className="flex-1 gap-6">
                  <View className="border-b border-linen pb-2">
                    <Text className="font-display text-lg text-ink tracking-tight">Events in {councilDetails.name}</Text>
                  </View>

                  {councilEventsLoading ? (
                    <Text variant="caption" tone="faint">Loading local calendar...</Text>
                  ) : councilEvents && councilEvents.length > 0 ? (
                    <View className="gap-5">
                      {groupedCouncilEvents.map((group) => (
                        <View key={group.dateLabel} className="gap-1.5">
                          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
                            {group.dateLabel}
                          </Text>
                          <View className="gap-0.5">
                            {group.items.map((event) => {
                              const coverUrl = event.images?.find((img: any) => img.type === "cover")?.url ?? event.images?.[0]?.url ?? null;
                              const formattedTime = event.start_time
                                ? new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(event.start_time))
                                : "";
                              return (
                                <Pressable
                                  key={event.id}
                                  onPress={() => router.push(`/event/${event.id}`)}
                                  className="flex-row items-center gap-4 py-3 border-b border-linen/25 active:opacity-75"
                                >
                                  <View className="w-16">
                                    <Text className="text-xs font-heading text-ink-muted">{formattedTime}</Text>
                                  </View>
                                  <View className="h-10 w-10 rounded-lg overflow-hidden bg-sand">
                                    {coverUrl ? (
                                      <Image source={{ uri: coverUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                                    ) : (
                                      <View className="flex-1 items-center justify-center bg-sand">
                                        <Icon name="calendar" size={14} color={colors.inkFaint} />
                                      </View>
                                    )}
                                  </View>
                                  <View className="flex-1 min-w-0">
                                    <Text className="text-sm font-heading text-ink truncate">{event.title}</Text>
                                    <Text className="text-[11px] text-ink-faint mt-0.5 truncate">
                                      By {event.hub?.name || "Independent"} · {[event.location_city, event.location_state].filter(Boolean).join(", ")}
                                    </Text>
                                  </View>
                                  <Icon name="arrow-right" size={14} color={colors.inkFaint} />
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <EmptyCard
                      title="No local events yet"
                      body="Be the first to list a cultural event in this local government area!"
                      action="Create event"
                      onPress={() => router.push(`/create/event?councilId=${councilDetails.id}`)}
                    />
                  )}
                </View>

                {/* Right Column: Hubs in the council */}
                <View className="w-full lg:w-[320px] gap-6">
                  <View className="border-b border-linen pb-2">
                    <Text className="font-display text-lg text-ink tracking-tight">Local active hubs</Text>
                  </View>

                  {councilHubsLoading ? (
                    <Text variant="caption" tone="faint">Loading local hubs...</Text>
                  ) : councilHubs && councilHubs.length > 0 ? (
                    <View className="gap-1">
                      {councilHubs.map((hub) => {
                        const images = (hub.images ?? []).filter((img: any) => img && img.url);
                        const logoUrl =
                          images.find((img: any) => img.type === "logo")?.url ??
                          images.find((img: any) => img.type !== "logo")?.url ??
                          images[0]?.url ??
                          null;
                        return (
                          <Pressable
                            key={hub.slug}
                            onPress={() => router.push(`/hub/${hub.slug}`)}
                            className="flex-row items-center gap-3 py-2.5 border-b border-linen/15 active:opacity-75"
                          >
                            {logoUrl ? (
                              <Image source={{ uri: logoUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
                            ) : (
                              <View className="h-9 w-9 items-center justify-center rounded-full bg-sand">
                                <Text className="font-heading text-sm text-ink-muted">{hub.name.charAt(0).toUpperCase()}</Text>
                              </View>
                            )}
                            <View className="flex-1 min-w-0">
                              <Text className="text-xs font-heading text-ink truncate">{hub.name}</Text>
                              <Text className="text-[10px] text-ink-faint mt-0.5 truncate">{HUB_TYPE_LABELS[hub.type]}</Text>
                            </View>
                            <Icon name="arrow-right" size={13} color={colors.inkFaint} />
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <EmptyCard
                      title="No local hubs yet"
                      body="Create a community hub or local organiser profile for this council area!"
                      action="Create hub"
                      onPress={() => router.push("/create/hub")}
                    />
                  )}
                </View>

              </View>
            </View>
          ) : (
            <Card className="p-6 items-center mt-4">
              <Text variant="caption" tone="muted">Selected council not found in database.</Text>
            </Card>
          )}
        </>
      )}

      <Footer className="mt-12 border-t border-linen pt-8" />
    </Screen>
  );
}
