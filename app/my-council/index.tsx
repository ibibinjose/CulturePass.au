import { useEffect, useState, useRef } from "react";
import { Pressable, ScrollView, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { supabase } from "@/lib/supabase/client";

import { Screen, Text, Input, Button, Card, Footer, Icon, Divider, Badge, LocationPicker } from "@/components/ui";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { useHubs } from "@/features/hubs/api";
import { useEvents } from "@/features/events/api";
import { useMyProfile, useUpdateMyProfile } from "@/features/profiles/api";
import { useSavedLocation } from "@/features/reference/useSavedLocation";
import { parsePreferences } from "@/lib/validation/profile";
import { HUB_TYPE_LABELS, type HubType, type StateCode } from "@/lib/constants";

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
      }).format(dateObj);
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

export default function MyCouncilScreen() {
  const router = useRouter();
  const { location, setLocation } = useSavedLocation();
  const { data: profile } = useMyProfile();
  const updateProfile = useUpdateMyProfile();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "events" | "venues" | "businesses" | "community">("all");

  const [detecting, setDetecting] = useState(false);
  const [councilDetails, setCouncilDetails] = useState<any>(null);
  const [councilLoading, setCouncilLoading] = useState(false);

  // Edit states for admins
  const [isEditing, setIsEditing] = useState(false);
  const [editTraditionalCustodians, setEditTraditionalCustodians] = useState("");
  const [editPopulation, setEditPopulation] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editIsMetro, setEditIsMetro] = useState(false);
  const [updating, setUpdating] = useState(false);

  const isAdmin = profile?.is_admin ?? false;

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

  const fetchCouncilDetails = (councilId: string) => {
    setCouncilLoading(true);
    supabase
      .from("australian_councils")
      .select("id, name, slug, state_code, is_metro, population, traditional_custodians, logo_url, website")
      .eq("id", councilId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCouncilDetails(data);
          // Sync edit states
          setEditTraditionalCustodians(data.traditional_custodians?.join(", ") ?? "");
          setEditPopulation(data.population?.toString() ?? "");
          setEditWebsite(data.website ?? "");
          setEditLogoUrl(data.logo_url ?? "");
          setEditIsMetro(data.is_metro ?? false);
        }
        setCouncilLoading(false);
      });
  };

  useEffect(() => {
    if (!location.councilId) {
      setCouncilDetails(null);
      return;
    }
    fetchCouncilDetails(location.councilId);
  }, [location.councilId]);

  // Seed user saved location on startup from profile onboarding preferences
  const seededLocation = useRef(false);
  useEffect(() => {
    if (seededLocation.current || !profile) return;
    seededLocation.current = true;
    const loc = parsePreferences(profile.preferences).location;
    if (loc?.state && !location.councilId) {
      setLocation({ state: loc.state as StateCode, councilId: loc.councilId ?? undefined, label: loc.label });
    }
  }, [profile, setLocation, location.councilId]);

  // Sync local location selection back to Supabase profile preferences
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

  const handleSaveChanges = async () => {
    if (!councilDetails) return;
    setUpdating(true);
    try {
      const custodiansArray = editTraditionalCustodians
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from("australian_councils")
        .update({
          traditional_custodians: custodiansArray.length > 0 ? custodiansArray : null,
          population: parseInt(editPopulation, 10) || null,
          website: editWebsite.trim() || null,
          logo_url: editLogoUrl.trim() || null,
          is_metro: editIsMetro,
        })
        .eq("id", councilDetails.id);

      if (error) throw error;
      
      // Refresh local copy
      fetchCouncilDetails(councilDetails.id);
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update council details.");
    } finally {
      setUpdating(false);
    }
  };

  const { data: events, isLoading: eventsLoading } = useEvents({
    councilId: location.councilId ?? undefined,
    search: searchQuery.trim() || undefined,
  });

  const { data: hubs, isLoading: hubsLoading } = useHubs({
    councilId: location.councilId ?? undefined,
    search: searchQuery.trim() || undefined,
  });

  const allHubs = hubs ?? [];
  const allEvents = events ?? [];

  // Filter hubs into categories
  const venues = allHubs.filter((h) => h.type === "venue_space" || h.type === "wellness");
  const businesses = allHubs.filter((h) => h.type === "business_shop_workshop");
  const community = allHubs.filter((h) => h.type === "community_cultural_group" || h.type === "club_society" || h.type === "organisation_association_ngo_charity");

  const filteredEvents = allEvents;
  const groupedCouncilEvents = groupEventsByDate(filteredEvents);

  // Spotlight: Select the first event with an image to act as the Hero spotlight
  const spotlightEvent = allEvents.find(
    (e) => Array.isArray(e.images) && e.images.length > 0 && (e.images[0] as any)?.url
  ) || allEvents[0];

  const secondaryEvents = allEvents.filter((e) => e.id !== spotlightEvent?.id);

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
          <View className="flex-col gap-2 w-full pt-2">
            <Button
              label={detecting ? "Locating..." : "Detect my location"}
              variant="primary"
              leftIcon={detecting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="map-pin" size={14} color="#FFFFFF" />}
              onPress={detectLocation}
              disabled={detecting}
            />
          </View>
        </Card>
      ) : councilLoading ? (
        <Card className="p-16 items-center justify-center border border-linen mt-4">
          <ActivityIndicator size="large" color={colors.pink} />
          <Text variant="caption" tone="faint" className="mt-4">
            Resolving council discovery board details...
          </Text>
        </Card>
      ) : councilDetails ? (
        <View className="gap-6">
          
          {/* Main Grid Layout: Left Column = Summaries & Acknowledgement, Right Column = Feed */}
          <View className="gap-8 lg:flex-row lg:items-start lg:gap-10">
            
            {/* Left Column: Council Identity, Stats, Country Acknowledgement */}
            <View className="w-full lg:w-[320px] gap-6">
              
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
                      loading={updating}
                      onPress={handleSaveChanges}
                    />
                    <Button
                      label="Cancel"
                      variant="ghost"
                      size="sm"
                      disabled={updating}
                      onPress={() => setIsEditing(false)}
                    />
                  </View>
                </Card>
              ) : (
                /* Council Identity & Stats Card */
                <Card padded={false} className="overflow-hidden border border-linen bg-card p-6 gap-5">
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

                    <View className="min-w-0 flex-1 gap-1">
                      <View className="flex-row items-center gap-1.5 justify-between">
                        <View className="flex-row items-center gap-1">
                          <Icon name="map-pin" size={11} color={colors.pink} />
                          <Text variant="overline" tone="pink" className="text-[9px] font-heading tracking-widest text-pink-600">
                            Active Board
                          </Text>
                        </View>
                        {isAdmin && (
                          <Pressable
                            onPress={() => setIsEditing(true)}
                            className="flex-row items-center gap-1 bg-sand/60 border border-linen px-2 py-0.5 rounded-lg active:opacity-70"
                          >
                            <Icon name="settings" size={10} color={colors.inkMuted} />
                            <Text className="text-[9px] font-heading text-ink-muted">Edit</Text>
                          </Pressable>
                        )}
                      </View>

                      <Text className="font-display text-xl text-ink font-bold tracking-tight" numberOfLines={2}>
                        {councilDetails.name}
                      </Text>
                    </View>
                  </View>

                  <Divider className="opacity-45" />

                  {/* Dashboard Stats */}
                  <View className="gap-3.5">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-ink-faint">Events Listed</Text>
                      <Badge label={allEvents.length.toString()} variant="neutral" />
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-ink-faint">Venues & Galleries</Text>
                      <Badge label={venues.length.toString()} variant="neutral" />
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-ink-faint">Creative Businesses</Text>
                      <Badge label={businesses.length.toString()} variant="neutral" />
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-ink-faint">Community Networks</Text>
                      <Badge label={community.length.toString()} variant="neutral" />
                    </View>
                    <View className="flex-row justify-between items-center border-t border-linen/25 pt-3">
                      <Text className="text-xs text-ink-faint">Jurisdiction</Text>
                      <Text className="text-xs font-semibold text-ink font-heading">{councilDetails.state_code} · {councilDetails.is_metro ? "Metro" : "Regional"}</Text>
                    </View>
                    {councilDetails.population && (
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs text-ink-faint">LGA Population</Text>
                        <Text className="text-xs font-semibold text-ink font-display">{councilDetails.population.toLocaleString()}</Text>
                      </View>
                    )}
                    {councilDetails.website && (
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs text-ink-faint">LGA Directory</Text>
                        <Pressable onPress={() => router.push(councilDetails.website)} className="active:opacity-75">
                          <Text className="text-xs font-heading text-pink underline truncate max-w-[140px]" numberOfLines={1}>
                            Visit Website
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </Card>
              )}

              {/* Acknowledgement of Country Card */}
              {councilDetails.traditional_custodians && councilDetails.traditional_custodians.length > 0 && (
                <Card padded={false} className="overflow-hidden border border-country-ochre/25 bg-country-ochre/5 p-5 gap-3.5">
                  <View className="flex-row items-center gap-2">
                    <View className="h-4 w-4 items-center justify-center rounded-full bg-country-red">
                      <View className="h-2 w-2 rounded-full bg-country-ochre" />
                    </View>
                    <Text className="text-[10px] font-heading uppercase tracking-widest text-country-red">
                      Acknowledgement of Country
                    </Text>
                  </View>
                  <Text className="text-xs text-country-red font-sans leading-5 italic">
                    {"We acknowledge the "}{councilDetails.traditional_custodians.join(" and ")}{" people, the Traditional Custodians of the lands and waters across this region, and pay respect to Elders past, present and emerging. Sovereignty was never ceded."}
                  </Text>
                </Card>
              )}

              {/* Quick Actions */}
              <View className="gap-2">
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
            </View>

            {/* Right Column: Search, Tab Switcher, Feed Content */}
            <View className="flex-1 gap-6">
              
              {/* Search Bar */}
              <Input
                placeholder={`Search events or hubs in ${councilDetails.name}...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                leftIcon={<Icon name="search" size={15} color={colors.inkMuted} />}
                clearButtonMode="while-editing"
                containerClassName="h-10 md:h-12 rounded-full border-linen/80"
                className="text-xs md:text-sm font-sans"
              />

              {/* Segmented Pill Tabs */}
              <View className="bg-sand/30 border border-linen p-1 rounded-2xl flex-row items-center">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                  <PillTabButton label="All Feed" active={activeTab === "all"} count={allEvents.length + allHubs.length} onPress={() => setActiveTab("all")} />
                  <PillTabButton label="Calendar" active={activeTab === "events"} count={allEvents.length} onPress={() => setActiveTab("events")} />
                  <PillTabButton label="Venues" active={activeTab === "venues"} count={venues.length} onPress={() => setActiveTab("venues")} />
                  <PillTabButton label="Businesses" active={activeTab === "businesses"} count={businesses.length} onPress={() => setActiveTab("businesses")} />
                  <PillTabButton label="Community" active={activeTab === "community"} count={community.length} onPress={() => setActiveTab("community")} />
                </ScrollView>
              </View>

              {/* Tab Contents */}
              <View className="gap-6">
                
                {/* Tab: All Feed */}
                {activeTab === "all" && (
                  <View className="gap-8">
                    
                    {/* Spotlight Hero Banner */}
                    {spotlightEvent && (
                      <View className="gap-3">
                        <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
                          Featured Local Spotlight
                        </Text>
                        <SpotlightCard event={spotlightEvent} router={router} />
                      </View>
                    )}

                    {/* Upcoming Calendar Row Grid */}
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
                        <View className="gap-1">
                          {secondaryEvents.slice(0, 4).map((event) => (
                            <EventRow key={event.id} event={event} router={router} />
                          ))}
                        </View>
                      ) : (
                        <Text variant="caption" tone="faint" className="italic text-xs py-1">No other events listed.</Text>
                      )}
                    </View>

                    {/* Creative Hubs Grid */}
                    <View className="gap-4">
                      <View className="border-b border-linen pb-2">
                        <Text className="font-display text-base text-ink font-semibold tracking-tight">Creative Hubs & Spaces</Text>
                      </View>

                      {allHubs.length > 0 ? (
                        <View className="gap-2">
                          {allHubs.slice(0, 5).map((hub) => (
                            <HubCard key={hub.id} hub={hub} router={router} />
                          ))}
                        </View>
                      ) : (
                        <Text variant="caption" tone="faint" className="italic text-xs py-1">No hubs registered in this area yet.</Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Tab: Events Calendar */}
                {activeTab === "events" && (
                  <View className="gap-4">
                    <View className="border-b border-linen pb-2">
                      <Text className="font-display text-base text-ink font-semibold tracking-tight">Events Calendar</Text>
                    </View>

                    {eventsLoading ? (
                      <ActivityIndicator size="small" color={colors.pink} />
                    ) : groupedCouncilEvents.length > 0 ? (
                      <View className="gap-6">
                        {groupedCouncilEvents.map((group) => (
                          <View key={group.dateLabel} className="gap-2">
                            <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
                              {group.dateLabel}
                            </Text>
                            <View className="gap-1">
                              {group.items.map((event) => (
                                <EventRow key={event.id} event={event} router={router} />
                              ))}
                            </View>
                          </View>
                        ))}
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

                {/* Tab: Venues */}
                {activeTab === "venues" && (
                  <View className="gap-4">
                    <View className="border-b border-linen pb-2">
                      <Text className="font-display text-base text-ink font-semibold tracking-tight">Venues, Galleries & Spaces</Text>
                    </View>
                    {hubsLoading ? (
                      <ActivityIndicator size="small" color={colors.pink} />
                    ) : venues.length > 0 ? (
                      <View className="gap-2">
                        {venues.map((hub) => (
                          <HubCard key={hub.id} hub={hub} router={router} />
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

                {/* Tab: Businesses */}
                {activeTab === "businesses" && (
                  <View className="gap-4">
                    <View className="border-b border-linen pb-2">
                      <Text className="font-display text-base text-ink font-semibold tracking-tight">Creative Businesses</Text>
                    </View>
                    {hubsLoading ? (
                      <ActivityIndicator size="small" color={colors.pink} />
                    ) : businesses.length > 0 ? (
                      <View className="gap-2">
                        {businesses.map((hub) => (
                          <HubCard key={hub.id} hub={hub} router={router} />
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

                {/* Tab: Community */}
                {activeTab === "community" && (
                  <View className="gap-4">
                    <View className="border-b border-linen pb-2">
                      <Text className="font-display text-base text-ink font-semibold tracking-tight">Community Groups & Collectives</Text>
                    </View>
                    {hubsLoading ? (
                      <ActivityIndicator size="small" color={colors.pink} />
                    ) : community.length > 0 ? (
                      <View className="gap-2">
                        {community.map((hub) => (
                          <HubCard key={hub.id} hub={hub} router={router} />
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
      className={cn(
        "px-4 py-2 rounded-xl active:opacity-85 flex-row items-center gap-1.5",
        active ? "bg-card border border-linen/80 shadow-xs" : "bg-transparent"
      )}
    >
      <Text className={cn("text-xs font-heading", active ? "text-ink font-semibold" : "text-ink-faint")}>
        {label}
      </Text>
      <View className={cn("px-1.5 py-0.5 rounded-full", active ? "bg-sand" : "bg-sand/40")}>
        <Text className="text-[9px] font-semibold text-ink-muted">{count}</Text>
      </View>
    </Pressable>
  );
}

function SpotlightCard({ event, router }: { event: any; router: any }) {
  const coverUrl = event.images?.find((img: any) => img.type === "cover")?.url ?? event.images?.[0]?.url ?? null;
  const formattedDate = event.start_time
    ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(new Date(event.start_time))
    : "No date scheduled";

  return (
    <Card padded={false} className="overflow-hidden border border-linen bg-card rounded-2xl">
      <Pressable onPress={() => router.push(`/event/${event.id}`)} className="active:opacity-95">
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={{ width: "100%", height: 180 }} contentFit="cover" transition={150} />
        ) : (
          <View className="w-full h-[180px] bg-sand items-center justify-center">
            <Icon name="calendar" size={32} color={colors.inkFaint} />
          </View>
        )}
        <View className="p-5 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-[10px] font-heading uppercase tracking-widest text-pink font-semibold">
              Event Highlight
            </Text>
            {event.rsvp_count ? (
              <Badge label={`${event.rsvp_count} RSVP'd`} variant="success" />
            ) : null}
          </View>

          <View className="gap-1">
            <Text className="font-display text-xl text-ink font-bold tracking-tight">
              {event.title}
            </Text>
            <Text className="text-xs text-ink-muted">
              {formattedDate}
            </Text>
          </View>

          <Divider className="opacity-30" />

          <View className="flex-row items-center gap-3">
            {event.hub?.images?.[0]?.url ? (
              <Image source={{ uri: event.hub.images[0].url }} style={{ width: 28, height: 28, borderRadius: 8 }} contentFit="cover" />
            ) : (
              <View className="h-7 w-7 rounded bg-sand items-center justify-center">
                <Text className="text-2xs font-semibold text-ink-muted">H</Text>
              </View>
            )}
            <View className="flex-1 min-w-0">
              <Text className="text-xs font-semibold text-ink truncate">Hosted by {event.hub?.name || "Independent Organizer"}</Text>
            </View>
            <Icon name="arrow-right" size={14} color={colors.inkMuted} />
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

function EventRow({ event, router }: { event: any; router: any }) {
  const coverUrl = event.images?.find((img: any) => img.type === "cover")?.url ?? event.images?.[0]?.url ?? null;
  const formattedTime = event.start_time
    ? new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(event.start_time))
    : "";
  const place = [event.location_city, event.location_state].filter(Boolean).join(", ");

  return (
    <Pressable
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
        <Text className="text-xs font-heading text-ink truncate">{event.title}</Text>
        <Text className="text-[10px] text-ink-faint mt-0.5 truncate">
          By {event.hub?.name || "Independent"} · {place || "Online"}
        </Text>
      </View>
      {event.rsvp_count ? (
        <Text className="text-[9px] font-heading text-ink-muted bg-sand/60 px-2 py-0.5 rounded mr-1">
          {event.rsvp_count} going
        </Text>
      ) : null}
      <Icon name="arrow-right" size={12} color={colors.inkFaint} />
    </Pressable>
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
    <Card padded={false} className="border border-linen bg-card p-4">
      <Pressable
        onPress={() => router.push(`/hub/${hub.slug}`)}
        className="flex-row items-center gap-3.5 active:opacity-75"
      >
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={{ width: 44, height: 44, borderRadius: 11 }} contentFit="cover" />
        ) : (
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-sand">
            <Text className="font-heading text-sm text-ink-muted font-bold">{hub.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs font-heading text-ink font-semibold truncate">{hub.name}</Text>
            {hub.indigenous_led && (
              <View className="h-3 w-3 rounded-full bg-country-ochre items-center justify-center">
                <View className="h-1.5 w-1.5 rounded-full bg-country-red" />
              </View>
            )}
          </View>
          <Text className="text-[10px] text-ink-faint mt-0.5 truncate">{HUB_TYPE_LABELS[hub.type as HubType]} · {place || "Australia"}</Text>
        </View>
        <Icon name="arrow-right" size={13} color={colors.inkMuted} />
      </Pressable>
    </Card>
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
