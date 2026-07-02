import { useEffect, useMemo, useState, useRef } from "react";
import { Pressable, ScrollView, View, ActivityIndicator, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { Screen, Text, Input, Button, Card, Footer, Icon, Badge, LocationPicker, Skeleton, useToast } from "@/components/ui";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { useHubs } from "@/features/hubs/api";
import { useEvents } from "@/features/events/api";
import { EventCard } from "@/features/events/EventCard";
import { SkeletonCard } from "@/features/hubs/components/CommunityCard";
import { useMyProfile, useUpdateMyProfile } from "@/features/profiles/api";
import { useSavedLocation } from "@/features/reference/useSavedLocation";
import { useCouncilDetails, useDetectCouncil, useUpdateCouncil } from "@/features/reference/api";
import { parsePreferences } from "@/lib/validation/profile";
import { groupEventsByDate } from "@/lib/utils/time";
import { HUB_TYPE_LABELS, type HubType, type StateCode } from "@/lib/constants";

function getCountdownString(startTime: Date | null | string): string {
  if (!startTime) return "";
  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 0) return "";

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return `Starts in ${diffDays}d ${diffHours}h ${diffMins}m`;
  }
  if (diffHours > 0) {
    return `Starts in ${diffHours}h ${diffMins}m`;
  }
  return `Starts in ${diffMins}m`;
}

export default function MyCouncilScreen() {
  const router = useRouter();
  const { location, setLocation } = useSavedLocation();
  const { data: profile } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const toast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "events" | "venues" | "businesses" | "community">("all");

  // Council detection + details flow through the shared, cached data layer.
  const { detect, detecting } = useDetectCouncil();
  const { data: councilDetails, isLoading: councilLoading } = useCouncilDetails(
    location.councilId ?? undefined,
  );
  const updateCouncil = useUpdateCouncil();

  const isAdmin = profile?.is_admin ?? false;

  // Admin edit-form state.
  const [isEditing, setIsEditing] = useState(false);
  const [editTraditionalCustodians, setEditTraditionalCustodians] = useState("");
  const [editPopulation, setEditPopulation] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editIsMetro, setEditIsMetro] = useState(false);

  // Debounce the search box → query key (300ms) so we don't refetch per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleDetect = async () => {
    try {
      setLocation(await detect());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't detect your location.");
    }
  };

  const openEdit = () => {
    if (!councilDetails) return;
    setEditTraditionalCustodians((councilDetails.traditional_custodians ?? []).join(", "));
    setEditPopulation(councilDetails.population?.toString() ?? "");
    setEditWebsite(councilDetails.website ?? "");
    setEditLogoUrl(councilDetails.logo_url ?? "");
    setEditIsMetro(councilDetails.is_metro);
    setIsEditing(true);
  };

  const handleSaveChanges = async () => {
    if (!councilDetails) return;
    try {
      const custodiansArray = editTraditionalCustodians
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await updateCouncil.mutateAsync({
        id: councilDetails.id,
        traditionalCustodians: custodiansArray.length > 0 ? custodiansArray : null,
        population: parseInt(editPopulation, 10) || null,
        website: editWebsite.trim() || null,
        logoUrl: editLogoUrl.trim() || null,
        isMetro: editIsMetro,
      });
      toast.success("Council details updated.");
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update council details.");
    }
  };

  // Seed saved location on startup from profile onboarding preferences.
  const seededLocation = useRef(false);
  useEffect(() => {
    if (seededLocation.current || !profile) return;
    seededLocation.current = true;
    const loc = parsePreferences(profile.preferences).location;
    if (loc?.state && !location.councilId) {
      setLocation({ state: loc.state as StateCode, councilId: loc.councilId ?? undefined, label: loc.label });
    }
  }, [profile, setLocation, location.councilId]);

  // Sync local location selection back to the user's profile preferences (AWS).
  useEffect(() => {
    if (!profile) return;
    const currentPrefs = parsePreferences(profile.preferences);
    const dbLoc = currentPrefs.location;

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

  const { data: events, isLoading: eventsLoading } = useEvents({
    councilId: location.councilId ?? undefined,
    search: searchQuery || undefined,
  });

  const { data: hubs, isLoading: hubsLoading } = useHubs({
    councilId: location.councilId ?? undefined,
    search: searchQuery || undefined,
  });

  const allHubs = hubs ?? [];
  const allEvents = events ?? [];

  const {
    venues,
    businesses,
    community,
    liveEvents,
    upcomingEvents,
    pastEvents,
    groupedUpcomingEvents,
    spotlightEvent,
    secondaryEvents,
  } = useMemo(() => {
    const hubList = hubs ?? [];
    const eventList = events ?? [];

    const venues = hubList.filter((h) => h.type === "venue_space" || h.type === "wellness");
    const businesses = hubList.filter((h) => h.type === "business_shop_workshop");
    const community = hubList.filter(
      (h) =>
        h.type === "community_cultural_group" ||
        h.type === "club_society" ||
        h.type === "organisation_association_ngo_charity",
    );

    const now = new Date();
    const liveEvents = eventList.filter((e) => {
      if (!e.start_time) return false;
      const start = new Date(e.start_time);
      const end = e.end_time ? new Date(e.end_time) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
      return now >= start && now <= end;
    });
    const upcomingEvents = eventList.filter((e) => {
      if (!e.start_time) return false;
      return new Date(e.start_time) > now;
    });
    const pastEvents = eventList.filter((e) => {
      if (!e.start_time) return false;
      const start = new Date(e.start_time);
      const end = e.end_time ? new Date(e.end_time) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
      return now > end;
    });

    const activeEvents = [...liveEvents, ...upcomingEvents];
    const spotlightEvent =
      activeEvents.find(
        (e) => Array.isArray(e.images) && e.images.length > 0 && (e.images[0] as any)?.url,
      ) ?? activeEvents[0];

    return {
      venues,
      businesses,
      community,
      liveEvents,
      upcomingEvents,
      pastEvents,
      groupedUpcomingEvents: groupEventsByDate(upcomingEvents),
      spotlightEvent,
      secondaryEvents: activeEvents.filter((e) => e.id !== spotlightEvent?.id),
    };
  }, [hubs, events]);

  const feedLoading = eventsLoading || hubsLoading;
  const gridItemClass = "w-full md:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]";
  const cardGridSkeleton = (
    <View className="mt-2 flex-row flex-wrap gap-5" aria-busy>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} className={gridItemClass}>
          <SkeletonCard />
        </View>
      ))}
    </View>
  );

  return (
    <Screen contentClassName="pt-4 md:pt-6" maxWidth="content">
      {/* Header and Location selector */}
      <View className="flex-row flex-wrap items-center justify-between gap-4 border-b border-linen pb-5 mb-6">
        <View className="gap-1 flex-1">
          <Text variant="overline" tone="pink">
            Local Discovery Board
          </Text>
          <Text className="font-display text-3xl md:text-4xl text-ink tracking-tight font-bold">
            My Council
          </Text>
        </View>
        <LocationPicker value={location} onChange={setLocation} />
      </View>

      {!location.councilId ? (
        <Card className="p-8 items-center justify-center gap-6 border border-linen bg-card rounded-3xl mt-8 max-w-md mx-auto">
          <View className="h-16 w-16 rounded-full bg-pink/5 items-center justify-center border border-pink/15">
            <Icon name="map-pin" size={26} color={colors.pink} />
          </View>
          <View className="items-center gap-2">
            <Text className="font-display text-2xl text-ink text-center tracking-tight font-semibold">No Council Selected</Text>
            <Text className="font-sans text-xs text-ink-muted text-center leading-5 max-w-xs">
              Detect your location or choose an Australian Local Government Area to discover local events, wellness spaces, creative shops, and community networks.
            </Text>
          </View>
          <View className="flex-col gap-3 w-full pt-2">
            <Button
              label={detecting ? "Locating…" : "Detect my location"}
              variant="primary"
              leftIcon={detecting ? <ActivityIndicator size="small" color={colors.ink} /> : <Icon name="map-pin" size={14} color={colors.ink} />}
              onPress={handleDetect}
              disabled={detecting}
            />
            <View className="items-center mt-1 gap-2 w-full">
              <Text className="text-[10px] uppercase font-heading tracking-wider text-ink-faint">or search manually</Text>
              <LocationPicker value={location} onChange={setLocation} className="w-full justify-center" />
            </View>
          </View>
        </Card>
      ) : councilLoading ? (
        <View className="gap-6 lg:flex-row lg:items-stretch lg:gap-8" aria-busy>
          <View className="w-full lg:flex-[1.8]">
            <Card padded={false} className="gap-4 border border-linen bg-card p-6">
              <View className="flex-row items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <View className="flex-1 gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-2/3" />
                </View>
              </View>
              <View className="gap-2 border-t border-linen/30 pt-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </View>
            </Card>
          </View>
          <View className="flex-1">
            <Card padded={false} className="h-full gap-3 border border-linen bg-card p-6">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </Card>
          </View>
        </View>
      ) : councilDetails ? (
        <View className="gap-6">
          
          {/* Top Info Section: Council Identity and Country Acknowledgement */}
          <View className="gap-6 lg:flex-row lg:items-stretch lg:gap-8">
            <View className="w-full lg:flex-[1.8] gap-4">
              {/* EDIT FORM (Conditionally Rendered for Admin) */}
              {isEditing ? (
                <Card padded={false} className="border border-linen bg-card p-6 gap-4">
                  <View className="flex-row items-center justify-between border-b border-linen pb-3">
                    <Text className="font-display text-lg font-bold text-ink">Edit Council Info</Text>
                    <Pressable onPress={() => setIsEditing(false)} className="active:opacity-75">
                      <Icon name="close" size={18} color={colors.inkMuted} />
                    </Pressable>
                  </View>

                  <View className="gap-3.5">
                    <View className="gap-1">
                      <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted">Logo/Crest URL</Text>
                      <Input
                        value={editLogoUrl}
                        onChangeText={setEditLogoUrl}
                        placeholder="Crest image URL..."
                      />
                    </View>

                    <View className="gap-1">
                      <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted">Traditional Custodians</Text>
                      <Input
                        value={editTraditionalCustodians}
                        onChangeText={setEditTraditionalCustodians}
                        placeholder="Custodian tribes (comma separated)..."
                      />
                    </View>

                    <View className="gap-1">
                      <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted">Population</Text>
                      <Input
                        value={editPopulation}
                        onChangeText={setEditPopulation}
                        placeholder="Estimated pop. count..."
                        keyboardType="numeric"
                      />
                    </View>

                    <View className="gap-1">
                      <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted">Website</Text>
                      <Input
                        value={editWebsite}
                        onChangeText={setEditWebsite}
                        placeholder="https://..."
                      />
                    </View>

                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-xs text-ink-muted font-heading">Metropolitan Council</Text>
                      <Pressable
                        onPress={() => setEditIsMetro(!editIsMetro)}
                        className={cn(
                          "w-10 h-6 rounded-full p-1",
                          editIsMetro ? "bg-ochre-500 items-end" : "bg-linen items-start"
                        )}
                      >
                        <View className="h-4 w-4 rounded-full bg-card" />
                      </Pressable>
                    </View>
                  </View>

                  <View className="flex-col gap-2 mt-2">
                    <Button
                      label="Save Changes"
                      variant="primary"
                      size="sm"
                      loading={updateCouncil.isPending}
                      onPress={handleSaveChanges}
                    />
                    <Button
                      label="Cancel"
                      variant="ghost"
                      size="sm"
                      disabled={updateCouncil.isPending}
                      onPress={() => setIsEditing(false)}
                    />
                  </View>
                </Card>
              ) : (
                /* Council Identity & Stats Card */
                <Card padded={false} className="overflow-hidden border border-linen border-l-4 border-l-pink bg-card p-6 gap-6 h-full justify-between">
                  <View className="flex-col md:flex-row gap-6 items-stretch justify-between w-full">
                    {/* Left half: Council Info */}
                    <View className="flex-1 gap-4 justify-between">
                      <View className="flex-row items-start gap-4">
                        {councilDetails.logo_url ? (
                          <Image
                            source={{ uri: councilDetails.logo_url }}
                            style={{ width: 48, height: 48, borderRadius: 10 }}
                            contentFit="contain"
                            transition={150}
                          />
                        ) : (
                          <View className="h-12 w-12 items-center justify-center rounded-xl bg-sand">
                            <Icon name="globe" size={20} color={colors.inkMuted} />
                          </View>
                        )}

                        <View className="min-w-0 flex-1 gap-1.5">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-1 bg-pink/5 border border-pink/15 px-2 py-0.5 rounded-md">
                              <Icon name="map-pin" size={10} color={colors.pink} />
                              <Text variant="overline" tone="pink" className="text-[8px] font-heading tracking-widest text-pink-600 font-bold uppercase">
                                Active Board
                              </Text>
                            </View>
                            {isAdmin && (
                              <Pressable
                                onPress={openEdit}
                                className="flex-row items-center gap-1 bg-sand/60 border border-linen px-2 py-0.5 rounded-lg active:opacity-70"
                              >
                                <Icon name="settings" size={10} color={colors.inkMuted} />
                                <Text className="text-[9px] font-heading text-ink-muted">Edit</Text>
                              </Pressable>
                            )}
                          </View>

                          <Text className="font-display text-xl text-ink font-bold tracking-tight mt-1" numberOfLines={2}>
                            {councilDetails.name}
                          </Text>
                        </View>
                      </View>

                      <View className="gap-2 pt-3.5 border-t border-linen/25">
                        <View className="flex-row justify-between items-center">
                          <Text className="text-xs text-ink-faint font-sans">Jurisdiction</Text>
                          <Text className="text-xs font-semibold text-ink font-heading">{councilDetails.state_code} · {councilDetails.is_metro ? "Metro" : "Regional"}</Text>
                        </View>
                        {councilDetails.population && (
                          <View className="flex-row justify-between items-center">
                            <Text className="text-xs text-ink-faint font-sans">LGA Population</Text>
                            <Text className="text-xs font-semibold text-ink font-display">{councilDetails.population.toLocaleString()}</Text>
                          </View>
                        )}
                        {councilDetails.website && (
                          <View className="flex-row justify-between items-center">
                            <Text className="text-xs text-ink-faint font-sans">LGA Directory</Text>
                            <Pressable onPress={() => councilDetails.website && Linking.openURL(councilDetails.website)} className="active:opacity-75">
                              <Text className="text-xs font-heading text-pink underline truncate max-w-[140px]" numberOfLines={1}>
                                Visit Website
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Desktop Divider Stripe */}
                    <View className="hidden md:flex w-[1px] bg-linen/50 self-stretch my-1" />

                    {/* Right half: Stats grid */}
                    <View className="w-full md:w-[280px] gap-3 justify-center">
                      <View className="flex-row gap-3">
                        <View className="flex-1 bg-sand/30 border border-linen/40 p-3 rounded-xl gap-1">
                          <View className="flex-row items-center justify-between">
                            <Icon name="calendar" size={14} color={colors.pink} />
                            <Text className="text-[9px] font-heading uppercase text-ink-faint">Events</Text>
                          </View>
                          <Text className="text-xl font-display font-bold text-ink">{allEvents.length}</Text>
                        </View>

                        <View className="flex-1 bg-sand/30 border border-linen/40 p-3 rounded-xl gap-1">
                          <View className="flex-row items-center justify-between">
                            <Icon name="map-pin" size={14} color={colors.inkMuted} />
                            <Text className="text-[9px] font-heading uppercase text-ink-faint">Venues</Text>
                          </View>
                          <Text className="text-xl font-display font-bold text-ink">{venues.length}</Text>
                        </View>
                      </View>

                      <View className="flex-row gap-3">
                        <View className="flex-1 bg-sand/30 border border-linen/40 p-3 rounded-xl gap-1">
                          <View className="flex-row items-center justify-between">
                            <Icon name="globe" size={14} color={colors.inkMuted} />
                            <Text className="text-[9px] font-heading uppercase text-ink-faint">Shops</Text>
                          </View>
                          <Text className="text-xl font-display font-bold text-ink">{businesses.length}</Text>
                        </View>

                        <View className="flex-1 bg-sand/30 border border-linen/40 p-3 rounded-xl gap-1">
                          <View className="flex-row items-center justify-between">
                            <Icon name="settings" size={14} color={colors.inkMuted} />
                            <Text className="text-[9px] font-heading uppercase text-ink-faint">Groups</Text>
                          </View>
                          <Text className="text-xl font-display font-bold text-ink">{community.length}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>
              )}
            </View>

            {/* Acknowledgement of Country Card */}
            {councilDetails.traditional_custodians && councilDetails.traditional_custodians.length > 0 ? (
              <View className="flex-1">
                <Card padded={false} className="overflow-hidden border-2 border-country-ochre/40 bg-country-ochre/5 p-7 h-full justify-center gap-5 shadow-sm rounded-3xl relative">
                  {/* Decorative background circle emblem */}
                  <View className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-country-ochre/5 border border-country-ochre/10 items-center justify-center">
                    <View className="w-20 h-20 rounded-full bg-country-red/5 border border-country-red/10" />
                  </View>

                  <View className="flex-row items-center gap-3">
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-country-red shadow-xs">
                      <View className="h-2.5 w-2.5 rounded-full bg-country-ochre" />
                    </View>
                    <Text className="text-xs font-heading uppercase tracking-widest text-country-red font-bold">
                      Acknowledgement of Country
                    </Text>
                  </View>
                  <Text className="text-sm text-country-red font-sans leading-6 italic font-medium">
                    {"We acknowledge the "}{councilDetails.traditional_custodians.join(" and ")}{" people, the Traditional Custodians of the lands and waters across this region, and pay respect to Elders past, present and emerging. Sovereignty was never ceded."}
                  </Text>
                </Card>
              </View>
            ) : null}
          </View>

          {/* Quick Actions & Search Section */}
          <View className="flex-row flex-wrap items-center justify-between gap-4 mt-4 border-t border-linen pt-6">
            <View className="flex-row gap-2">
              <Button
                label="Create local event"
                variant="outline"
                size="sm"
                onPress={() => router.push(`/create/event?councilId=${councilDetails.id}`)}
              />
              <Button
                label="Register local hub"
                variant="ghost"
                size="sm"
                onPress={() => router.push("/create/hub")}
              />
            </View>
            <View
              className={cn(
                "h-11 w-full flex-row items-center rounded-full border bg-card px-3 md:w-[360px] md:px-4",
                searchFocused ? "border-teal-500 shadow-card" : "border-linen shadow-subtle",
              )}
            >
              <Input
                value={searchInput}
                onChangeText={setSearchInput}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={`Search ${councilDetails.name}…`}
                returnKeyType="search"
                autoCorrect={false}
                leftIcon={<Icon name="search" size={16} color={searchFocused ? colors.teal : colors.inkFaint} />}
                rightIcon={
                  searchInput.length > 0 ? (
                    <Pressable
                      onPress={() => setSearchInput("")}
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
                className="font-sans text-sm"
              />
            </View>
          </View>

          {/* Segmented Pill Tabs switcher */}
          <View className="mt-2 flex-row items-center self-start max-w-full overflow-hidden rounded-full border border-linen bg-card p-1">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
              <PillTabButton label="All Feed" active={activeTab === "all"} count={allEvents.length + allHubs.length} onPress={() => setActiveTab("all")} />
              <PillTabButton label="Calendar" active={activeTab === "events"} count={allEvents.length} onPress={() => setActiveTab("events")} />
              <PillTabButton label="Venues" active={activeTab === "venues"} count={venues.length} onPress={() => setActiveTab("venues")} />
              <PillTabButton label="Businesses" active={activeTab === "businesses"} count={businesses.length} onPress={() => setActiveTab("businesses")} />
              <PillTabButton label="Community" active={activeTab === "community"} count={community.length} onPress={() => setActiveTab("community")} />
            </ScrollView>
          </View>

          {/* Feed Content Area */}
          <View className="gap-6 mt-4 w-full">
            
            {/* Tab: All Feed */}
            {activeTab === "all" && (feedLoading ? (
              cardGridSkeleton
            ) : (
              <View className="gap-8">

                {/* Spotlight Hero Banner */}
                {spotlightEvent && (
                  <View className="gap-3">
                    <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted font-bold">
                      Featured Local Spotlight
                    </Text>
                    <SpotlightCard event={spotlightEvent} router={router} />
                  </View>
                )}

                {/* Calendar Board Section (Upgraded to 4-column EventCard grid) */}
                <View className="gap-4">
                  <View className="flex-row items-center justify-between border-b border-linen pb-2">
                    <Text className="font-display text-base text-ink font-semibold tracking-tight">Calendar Board</Text>
                    {secondaryEvents.length > 0 && (
                      <Pressable onPress={() => setActiveTab("events")} className="active:opacity-75">
                        <Text className="text-xs font-heading text-pink">View calendar</Text>
                      </Pressable>
                    )}
                  </View>
                  
                  {secondaryEvents.length > 0 ? (
                    <View className="flex-row flex-wrap gap-5 mt-2">
                      {secondaryEvents.slice(0, 4).map((event) => (
                        <View key={event.id} className="w-full md:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]">
                          <EventCard event={event} />
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text variant="caption" tone="faint" className="italic text-xs py-1">No other events listed.</Text>
                  )}
                </View>

                {/* Creative Hubs & Spaces Section (Upgraded to 4-column HubCard grid) */}
                <View className="gap-4">
                  <View className="border-b border-linen pb-2">
                    <Text className="font-display text-base text-ink font-semibold tracking-tight">Creative Hubs & Spaces</Text>
                  </View>

                  {allHubs.length > 0 ? (
                    <View className="flex-row flex-wrap gap-5 mt-2">
                      {allHubs.slice(0, 4).map((hub) => (
                        <View key={hub.id} className="w-full md:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]">
                          <HubCard hub={hub} router={router} />
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text variant="caption" tone="faint" className="italic text-xs py-1">No hubs registered in this area yet.</Text>
                  )}
                </View>
              </View>
            ))}
            {/* Tab: Events Calendar (Separated into Live, Upcoming, and Past sections) */}
            {activeTab === "events" && (
              <View className="gap-6">
                <View className="border-b border-linen pb-2">
                  <Text className="font-display text-base text-ink font-semibold tracking-tight">Events Calendar</Text>
                </View>
 
                {eventsLoading ? (
                  cardGridSkeleton
                ) : allEvents.length > 0 ? (
                  <View className="gap-8">
                    {/* 1. Live Now Section */}
                    {liveEvents.length > 0 && (
                      <View className="gap-3.5">
                        <View className="flex-row items-center gap-1.5 border-b border-linen pb-2">
                          <View className="h-2 w-2 rounded-full bg-emerald-500" />
                          <Text className="text-xs font-heading font-extrabold uppercase text-emerald-700 tracking-wider">
                            Live Now ({liveEvents.length})
                          </Text>
                        </View>
                        <View className="flex-row flex-wrap gap-5">
                          {liveEvents.map((event) => (
                            <View key={event.id} className="w-full md:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]">
                              <EventCard event={event} />
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
 
                    {/* 2. Upcoming local events grouped by date */}
                    {upcomingEvents.length > 0 && (
                      <View className="gap-4">
                        <View className="flex-row items-center gap-1.5 border-b border-linen pb-2">
                          <View className="h-2 w-2 rounded-full bg-pink" />
                          <Text className="text-xs font-heading font-extrabold uppercase text-ink-muted tracking-wider">
                            Upcoming Calendar ({upcomingEvents.length})
                          </Text>
                        </View>
                        <View className="gap-6">
                          {groupedUpcomingEvents.map((group) => (
                            <View key={group.dateLabel} className="gap-2">
                              <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted font-bold">
                                {group.dateLabel}
                              </Text>
                              <View className="flex-row flex-wrap gap-5 mt-1">
                                {group.items.map((event) => (
                                  <View key={event.id} className="w-full md:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]">
                                    <EventCard event={event} />
                                  </View>
                                ))}
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
 
                    {/* 3. Past local events section */}
                    {pastEvents.length > 0 && (
                      <View className="gap-3.5">
                        <View className="flex-row items-center gap-1.5 border-b border-linen pb-2">
                          <View className="h-2 w-2 rounded-full bg-ink-faint" />
                          <Text className="text-xs font-heading font-extrabold uppercase text-ink-faint tracking-wider">
                            Past Events ({pastEvents.length})
                          </Text>
                        </View>
                        <View className="flex-row flex-wrap gap-5">
                          {pastEvents.map((event) => (
                            <View key={event.id} className="w-full md:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]">
                              <EventCard event={event} />
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <EmptyCard
                    title="No events found"
                    body="Try clearing your search or list the first event in this council!"
                    action="Create event"
                    onPress={() => router.push(`/create/event?councilId=${councilDetails.id}`)}
                  />
                )}
              </View>
            )}

            {/* Tab: Venues (Upgraded to 4-column HubCard grid) */}
            {activeTab === "venues" && (
              <View className="gap-4">
                <View className="border-b border-linen pb-2">
                  <Text className="font-display text-base text-ink font-semibold tracking-tight">Venues, Galleries & Spaces</Text>
                </View>
                {hubsLoading ? (
                  cardGridSkeleton
                ) : venues.length > 0 ? (
                  <View className="flex-row flex-wrap gap-5 mt-2">
                    {venues.map((hub) => (
                      <View key={hub.id} className="w-full md:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]">
                        <HubCard hub={hub} router={router} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <EmptyCard
                    title="No venues registered"
                    body="Create a page for a local gallery, theatre, studio, or community space!"
                    action="Register space"
                    onPress={() => router.push("/create/hub")}
                  />
                )}
              </View>
            )}

            {/* Tab: Businesses (Upgraded to 4-column HubCard grid) */}
            {activeTab === "businesses" && (
              <View className="gap-4">
                <View className="border-b border-linen pb-2">
                  <Text className="font-display text-base text-ink font-semibold tracking-tight">Creative Businesses</Text>
                </View>
                {hubsLoading ? (
                  cardGridSkeleton
                ) : businesses.length > 0 ? (
                  <View className="flex-row flex-wrap gap-5 mt-2">
                    {businesses.map((hub) => (
                      <View key={hub.id} className="w-full md:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]">
                        <HubCard hub={hub} router={router} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <EmptyCard
                    title="No businesses registered"
                    body="Register a creative shop, local service, market organiser, or boutique business!"
                    action="Register business"
                    onPress={() => router.push("/create/hub")}
                  />
                )}
              </View>
            )}

            {/* Tab: Community (Upgraded to 4-column HubCard grid) */}
            {activeTab === "community" && (
              <View className="gap-4">
                <View className="border-b border-linen pb-2">
                  <Text className="font-display text-base text-ink font-semibold tracking-tight">Community Groups & Collectives</Text>
                </View>
                {hubsLoading ? (
                  cardGridSkeleton
                ) : community.length > 0 ? (
                  <View className="flex-row flex-wrap gap-5 mt-2">
                    {community.map((hub) => (
                      <View key={hub.id} className="w-full md:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]">
                        <HubCard hub={hub} router={router} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <EmptyCard
                    title="No community hubs registered"
                    body="Be the first to create a hub for local clubs, sports groups, or advocacy networks!"
                    action="Register hub"
                    onPress={() => router.push("/create/hub")}
                  />
                )}
              </View>
            )}

          </View>
        </View>
      ) : (
        <Card className="p-6 items-center border border-linen mt-4">
          <Text variant="caption" tone="muted">Council not found in database.</Text>
        </Card>
      )}

      <Footer className="mt-12 border-t border-linen pt-8" />
    </Screen>
  );
}

function PillTabButton({
  label,
  active,
  count,
  onPress,
}: {
  label: string;
  active: boolean;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "h-9 flex-row items-center gap-1.5 rounded-full px-3.5 active:opacity-80",
        active ? "bg-ink shadow-subtle" : "bg-transparent hover:bg-sand/50",
      )}
    >
      <Text className={cn("font-heading text-xs", active ? "text-paper font-semibold" : "text-ink-muted")}>
        {label}
      </Text>
      <View className={cn("h-4 min-w-[16px] items-center justify-center rounded-full px-1", active ? "bg-paper/20" : "bg-sand")}>
        <Text className={cn("text-[9px] font-bold", active ? "text-paper" : "text-ink-muted")}>{count}</Text>
      </View>
    </Pressable>
  );
}

function SpotlightCard({ event, router }: { event: any; router: any }) {
  const coverUrl = event.images?.find((img: any) => img.type === "cover")?.url ?? event.images?.[0]?.url ?? null;
  const start = event.start_time ? new Date(event.start_time) : null;
  const formattedDate = start
    ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(start)
    : "No date scheduled";
  const countdownText = getCountdownString(start);

  return (
    <Card padded={false} className="overflow-hidden border border-linen bg-card rounded-3xl shadow-sm">
      <Pressable onPress={() => router.push(`/event/${event.id}`)} className="active:opacity-95 flex-col md:flex-row min-h-[220px]">
        {/* Image / Icon container */}
        <View className="w-full md:w-[55%] min-h-[200px] md:min-h-[220px] bg-sand relative overflow-hidden">
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={{ width: "100%", height: "100%", position: "absolute" }} contentFit="cover" transition={150} />
          ) : (
            <View className="absolute inset-0 items-center justify-center bg-sand">
              <Icon name="calendar" size={44} color={colors.inkFaint} />
            </View>
          )}
          {/* Badge Overlay */}
          <View className="absolute top-4 left-4 bg-pink px-3 py-1 rounded-full shadow-sm">
            <Text className="text-[10px] font-heading uppercase tracking-widest text-white font-bold">
              Featured Spotlight
            </Text>
          </View>
        </View>

        {/* Content Details Container */}
        <View className="w-full md:w-[45%] p-6 justify-between bg-card">
          <View className="gap-2.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-[9px] font-heading uppercase tracking-widest text-pink font-bold">
                LGA Highlight Event
              </Text>
              {event.rsvp_count ? (
                <Badge label={`${event.rsvp_count} RSVP'd`} variant="success" />
              ) : null}
            </View>

            <View className="gap-1">
              <Text className="font-display text-xl text-ink font-bold tracking-tight leading-6" numberOfLines={2}>
                {event.title}
              </Text>
              <Text className="text-xs text-ink-muted mt-0.5">
                {formattedDate}
              </Text>
              {countdownText ? (
                <View className="flex-row items-center gap-1.5 mt-2 bg-pink/5 border border-pink/15 px-2 py-0.5 rounded-md self-start">
                  <Icon name="clock" size={11} color={colors.pink} />
                  <Text className="text-[10px] font-semibold text-pink uppercase tracking-wider">
                    {countdownText}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="pt-4 border-t border-linen/30 mt-4 gap-3">
            <View className="flex-row items-center gap-2">
              {event.hub?.images?.[0]?.url ? (
                <Image source={{ uri: event.hub.images[0].url }} style={{ width: 24, height: 24, borderRadius: 12 }} contentFit="cover" />
              ) : (
                <View className="h-6 w-6 rounded-full bg-sand items-center justify-center">
                  <Text className="text-[10px] font-semibold text-ink-muted">H</Text>
                </View>
              )}
              <View className="flex-1 min-w-0">
                <Text className="text-xs font-semibold text-ink-muted truncate">By {event.hub?.name || "Independent Organizer"}</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1 bg-ink active:opacity-90 rounded-xl py-2.5 px-4 justify-center mt-1">
              <Text className="text-xs font-heading text-paper font-semibold">Discover Event</Text>
              <Icon name="arrow-right" size={12} color={colors.paper} />
            </View>
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

function HubCard({ hub, router }: { hub: any; router: any }) {
  const images = (hub.images ?? []).filter((img: any) => img && img.url);
  const logoUrl =
    images.find((img: any) => img.type === "logo")?.url ??
    images.find((img: any) => img.type !== "logo")?.url ??
    images[0]?.url ??
    null;
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");

  return (
    <Pressable
      onPress={() => router.push(`/hub/${hub.slug}`)}
      className="bg-card border border-linen p-4 rounded-2xl h-full justify-between active:opacity-75 shadow-sm"
    >
      <View className="flex-row items-center gap-3">
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} contentFit="cover" />
        ) : (
          <View className="h-11 w-11 items-center justify-center rounded-full bg-sand">
            <Text className="font-heading text-sm text-ink-muted">
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
            {HUB_TYPE_LABELS[hub.type as HubType]}
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
    <Card className="p-6 items-center gap-2 mt-2 border border-linen bg-card">
      <Text variant="subheading" className="text-sm font-semibold">{title}</Text>
      <Text className="text-xs text-ink-muted text-center max-w-xs leading-4">
        {body}
      </Text>
      <Button label={action} variant="secondary" size="sm" className="mt-2" onPress={onPress} />
    </Card>
  );
}
