import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Footer } from "@/components/ui/Footer";
import { Icon } from "@/components/ui/Icon";
import { LocationPicker, ANYWHERE, type LocationValue } from "@/components/ui/LocationPicker";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { useHubs } from "@/features/hubs/api";
import { EventCard } from "@/features/events/EventCard";
import { FeaturedEventCard } from "@/features/events/FeaturedEventCard";
import { useEvents } from "@/features/events/api";
import { useMyProfile } from "@/features/profiles/api";
import { parsePreferences } from "@/lib/validation/profile";
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

export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data: profile } = useMyProfile();

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState<LocationValue>(ANYWHERE);
  const [interests, setInterests] = useState<string[]>([]);
  const [categories, setCategories] = useState<EventType[]>([]);
  const [hubTypes, setHubTypes] = useState<HubType[]>([]);
  const [firstNations, setFirstNations] = useState(false);
  const query = search.trim();

  // Seed user saved location on startup
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
  const groupedEvents = groupEventsByDate(comingUp);

  return (
    <Screen contentClassName="pt-4 md:pt-6" maxWidth="content">
      
      {/* Luma-style Typographical Header */}
      <View className="gap-2">
        <Text className="font-display text-3xl md:text-4xl text-ink tracking-tight">
          Discover {locationLabel}
        </Text>
        <Text className="font-sans text-xs text-ink-faint">
          Curated events and active community calendars across the country.
        </Text>
      </View>

      {/* Unified Search & Location Bar (Luma style) */}
      <View className="mt-4 flex-col md:flex-row md:items-center border border-linen bg-card rounded-2xl md:rounded-full px-4 py-2 gap-2 shadow-subtle">
        <View className="flex-1 flex-row items-center">
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search events, hubs or organisers..."
            returnKeyType="search"
            autoCorrect={false}
            leftIcon={<Icon name="search" size={16} color={colors.inkFaint} />}
            containerClassName="border-0 bg-transparent h-9 px-0 flex-1"
            className="text-sm font-sans"
          />
        </View>

        {/* Vertical divider */}
        <View className="hidden md:block w-[1px] h-6 bg-linen/70 mx-1" />

        {/* Location selector */}
        <View className="flex-row items-center self-start md:self-auto">
          <LocationPicker
            value={location}
            onChange={setLocation}
            className="h-9 border-0 bg-transparent px-0 active:bg-transparent"
          />
        </View>
      </View>

      {/* Clean Horizontal Filter Bar */}
      <View className="flex-row flex-wrap items-center gap-1.5 mt-3">
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
          <Button label="Clear filters" variant="outline" size="sm" className="h-8 px-2.5 rounded-lg" onPress={clearFilters} />
        ) : null}
      </View>

      {/* Minimal Category tags */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-4 pt-1"
        className="-mx-gutter px-gutter mt-4"
      >
        {EVENT_TYPES.map((type) => {
          const on = categories.includes(type);
          return (
            <Pressable
              key={type}
              onPress={() => toggleCategory(type)}
              className={cn(
                "flex-row items-center gap-1.5 rounded-full border px-3 py-1 active:opacity-80",
                on ? "border-ink bg-ink" : "border-linen/70 bg-card"
              )}
            >
              <Text
                className={cn(
                  "text-[10px] font-heading uppercase tracking-wider",
                  on ? "text-paper" : "text-ink"
                )}
              >
                {EVENT_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Curated featured slider */}
      {featured.length > 0 ? (
        <View className="mt-8 gap-4">
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

          {/* Grouped upcoming listing */}
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

              <View className="gap-5">
                {groupedEvents.map((group) => (
                  <View key={group.dateLabel} className="gap-1.5">
                    {/* Date heading (Luma style) */}
                    <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
                      {group.dateLabel}
                    </Text>
                    
                    {/* List of events on this day */}
                    <View className="gap-0.5">
                      {group.items.map((event) => {
                        const coverUrl = event.images?.find((img: any) => img.type === "cover")?.url ?? event.images?.[0]?.url ?? null;
                        const place = [event.location_city, event.location_state].filter(Boolean).join(", ");
                        const formattedTime = event.start_time
                          ? new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(event.start_time))
                          : "";

                        return (
                          <Pressable
                            key={event.id}
                            onPress={() => router.push(`/event/${event.id}`)}
                            className="flex-row items-center gap-4 py-3 border-b border-linen/25 active:opacity-75"
                          >
                            {/* Time */}
                            <View className="w-16">
                              <Text className="text-xs font-heading text-ink-muted">
                                {formattedTime}
                              </Text>
                            </View>

                            {/* Thumbnail */}
                            <View className="h-10 w-10 rounded-lg overflow-hidden bg-sand">
                              {coverUrl ? (
                                <Image
                                  source={{ uri: coverUrl }}
                                  style={{ width: "100%", height: "100%" }}
                                  contentFit="cover"
                                />
                              ) : (
                                <View className="flex-1 items-center justify-center bg-sand">
                                  <Icon name="calendar" size={14} color={colors.inkFaint} />
                                </View>
                              )}
                            </View>

                            {/* Event details */}
                            <View className="flex-1 min-w-0">
                              <Text className="text-sm font-heading text-ink truncate">
                                {event.title}
                              </Text>
                              <Text className="text-[11px] text-ink-faint mt-0.5 truncate">
                                By {event.hub?.name || "Independent"} · {place || "Online"}
                              </Text>
                            </View>

                            {/* Attending count */}
                            <View className="flex-row items-center gap-2">
                              {event.rsvp_count ? (
                                <Text className="text-[10px] font-heading text-ink-muted bg-sand/60 px-2 py-0.5 rounded">
                                  {event.rsvp_count} going
                                </Text>
                              ) : null}
                              <Icon name="arrow-right" size={14} color={colors.inkFaint} />
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
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
                action="Create a hub"
                onPress={() => router.push("/create/hub")}
              />
            )}
          </View>
        </View>

      </View>

      <Footer className="mt-12 border-t border-linen pt-8" />
    </Screen>
  );
}

function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 pr-4"
      className="-mx-gutter px-gutter"
    >
      {children}
    </ScrollView>
  );
}

function FirstNationsToggle({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "h-8 flex-row items-center gap-1.5 self-start rounded-full border px-3",
        active ? "border-country-black bg-country-black" : "border-linen/70 bg-card active:bg-sand",
      )}
    >
      <View className="flex-row gap-0.5">
        <View className="h-1.5 w-1.5 rounded-pill bg-country-red" />
        <View className="h-1.5 w-1.5 rounded-pill bg-country-ochre" />
        <View className={cn("h-1.5 w-1.5 rounded-pill", active ? "bg-paper" : "bg-ink")} />
      </View>
      <Text className={cn("font-heading text-[10px] uppercase tracking-wide", active ? "text-paper" : "text-ink")}>
        First Nations
      </Text>
    </Pressable>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <View className="gap-0.5">
      <Text variant="overline" tone="pink" className="text-2xs font-heading tracking-widest text-pink-600">
        {eyebrow}
      </Text>
      <Text className="font-display text-lg text-ink tracking-tight">{title}</Text>
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
    <Card className="items-start gap-2 p-5 border border-linen rounded-2xl bg-card">
      <Text className="font-heading text-sm text-ink">{title}</Text>
      <Text className="font-sans text-xs text-ink-muted leading-5">
        {body}
      </Text>
      <Button label={action} variant="whatsapp" size="sm" className="h-8 px-3 rounded-lg mt-1" onPress={onPress} />
    </Card>
  );
}
