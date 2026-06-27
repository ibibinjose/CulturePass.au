import { useEffect, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { supabase } from "@/lib/supabase/client";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Footer } from "@/components/ui/Footer";
import { Icon } from "@/components/ui/Icon";
import { LocationPicker } from "@/components/ui/LocationPicker";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { useHubs } from "@/features/hubs/api";
import { useEvents } from "@/features/events/api";
import { useSavedLocation } from "@/features/reference/useSavedLocation";
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
  const { width } = useWindowDimensions();
  const { location, setLocation } = useSavedLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "events" | "venues" | "businesses" | "community">("all");

  const [detecting, setDetecting] = useState(false);
  const [councilDetails, setCouncilDetails] = useState<any>(null);
  const [councilLoading, setCouncilLoading] = useState(false);

  const isWide = width >= 1024;

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

  return (
    <Screen contentClassName="pt-4 md:pt-6" maxWidth="content">
      
      {/* Header */}
      <View className="flex-row flex-wrap items-center justify-between gap-4 border-b border-linen pb-5">
        <View className="gap-2">
          <Text variant="overline" tone="pink">
            Local Discovery Board
          </Text>
          <Text className="font-display text-3xl md:text-4xl text-ink tracking-tight">
            My Council
          </Text>
        </View>

        {/* Location selector */}
        <LocationPicker value={location} onChange={setLocation} />
      </View>

      {!location.councilId ? (
        <Card className="p-10 items-center justify-center gap-5 border border-linen bg-card rounded-3xl mt-8 max-w-lg mx-auto">
          <View className="h-16 w-16 rounded-full bg-pink-50 items-center justify-center">
            <Icon name="map-pin" size={28} color={colors.pink} />
          </View>
          <View className="items-center gap-1.5">
            <Text className="font-display text-2xl text-ink text-center">No Local Council Selected</Text>
            <Text className="font-sans text-sm text-ink-muted text-center leading-relaxed">
              Detect your location or select an Australian local council to explore events, community groups, local venues, and businesses on your doorstep.
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-3 mt-2 w-full justify-center">
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
        <Card className="p-16 items-center justify-center mt-8">
          <ActivityIndicator size="large" color={colors.pink} />
          <Text variant="caption" tone="faint" className="mt-4">
            Loading local council board details...
          </Text>
        </Card>
      ) : councilDetails ? (
        <View className="mt-6 gap-6">
          
          {/* Council Details Hero Banner */}
          <View className="rounded-3xl border border-linen bg-card p-6 md:p-8 gap-5 relative overflow-hidden">
            <View className="gap-2 z-10">
              <View className="flex-row items-center gap-2">
                <Icon name="map-pin" size={16} color={colors.pink} />
                <Text variant="overline" tone="pink" className="text-2xs font-heading tracking-widest text-pink-600">
                  Active Council Board
                </Text>
              </View>
              <Text className="font-display text-3xl md:text-4xl text-ink tracking-tight mt-1">
                {councilDetails.name}
              </Text>
            </View>

            {councilDetails.traditional_custodians && councilDetails.traditional_custodians.length > 0 ? (
              <View className="flex-row items-start gap-3 bg-country-ochre/5 border border-country-ochre/25 p-4 rounded-2xl z-10">
                <View className="h-2 w-2 rounded-full bg-country-red mt-1.5" />
                <Text className="text-xs text-country-red font-heading tracking-wide leading-5 flex-1">
                  We acknowledge the {councilDetails.traditional_custodians.join(" and ")} people, the Traditional Custodians of this land. We pay our respects to Elders past, present and emerging.
                </Text>
              </View>
            ) : null}

            {/* Quick stats row */}
            <View className="flex-row flex-wrap gap-x-8 gap-y-4 border-t border-linen/35 pt-5 z-10">
              <View>
                <Text className="font-display text-2xl text-ink">{allEvents.length}</Text>
                <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted mt-0.5">Events Active</Text>
              </View>
              <View>
                <Text className="font-display text-2xl text-ink">{venues.length}</Text>
                <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted mt-0.5">Venues & Spaces</Text>
              </View>
              <View>
                <Text className="font-display text-2xl text-ink">{businesses.length}</Text>
                <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted mt-0.5">Businesses</Text>
              </View>
              <View>
                <Text className="font-display text-2xl text-ink">{community.length}</Text>
                <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted mt-0.5">Community Groups</Text>
              </View>
              {councilDetails.population ? (
                <View>
                  <Text className="font-display text-2xl text-ink">{councilDetails.population.toLocaleString()}</Text>
                  <Text className="text-[10px] font-heading uppercase tracking-wider text-ink-muted mt-0.5">Estimated Pop.</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Search bar inside Council */}
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Input
                placeholder={`Search events or hubs in ${councilDetails.name}...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                leftIcon={<Icon name="search" size={16} color={colors.inkMuted} />}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          {/* Swiss Tabs Switcher */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-6 border-b border-linen pb-px w-full"
            className="mt-2"
          >
            <TabButton label="All Board" count={allEvents.length + allHubs.length} active={activeTab === "all"} onPress={() => setActiveTab("all")} />
            <TabButton label="Events Calendar" count={allEvents.length} active={activeTab === "events"} onPress={() => setActiveTab("events")} />
            <TabButton label="Venues & Spaces" count={venues.length} active={activeTab === "venues"} onPress={() => setActiveTab("venues")} />
            <TabButton label="Local Businesses" count={businesses.length} active={activeTab === "businesses"} onPress={() => setActiveTab("businesses")} />
            <TabButton label="Community & Clubs" count={community.length} active={activeTab === "community"} onPress={() => setActiveTab("community")} />
          </ScrollView>

          {/* Content Layout */}
          <View className="mt-4 gap-8 lg:flex-row lg:items-start lg:gap-10">
            
            {/* Left Side: Filtered List */}
            <View className="flex-1 gap-6">
              
              {/* Tab: All Board */}
              {activeTab === "all" && (
                <View className="gap-8">
                  {/* Events Section */}
                  <View className="gap-4">
                    <View className="flex-row items-center justify-between border-b border-linen/30 pb-2">
                      <Text className="font-display text-lg text-ink tracking-tight">Upcoming local events</Text>
                      {allEvents.length > 0 && (
                        <Pressable onPress={() => setActiveTab("events")}>
                          <Text variant="caption" tone="pink" className="font-heading">View all</Text>
                        </Pressable>
                      )}
                    </View>

                    {allEvents.length > 0 ? (
                      <View className="gap-1">
                        {allEvents.slice(0, 5).map((event) => (
                          <EventRow key={event.id} event={event} router={router} />
                        ))}
                      </View>
                    ) : (
                      <Text variant="caption" tone="faint" className="py-2 italic">No local events found.</Text>
                    )}
                  </View>

                  {/* Spaces Section */}
                  <View className="gap-4">
                    <View className="flex-row items-center justify-between border-b border-linen/30 pb-2">
                      <Text className="font-display text-lg text-ink tracking-tight">Featured local venues</Text>
                      {venues.length > 0 && (
                        <Pressable onPress={() => setActiveTab("venues")}>
                          <Text variant="caption" tone="pink" className="font-heading">View all</Text>
                        </Pressable>
                      )}
                    </View>

                    {venues.length > 0 ? (
                      <View className="gap-1.5">
                        {venues.slice(0, 4).map((hub) => (
                          <HubRow key={hub.slug} hub={hub} router={router} />
                        ))}
                      </View>
                    ) : (
                      <Text variant="caption" tone="faint" className="py-2 italic">No local venues registered.</Text>
                    )}
                  </View>

                  {/* Businesses Section */}
                  <View className="gap-4">
                    <View className="flex-row items-center justify-between border-b border-linen/30 pb-2">
                      <Text className="font-display text-lg text-ink tracking-tight">Creative businesses & makers</Text>
                      {businesses.length > 0 && (
                        <Pressable onPress={() => setActiveTab("businesses")}>
                          <Text variant="caption" tone="pink" className="font-heading">View all</Text>
                        </Pressable>
                      )}
                    </View>

                    {businesses.length > 0 ? (
                      <View className="gap-1.5">
                        {businesses.slice(0, 4).map((hub) => (
                          <HubRow key={hub.slug} hub={hub} router={router} />
                        ))}
                      </View>
                    ) : (
                      <Text variant="caption" tone="faint" className="py-2 italic">No local businesses registered.</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Tab: Events */}
              {activeTab === "events" && (
                <View className="gap-6">
                  <View className="border-b border-linen pb-2">
                    <Text className="font-display text-lg text-ink tracking-tight">Events Calendar</Text>
                  </View>

                  {eventsLoading ? (
                    <Text variant="caption" tone="faint" className="py-2 italic">Loading local events...</Text>
                  ) : groupedCouncilEvents.length > 0 ? (
                    <View className="gap-5">
                      {groupedCouncilEvents.map((group) => (
                        <View key={group.dateLabel} className="gap-1.5">
                          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
                            {group.dateLabel}
                          </Text>
                          <View className="gap-0.5">
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
                    <Text className="font-display text-lg text-ink tracking-tight">Local Venues, Spaces & Galleries</Text>
                  </View>
                  {hubsLoading ? (
                    <Text variant="caption" tone="faint" className="py-2 italic">Loading local venues...</Text>
                  ) : venues.length > 0 ? (
                    <View className="gap-1.5">
                      {venues.map((hub) => (
                        <HubRow key={hub.slug} hub={hub} router={router} />
                      ))}
                    </View>
                  ) : (
                    <EmptyCard
                      title="No venues registered"
                      body="Create a hub profile for a local gallery, theatre, studio, or community space!"
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
                    <Text className="font-display text-lg text-ink tracking-tight">Local Creative Businesses</Text>
                  </View>
                  {hubsLoading ? (
                    <Text variant="caption" tone="faint" className="py-2 italic">Loading local businesses...</Text>
                  ) : businesses.length > 0 ? (
                    <View className="gap-1.5">
                      {businesses.map((hub) => (
                        <HubRow key={hub.slug} hub={hub} router={router} />
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
                    <Text className="font-display text-lg text-ink tracking-tight">Community Groups, Clubs & Collectives</Text>
                  </View>
                  {hubsLoading ? (
                    <Text variant="caption" tone="faint" className="py-2 italic">Loading local community hubs...</Text>
                  ) : community.length > 0 ? (
                    <View className="gap-1.5">
                      {community.map((hub) => (
                        <HubRow key={hub.slug} hub={hub} router={router} />
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

            {/* Right Side: Council Spotlight (Wide screen layout only) */}
            {isWide && (
              <View className="w-[320px] gap-6">
                
                {/* Traditional Custodians Block */}
                {councilDetails.traditional_custodians && (
                  <Card className="p-5 gap-3 border border-country-ochre/25 bg-country-ochre/5">
                    <View className="flex-row items-center gap-1.5">
                      <View className="h-1.5 w-1.5 rounded-full bg-country-red" />
                      <Text className="text-[10px] font-heading uppercase tracking-widest text-country-red">
                        Country Acknowledgement
                      </Text>
                    </View>
                    <Text variant="caption" tone="muted" className="leading-5">
                      This Local Government Area lies on the traditional country of the {councilDetails.traditional_custodians.join(" and ")} people.
                    </Text>
                  </Card>
                )}

                {/* Council Resources Card */}
                <Card className="p-5 gap-4">
                  <View className="flex-row items-center gap-2">
                    <Icon name="settings" size={16} color={colors.inkMuted} />
                    <Text className="font-heading text-xs text-ink uppercase tracking-wider">
                      Council Info
                    </Text>
                  </View>
                  
                  <View className="gap-3">
                    <View className="flex-row justify-between border-b border-linen/30 pb-2">
                      <Text variant="caption" tone="faint">State Jurisdiction</Text>
                      <Text variant="caption" className="font-heading text-ink">{councilDetails.state_code}</Text>
                    </View>
                    <View className="flex-row justify-between border-b border-linen/30 pb-2">
                      <Text variant="caption" tone="faint">Metro Status</Text>
                      <Text variant="caption" className="font-heading text-ink">{councilDetails.is_metro ? "Metropolitan" : "Regional"}</Text>
                    </View>
                    <View className="flex-row justify-between pb-1">
                      <Text variant="caption" tone="faint">Population</Text>
                      <Text variant="caption" className="font-heading text-ink">
                        {councilDetails.population ? councilDetails.population.toLocaleString() : "Unknown"}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Quick actions for Council */}
                <View className="gap-2.5">
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
            )}

          </View>
        </View>
      ) : (
        <Card className="p-6 items-center mt-8">
          <Text variant="caption" tone="muted">Council not found in database.</Text>
        </Card>
      )}

      <Footer className="mt-12 border-t border-linen pt-8" />
    </Screen>
  );
}

function TabButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="items-center pb-2.5 active:opacity-75">
      <Text className={cn("font-heading text-xs", active ? "text-ink font-semibold" : "text-ink-faint")}>
        {label} ({count})
      </Text>
      <View className={cn("h-0.5 w-full rounded-pill mt-2.5 absolute bottom-0", active ? "bg-ochre-500" : "bg-transparent")} />
    </Pressable>
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
        <Text className="text-sm font-heading text-ink truncate">{event.title}</Text>
        <Text className="text-[11px] text-ink-faint mt-0.5 truncate">
          By {event.hub?.name || "Independent"} · {place || "Online"}
        </Text>
      </View>
      {event.rsvp_count ? (
        <Text className="text-[10px] font-heading text-ink-muted bg-sand/60 px-2 py-0.5 rounded">
          {event.rsvp_count} going
        </Text>
      ) : null}
      <Icon name="arrow-right" size={14} color={colors.inkFaint} />
    </Pressable>
  );
}

function HubRow({ hub, router }: { hub: any; router: any }) {
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
        <View className="flex-row items-center gap-1">
          <Text className="text-xs font-heading text-ink truncate">{hub.name}</Text>
          {hub.indigenous_led && (
            <View className="h-3 w-3 rounded-full bg-country-ochre items-center justify-center">
              <View className="h-1.5 w-1.5 rounded-full bg-country-red" />
            </View>
          )}
        </View>
        <Text className="text-[10px] text-ink-faint mt-0.5 truncate">{HUB_TYPE_LABELS[hub.type as HubType]} · {place || "Australia"}</Text>
      </View>
      <Icon name="arrow-right" size={13} color={colors.inkFaint} />
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
    <Card className="p-6 items-center gap-2 mt-2">
      <Text variant="subheading">{title}</Text>
      <Text variant="caption" tone="muted" className="text-center">
        {body}
      </Text>
      <Button label={action} variant="secondary" size="sm" className="mt-2" onPress={onPress} />
    </Card>
  );
}
