import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { supabase } from "@/lib/supabase/client";

import {
  Screen,
  Text,
  Input,
  Button,
  Card,
  Footer,
  Icon,
  type IconName,
  LocationPicker,
  ANYWHERE,
  MultiSelectFilter,
  Carousel,
  SectionHeader,
  EmptyCard,
} from "@/components/ui";
import { FirstNationsToggle } from "@/components/cultural/FirstNationsToggle";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { useHubs } from "@/features/hubs/api";
import { EventCard } from "@/features/events/EventCard";
import { FeaturedEventCard } from "@/features/events/FeaturedEventCard";
import { useEvents } from "@/features/events/api";
import { useMyProfile, useUpdateMyProfile } from "@/features/profiles/api";
import { parsePreferences } from "@/lib/validation/profile";
import { useSavedLocation } from "@/features/reference/useSavedLocation";
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

const CATEGORY_ICONS: Record<EventType, string> = {
  event: "calendar",
  activity: "compass",
  workshop: "edit",
  art: "palette",
  movie: "film",
  dining: "food",
  shopping: "bag",
  offer: "star",
  classes_gym: "dumbbell",
  travel: "globe",
  other: "grid",
};

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
  const [detecting, setDetecting] = useState(false);
  const [councilDetails, setCouncilDetails] = useState<any>(null);
  const [councilLoading, setCouncilLoading] = useState(false);

  const STATE_NAME_TO_CODE: Record<string, string> = {
    "new south wales": "NSW",
    "victoria": "VIC",
    "queensland": "QLD",
    "western australia": "WA",
    "south australia": "SA",
    "tasmania": "TAS",
    "australian capital territory": "ACT",
    "northern territory": "NT",
  };

  const detectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`
          );
          if (!res.ok) throw new Error("reverse-geocode");
          const geo = await res.json();
          
          const stateName = geo.address?.state?.toLowerCase();
          const county = geo.address?.county || geo.address?.city_district || geo.address?.city;
          
          if (!stateName || !county) {
            throw new Error("incomplete-address");
          }

          const stateCode = STATE_NAME_TO_CODE[stateName];
          if (!stateCode) {
            throw new Error("unsupported-state");
          }

          const { data: councilsData } = await supabase
            .from("australian_councils")
            .select("*")
            .eq("state_code", stateCode);

          if (!councilsData || councilsData.length === 0) {
            throw new Error("no-councils-in-state");
          }

          const cleanCounty = county.toLowerCase().replace("council", "").replace("city of", "").trim();
          const matchedCouncil = councilsData.find((c) => {
            const cleanName = c.name.toLowerCase().replace("council", "").replace("city of", "").trim();
            return cleanName.includes(cleanCounty) || cleanCounty.includes(cleanName);
          }) || councilsData[0];

          if (!matchedCouncil) {
            throw new Error("no-matched-council");
          }

          setLocation({
            state: stateCode as StateCode,
            councilId: matchedCouncil.id,
            label: matchedCouncil.name,
          });
        } catch (err) {
          console.error(err);
          alert("Could not automatically resolve your local council. Please select manually.");
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.error(error);
        alert("Permission denied or location unavailable.");
        setDetecting(false);
      }
    );
  };

  useEffect(() => {
    if (!location.councilId) {
      setCouncilDetails(null);
      return;
    }
    let active = true;
    setCouncilLoading(true);
    supabase
      .from("australian_councils")
      .select("id, name, slug, state_code, is_metro, population, traditional_custodians")
      .eq("id", location.councilId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) {
          setCouncilDetails(data);
        }
        if (active) {
          setCouncilLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [location.councilId]);

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

  const categoryEvents = categories.length
    ? (events ?? []).filter((e) => categories.includes(e.type))
    : events ?? [];

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

  const locationLabel = location.label !== "Anywhere" ? location.label : "Australia";

  return (
    <Screen contentClassName="pt-4 md:pt-6" maxWidth="content">
      
      {/* Eventbrite-Style Hero Banner */}
      <View className="rounded-3xl border border-linen bg-sand/15 p-6 md:p-10 gap-5 mt-2">
        <View className="gap-2 max-w-xl">
          <Text className="font-display text-3xl md:text-5xl text-ink font-extrabold tracking-tight leading-none">
            Find your next experience
          </Text>
          <Text className="font-sans text-xs md:text-sm text-ink-muted">
            Explore curated cultural events, local gatherings, and active community groups in {locationLabel}.
          </Text>
        </View>

        {/* Floating Search & Location bar */}
        <View className="flex-col md:flex-row items-stretch md:items-center border border-linen bg-card rounded-2xl md:rounded-full px-4 py-2 md:py-0 h-auto md:h-14 gap-3 shadow-subtle w-full max-w-3xl mt-2">
          <View className="flex-1 flex-row items-center h-10 md:h-full">
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search events, organizers..."
              returnKeyType="search"
              autoCorrect={false}
              leftIcon={<Icon name="search" size={16} color={colors.inkFaint} />}
              containerClassName="border-0 bg-transparent h-full px-0 flex-1"
              className="text-sm font-sans"
            />
          </View>

          {/* Vertical divider */}
          <View className="hidden md:block w-[1px] h-6 bg-linen/70 mx-1" />

          {/* Location picker */}
          <View className="flex-row items-center h-10 md:h-full pr-1">
            <View className="mr-1.5">
              <Icon name="map-pin" size={14} color={colors.inkFaint} />
            </View>
            <LocationPicker
              value={location}
              onChange={setLocation}
              className="h-full border-0 bg-transparent px-0 active:bg-transparent"
            />
          </View>
        </View>
      </View>

      {/* Clean Horizontal Filter Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: "center", gap: 6, paddingRight: 20 }}
        className="-mx-gutter px-gutter mt-5"
      >
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
          label="Page type"
          icon="grid"
          options={HUB_TYPES as readonly string[]}
          labels={HUB_TYPE_LABELS as Record<string, string>}
          selected={hubTypes as string[]}
          onChange={(next) => setHubTypes(next as HubType[])}
        />
        <FirstNationsToggle active={firstNations} onPress={() => setFirstNations((v) => !v)} />
        
        {activeFilterCount > 0 ? (
          <Button label="Clear filters" variant="outline" size="sm" className="h-8 px-2.5 rounded-lg" onPress={clearFilters} />
        ) : null}
      </ScrollView>

      {/* Eventbrite-Style Circular Category Browser */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-6 px-gutter py-2.5"
        className="-mx-gutter px-gutter mt-5"
      >
        {EVENT_TYPES.map((type) => {
          const on = categories.includes(type);
          const icon = CATEGORY_ICONS[type] || "calendar";
          return (
            <Pressable
              key={type}
              onPress={() => toggleCategory(type)}
              className="items-center gap-2 active:scale-95 transition-transform duration-100"
            >
              <View
                className={cn(
                  "h-14 w-14 rounded-full items-center justify-center border-2 shadow-sm",
                  on
                    ? "bg-ink border-ink"
                    : "bg-card border-linen active:bg-sand"
                )}
              >
                <Icon
                  name={icon as IconName}
                  size={22}
                  color={on ? colors.paper : colors.ink}
                />
              </View>
              <Text
                className={cn(
                  "text-[10px] font-heading text-center tracking-tight",
                  on ? "text-ink font-semibold" : "text-ink-muted"
                )}
              >
                {EVENT_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Home Switcher Tabs */}
      <View className="flex-row gap-6 border-b border-linen mt-6 mb-4">
        <Pressable onPress={() => setHomeTab("discover")} className="items-center">
          <Text className={cn("pb-2 font-heading text-sm", homeTab === "discover" ? "text-ink font-semibold" : "text-ink-faint")}>
            Discover Feed
          </Text>
          <View className={cn("h-0.5 w-full rounded-pill", homeTab === "discover" ? "bg-ochre-500" : "bg-transparent")} />
        </Pressable>
        <Pressable onPress={() => setHomeTab("council")} className="items-center">
          <Text className={cn("pb-2 font-heading text-sm", homeTab === "council" ? "text-ink font-semibold" : "text-ink-faint")}>
            My Council
          </Text>
          <View className={cn("h-0.5 w-full rounded-pill", homeTab === "council" ? "bg-ochre-500" : "bg-transparent")} />
        </Pressable>
      </View>

      {homeTab === "discover" ? (
        <>
          {/* Curated featured slider */}
          {featured.length > 0 ? (
            <View className="mt-4 gap-4">
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

          {/* First Nations acknowledgement banner */}
          {showFnSection ? (
            <View className="mt-8 rounded-3xl border border-country-ochre/25 bg-country-ochre/5 p-5 gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <View className="h-1.5 w-1.5 rounded-full bg-country-red" />
                  <View className="h-1.5 w-1.5 rounded-full bg-country-ochre" />
                  <Text className="text-[10px] font-heading uppercase tracking-widest text-country-red">
                    First Nations Spotlight
                  </Text>
                </View>
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
                      className="w-[280px] bg-card border border-linen p-3 rounded-2xl flex-row items-center gap-3"
                    >
                      {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                      ) : (
                        <View className="h-9 w-9 rounded-full bg-sand items-center justify-center" />
                      )}
                      <View className="flex-1 min-w-0">
                        <Text className="text-xs font-heading text-ink truncate">{hub.name}</Text>
                        <Text className="text-[10px] text-ink-faint truncate">{HUB_TYPE_LABELS[hub.type]}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </Carousel>
            </View>
          ) : null}

          {/* Main Two-Column Layout */}
          <View className="mt-8 gap-8 lg:flex-row lg:items-start lg:gap-10">
            
            {/* Left Column: Grouped Calendar List (Luma Style) */}
            <View className="flex-1 gap-6">
              
              {/* For You events feed */}
              {hasForYou ? (
                <View className="gap-3">
                  <SectionHeader eyebrow="Tailored to you" title="Recommended" />
                  <View className="gap-3 md:flex-row md:flex-wrap">
                    {forYouEvents.slice(0, 4).map((event) => (
                      <View key={event.id} className="w-full md:w-[calc(50%-6px)]">
                        <EventCard event={event} />
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Eventbrite-Style Grid listing */}
              {comingUp.length > 0 ? (
                <View className="gap-6">
                  <View className="flex-row items-center justify-between border-b border-linen pb-2">
                    <Text className="font-display text-lg text-ink tracking-tight">Upcoming events</Text>
                    <Button
                      label="Calendar view"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onPress={() => router.push("/calendar")}
                    />
                  </View>

                  <View className="flex-row flex-wrap gap-5 mt-2">
                    {comingUp.map((event) => (
                      <View key={event.id} className="w-full md:w-[calc(50%-10px)] lg:w-[calc(50%-10px)]">
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

            </View>

            {/* Right Column: Calendars & Hubs List (Luma Style) */}
            <View className="w-full lg:w-[320px] gap-6">
              <View className="gap-3">
                <View className="flex-row items-end justify-between border-b border-linen pb-2">
                  <Text className="font-display text-lg text-ink tracking-tight">Active hubs</Text>
                  <Button
                    label="My hubs"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onPress={() => router.push("/my-hubs")}
                  />
                </View>

                {/* Quick Hub Purpose scroll */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-1.5 pr-4"
                  className="-mx-gutter px-gutter"
                >
                  {HUB_TYPES.map((type) => {
                    const on = hubTypes.includes(type);
                    return (
                      <Pressable
                        key={type}
                        onPress={() => toggleHubType(type)}
                        className={cn(
                          "rounded px-2.5 py-1 border active:opacity-85",
                          on ? "border-ink bg-ink" : "border-linen/70 bg-card"
                        )}
                      >
                        <Text className={cn("text-[10px] font-heading uppercase tracking-wider", on ? "text-paper" : "text-ink-muted")}>
                          {HUB_TYPE_LABELS[type].split(" ")[0]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Hubs Listing */}
                {hubsLoading ? (
                  <Card className="p-4 items-center"><Text variant="caption" tone="faint">Loading hubs...</Text></Card>
                ) : hubsError ? (
                  <Card className="p-4 items-center"><Text variant="caption" tone="muted">Could not load hubs.</Text></Card>
                ) : hubResults.length > 0 ? (
                  <View className="gap-1">
                    {hubResults.map((hub) => {
                      const images = (hub.images ?? []).filter((img: any) => img && img.url);
                      const logoUrl =
                        images.find((img: any) => img.type === "logo")?.url ??
                        images.find((img: any) => img.type !== "logo")?.url ??
                        images[0]?.url ??
                        null;
                      const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");

                      return (
                        <Pressable
                          key={hub.slug}
                          onPress={() => router.push(`/hub/${hub.slug}`)}
                          className="flex-row items-center gap-3 py-2.5 border-b border-linen/15 active:opacity-75"
                        >
                          {logoUrl ? (
                            <Image
                              source={{ uri: logoUrl }}
                              style={{ width: 36, height: 36, borderRadius: 18 }}
                              contentFit="cover"
                            />
                          ) : (
                            <View className="h-9 w-9 items-center justify-center rounded-full bg-sand">
                              <Text className="font-heading text-sm text-ink-muted">
                                {hub.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          
                          <View className="flex-1 min-w-0">
                            <View className="flex-row items-center gap-1">
                              <Text className="text-xs font-heading text-ink truncate">{hub.name}</Text>
                              {hub.indigenous_led && (
                                <View className="h-3 w-3 rounded-full bg-country-ochre items-center justify-center">
                                  <View className="h-1.5 w-1.5 rounded-full bg-country-red" />
                                </View>
                              )}
                            </View>
                            <Text className="text-[10px] text-ink-faint mt-0.5 truncate">
                              {HUB_TYPE_LABELS[hub.type]} · {place || "Australia"}
                            </Text>
                          </View>
                          
                          <Icon name="arrow-right" size={13} color={colors.inkFaint} />
                        </Pressable>
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
                onPress={detectLocation}
                disabled={detecting}
              />
            </Card>
          ) : councilLoading ? (
            <Card className="p-10 items-center justify-center mt-4">
              <ActivityIndicator size="large" color={colors.pink} />
              <Text variant="caption" tone="faint" className="mt-3">Fetching local council coordinates...</Text>
            </Card>
          ) : councilDetails ? (
            <View className="mt-4 gap-6">
              {/* Council details card */}
              <View className="rounded-3xl border border-linen bg-card p-6 gap-4">
                <View className="flex-row items-center gap-2">
                  <Icon name="map-pin" size={16} color={colors.pink} />
                  <Text variant="overline" tone="pink" className="text-2xs font-heading tracking-widest text-pink-600">
                    Local Government Area
                  </Text>
                </View>
                <Text className="font-display text-3xl text-ink tracking-tight">
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
                    <Text className="font-display text-xl text-ink">{(councilEvents ?? []).length}</Text>
                    <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted mt-0.5">Events Active</Text>
                  </View>
                  <View>
                    <Text className="font-display text-xl text-ink">{(councilHubs ?? []).length}</Text>
                    <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted mt-0.5">Hubs Affiliated</Text>
                  </View>
                  {councilDetails.population ? (
                    <View>
                      <Text className="font-display text-xl text-ink">{councilDetails.population.toLocaleString()}</Text>
                      <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted mt-0.5">Estimated Pop.</Text>
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
