import { useState, useEffect } from "react";
import { Linking, Pressable, View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useMobileLayout } from "@/lib/useMobileLayout";
import { getEventTimezone } from "@/lib/utils/timezone";

import {
  Screen,
  Text,
  Button,
  Badge,
  Card,
  Divider,
  ListRow,
  Avatar,
  ShareButton,
  Icon,
  type IconName,
} from "@/components/ui";
import { colors } from "@/lib/theme";
import { WelcomeToCountry } from "@/components/cultural/WelcomeToCountry";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { EventCard } from "@/features/events/EventCard";
import { CreateEventButton } from "@/features/events/CreateEventButton";
import {
  useHub,
  useHubLikeStatus,
  useToggleHubLike,
  useHubFollowStatus,
  useToggleHubFollow,
} from "@/features/hubs/api";
import { useHubEvents } from "@/features/events/api";
import { useMyProfile } from "@/features/profiles/api";
import { useWeather } from "@/features/weather/api";
import { useStartConversation } from "@/features/chat/api";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";



type TabKey = "events" | "about" | "details";

type StateCode = "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT";
export const STATE_COORDS: Record<StateCode, { lat: number; lon: number }> = {
  NSW: { lat: -33.8688, lon: 151.2093 }, // Sydney
  VIC: { lat: -37.8136, lon: 144.9631 }, // Melbourne
  QLD: { lat: -27.4698, lon: 153.0251 }, // Brisbane
  SA: { lat: -34.9285, lon: 138.6007 },  // Adelaide
  WA: { lat: -31.9505, lon: 115.8605 },  // Perth
  TAS: { lat: -42.8821, lon: 147.3272 }, // Hobart
  ACT: { lat: -35.2809, lon: 149.1300 }, // Canberra
  NT: { lat: -12.4634, lon: 130.8456 },  // Darwin
};

export default function HubScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: hub, isLoading, isError } = useHub(slug ?? "");
  const { data: events, isLoading: eventsLoading } = useHubEvents(hub?.id || "");
  const { data: profile } = useMyProfile();
  const startConversation = useStartConversation();
  const [tab, setTab] = useState<TabKey>("events");
  const isMobile = useMobileLayout();

  // Live clock for local time display (updates every 15s)
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const { data: likeStatus } = useHubLikeStatus(hub?.id || "");
  const { data: followStatus } = useHubFollowStatus(hub?.id || "");
  const toggleLike = useToggleHubLike();
  const toggleFollow = useToggleHubFollow();

  const handleLike = () => {
    if (!profile) {
      router.push("/sign-in");
      return;
    }
    if (hub) {
      toggleLike.mutate({ hubId: hub.id, liked: !!likeStatus?.liked });
    }
  };

  const handleFollow = () => {
    if (!profile) {
      router.push("/sign-in");
      return;
    }
    if (hub) {
      toggleFollow.mutate({ hubId: hub.id, followed: !!followStatus?.followed });
    }
  };

  // Weather + local time for hub location (free Open-Meteo).
  // Hook is *always* called (no conditional hooks). Falls back intelligently using hub state.
  const coords = hub?.coordinates
    ? hub.coordinates.split(",").map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n))
    : [];
  let fallback = STATE_COORDS.NSW;
  const sk = (hub?.location_state || "").toUpperCase();
  if (sk && sk in STATE_COORDS) {
    fallback = STATE_COORDS[sk as StateCode];
  }
  const hubLat = coords[0] ?? fallback.lat;
  const hubLon = coords[1] ?? fallback.lon;
  const shouldUseHubLocation = true;
  const { data: hubWeather, isError: weatherError } = useWeather({
    lat: hubLat,
    lon: hubLon,
    name: hub?.location_city || (hub ? [hub.location_city, hub.location_state].filter(Boolean).join(", ") : undefined),
  });

  if (isLoading) return <HubSkeleton />;

  if (isError || !hub) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-6">
        <Card className="mt-8 items-start gap-3 border border-linen p-6">
          <Text variant="title" className="font-display tracking-tight">Hub not found</Text>
          <Button
            label="Browse hubs"
            variant="secondary"
            className="mt-2"
            onPress={() => router.replace("/")}
          />
        </Card>
      </Screen>
    );
  }

  const council = (hub as { council?: { name: string; traditional_custodians: string[] | null } }).council;
  const custodians =
    (hub.traditional_custodians && hub.traditional_custodians.length > 0
      ? hub.traditional_custodians
      : council?.traditional_custodians) ?? null;
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");

  const images = (hub.images ?? []).filter((i) => i && i.url);
  const logoUrl = images.find((i) => i.type === "logo")?.url ?? null;
  const coverUrl =
    images.find((i) => i.type === "cover")?.url ??
    images.find((i) => i.url !== logoUrl)?.url ??
    null;

  const hasCover = !!coverUrl;
  const isOwnerOrEditor = !!profile && hub.owner_id === profile.id;
  const isVerified = hub.verification_status === "verified";
  const eventCount = events?.length ?? 0;
  const topics = Array.from(
    new Set([...(hub.categories ?? []), ...(hub.tags ?? [])].filter(Boolean)),
  );
  const partners = (hub.indigenous_partners ?? []).filter(Boolean);
  const websiteLabel = hub.website
    ? hub.website.replace(/^https?:\/\//i, "").replace(/\/+$/, "")
    : null;

  const tz = getEventTimezone(hub.location_state);
  const localTimeStr = new Intl.DateTimeFormat('en-AU', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(clock);

  const hasWarning = !!hubWeather && (hubWeather.code >= 95 || (hubWeather.windSpeed && hubWeather.windSpeed > 40));

  const openUrl = (raw: string) => {
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    Linking.openURL(url).catch(() => {});
  };
  const openEmail = (email: string) => Linking.openURL(`mailto:${email}`).catch(() => {});
  const openPhone = (phone: string) =>
    Linking.openURL(`tel:${phone.replace(/[^+\d]/g, "")}`).catch(() => {});
  const openDirections = () => {
    const query = encodeURIComponent(hub.address || place || hub.name);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {});
  };

  const messageOrganiser = async () => {
    if (!profile) {
      router.push("/sign-in");
      return;
    }
    try {
      const conversationId = await startConversation.mutateAsync(hub.id);
      router.push(`/messages/${conversationId}`);
    } catch {
      // quiet fallback
    }
  };

  const detailRows = [
    websiteLabel && hub.website
      ? { key: "web", icon: "globe" as IconName, title: "Website", value: websiteLabel, onPress: () => openUrl(hub.website!) }
      : null,
    hub.contact_email
      ? { key: "email", icon: "mail" as IconName, title: "Email", value: hub.contact_email, onPress: () => openEmail(hub.contact_email!) }
      : null,
    hub.phone
      ? { key: "phone", icon: "phone" as IconName, title: "Phone", value: hub.phone, onPress: () => openPhone(hub.phone!) }
      : null,
    hub.address
      ? { key: "address", icon: "map-pin" as IconName, title: "Address", value: hub.address, onPress: openDirections }
      : null,
    council?.name ? { key: "council", icon: "users" as IconName, title: "Council Board", value: council.name } : null,
    place ? { key: "loc", icon: "map-pin" as IconName, title: "Location", value: place } : null,
    hub.location_postcode ? { key: "pc", icon: "map-pin" as IconName, title: "Postcode", value: hub.location_postcode } : null,
  ].filter(Boolean) as { key: string; icon: IconName; title: string; value: string; onPress?: () => void }[];

  const tabs: { key: TabKey; label: string }[] = [
    { key: "events", label: eventCount > 0 ? `All Events (${eventCount})` : "All Events" },
    { key: "about", label: "About" },
  ];
  if (isMobile) {
    tabs.push({ key: "details", label: "Details" });
  }

  const activeTab = tab === "details" && !isMobile ? "events" : tab;

  return (
    <Screen maxWidth="content" contentClassName="pt-0 pb-10">
      {/* Cover image banner */}
      <View
        className="relative overflow-hidden rounded-b-[28px] bg-sand"
        style={{ aspectRatio: 5 / 2, marginLeft: -20, marginRight: -20 }}
      >
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            className={cn(
              "flex-1 items-center justify-center",
              hub.indigenous_led ? "bg-eucalyptus-100" : "bg-ochre-100",
            )}
          >
            <Text
              className={cn(
                "font-display font-bold leading-none opacity-20",
                hub.indigenous_led ? "text-eucalyptus-700" : "text-ochre-700",
              )}
              style={{ fontSize: 168 }}
            >
              {hub.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Top scrim keeps the back control legible over bright imagery */}
        {coverUrl ? (
          <View pointerEvents="none" className="absolute inset-x-0 top-0 h-20 bg-ink/15" />
        ) : null}

        {/* Bottom scrim for name + Approved text visibility over cover */}
        {coverUrl ? (
          <View pointerEvents="none" className="absolute inset-x-0 bottom-0 h-28 bg-ink/60" />
        ) : null}

        {/* Compact time + weather + pollution + surf at top of cover - content sized, one line with map pin (right side, not covering back button). On mobile we hide secondary fields (wind/pollution/surf) so it never overflows the constrained pill. */}
        {shouldUseHubLocation && (
          <View className="absolute top-3 right-4 z-20">
            <View
              className={cn(
                "backdrop-blur-xl border border-white/20 rounded-xl px-1.5 py-0.5 flex-row items-center gap-1 w-auto max-w-[200px] md:max-w-[280px] overflow-hidden",
                hasCover ? "bg-black/50" : "bg-ink/55"
              )}
            >
              <View className="flex-row items-center gap-1 shrink-0">
                <Icon name="map-pin" size={12} color={colors.paper} />
                <Text className="text-paper text-xs md:text-sm font-bold leading-none">
                  {localTimeStr}
                </Text>
              </View>
              {hubWeather ? (
                <>
                  <Text className="text-paper text-sm md:text-base font-bold leading-none shrink-0">
                    {hubWeather.emoji}{hubWeather.tempC}°
                  </Text>
                  {/* Secondary details only on larger screens to guarantee the pill stays inside its max-w */}
                  {!isMobile && (
                    <>
                      {hubWeather.windDirection != null && (
                        <Text className="text-paper/80 text-[9px] md:text-xs shrink-0">
                          {Math.round(hubWeather.windDirection)}°{hubWeather.windSpeed ? ` ${Math.round(hubWeather.windSpeed)}km/h` : ''}
                        </Text>
                      )}
                      {hubWeather.pollution && (
                        <Text className="text-paper/80 text-[9px] md:text-xs shrink-0">
                          {hubWeather.pollution.emoji}{hubWeather.pollution.level}
                        </Text>
                      )}
                      {hubWeather.surf?.waveHeight && (
                        <Text className="text-paper/80 text-[9px] md:text-xs shrink-0">🌊{hubWeather.surf.waveHeight}m</Text>
                      )}
                    </>
                  )}
                  {hasWarning && (
                    <Text className="text-amber-400 text-[9px] md:text-xs font-bold shrink-0">⚠️</Text>
                  )}
                </>
              ) : weatherError ? (
                <Text className="text-paper/50 text-[9px] md:text-xs shrink-0">—</Text>
              ) : (
                <Text className="text-paper/70 text-[9px] md:text-xs shrink-0">Loading…</Text>
              )}
            </View>
          </View>
        )}

        {/* Back Button (high z so it is never covered by the right-side weather pill) */}
        <View className="absolute left-4 top-4 z-30">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            accessibilityLabel="Go back"
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-ink/45 border border-white/20 active:bg-ink/70"
          >
            <Icon name="arrow-left" size={18} color={colors.paper} />
          </Pressable>
        </View>
      </View>

      {/* Unified Header Identity & Actions Block */}
      <View className="flex-col md:flex-row md:items-end justify-between gap-5 mt-[-44px] pb-6 border-b border-linen/60 z-10">
        <View className="flex-row items-center gap-4 min-w-0 flex-1">
          <Pressable
            onPress={() => {
              if (isOwnerOrEditor) router.push(`/hub/edit/${hub.slug}`);
            }}
            disabled={!isOwnerOrEditor}
            className="active:opacity-90"
          >
            <Avatar name={hub.name} uri={logoUrl} size={92} ring />
          </Pressable>

          <View className="min-w-0 flex-1 pb-1 gap-2">
            {/* Glassmorphic name - content sized (fits info, does not stretch), glass adapts to cover vs page background */}
            <View
              className={cn(
                "self-start flex-row flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl px-3 py-1 shadow-lg",
                hasCover
                  ? "bg-black/35 backdrop-blur-lg border border-white/20"
                  : "bg-black/45 backdrop-blur-md border border-white/15"
              )}
            >
              <Text className="font-display text-2xl md:text-3xl font-bold tracking-tight text-paper">
                {hub.name}
              </Text>
              {isVerified ? <Badge label="Approved" variant="success" /> : null}
              {hub.indigenous_led ? <IndigenousLedBadge /> : null}
            </View>

            <View className="flex-row flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <Text variant="overline" tone="ochre">
                {HUB_TYPE_LABELS[hub.type as HubType]}
              </Text>
              {place ? (
                <View className="flex-row items-center gap-1">
                  <Icon name="map-pin" size={12} color={colors.inkFaint} />
                  <Text variant="caption" tone="faint" className="text-xs">
                    {place}
                  </Text>
                </View>
              ) : null}
              <Text variant="caption" tone="faint" className="text-xs">
                @{hub.slug}
              </Text>
            </View>
          </View>
        </View>

        {/* Unified Actions Bar — 2×2 grid on mobile, single row on desktop */}
        <View className="gap-2 md:flex-row md:items-center pb-1">
          <View className="flex-row gap-2">
            <Button
              label={followStatus?.followed ? "Following" : "Follow"}
              variant={followStatus?.followed ? "outline" : "primary"}
              size="sm"
              className="flex-1 md:flex-none"
              leftIcon={
                <Icon
                  name={followStatus?.followed ? "check" : "star"}
                  size={14}
                  color={colors.ink}
                  filled={!followStatus?.followed}
                />
              }
              onPress={handleFollow}
              loading={toggleFollow.isPending}
            />
            <Button
              label={likeStatus?.liked ? "Liked" : "Like"}
              variant={likeStatus?.liked ? "pink" : "outline"}
              size="sm"
              className="flex-1 md:flex-none"
              leftIcon={
                <Icon
                  name="heart"
                  size={14}
                  color={likeStatus?.liked ? colors.white : colors.pink}
                  filled={likeStatus?.liked}
                />
              }
              onPress={handleLike}
              loading={toggleLike.isPending}
            />
          </View>
          <View className="flex-row gap-2">
            {!isOwnerOrEditor ? (
              <Button
                label="Message"
                variant="secondary"
                size="sm"
                className="flex-1 md:flex-none"
                leftIcon={<Icon name="chat" size={14} color={colors.paper} />}
                onPress={messageOrganiser}
                loading={startConversation.isPending}
              />
            ) : null}
            <ShareButton
              path={`/hub/${hub.slug}`}
              title={hub.name}
              message={hub.short_description ?? undefined}
              className="flex-1 md:flex-none"
            />
          </View>
        </View>
      </View>

      {/* Responsive Two-Column Layout */}
      <View className="mt-6 gap-8 lg:flex-row lg:items-start lg:gap-10">

        {/* Left Column: Descriptions & Tab Content */}
        <View className="flex-1 gap-6 min-w-0">
          {hub.short_description ? (
            <Text className="font-sans text-base md:text-lg text-ink-muted leading-7 max-w-prose">
              {hub.short_description}
            </Text>
          ) : null}

          {/* Mobile-only Stats strip */}
          <View className="flex-row justify-between rounded-xl border border-linen bg-card p-3 lg:hidden">
            <View className="items-center flex-1">
              <Text className="font-sans text-sm font-bold text-ink">{eventCount}</Text>
              <Text className="text-[9px] font-heading uppercase text-ink-faint mt-0.5">Events</Text>
            </View>
            <View className="items-center flex-1 border-l border-linen/60">
              <Text className="font-sans text-sm font-bold text-ink">{likeStatus?.count ?? 0}</Text>
              <Text className="text-[9px] font-heading uppercase text-ink-faint mt-0.5">Likes</Text>
            </View>
            <View className="items-center flex-1 border-l border-linen/60">
              <Text className="font-sans text-sm font-bold text-ink">{followStatus?.count ?? 0}</Text>
              <Text className="text-[9px] font-heading uppercase text-ink-faint mt-0.5">Followers</Text>
            </View>
            <View className="items-center flex-1 border-l border-linen/60">
              <Text className="font-sans text-sm font-bold text-ink">{topics.length}</Text>
              <Text className="text-[9px] font-heading uppercase text-ink-faint mt-0.5">Topics</Text>
            </View>
          </View>

          {/* Welcome to Country / Respect Board */}
          <WelcomeToCountry statement={hub.welcome_to_country} custodians={custodians} />

          {/* Tabs */}
          <View className="flex-row gap-7 border-b border-linen">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <Pressable key={t.key} onPress={() => setTab(t.key)} className="items-center pb-3 relative">
                  <Text
                    className={cn(
                      "font-heading text-sm",
                      active ? "text-ink font-semibold" : "text-ink-faint",
                    )}
                  >
                    {t.label}
                  </Text>
                  {active && (
                    <View className="h-[2.5px] w-full rounded-full bg-ochre-500 absolute bottom-[-1.5px]" />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Tab Content */}
          <View className="pt-1">
            {activeTab === "events" ? (
              <EventsTab
                events={events}
                loading={eventsLoading}
                count={eventCount}
                isOwner={isOwnerOrEditor}
                hubId={hub.id}
                ownerId={hub.owner_id}
              />
            ) : activeTab === "about" ? (
              <AboutTab fullDescription={hub.full_description} topics={topics} partners={partners} />
            ) : (
              <DetailsTab rows={detailRows} />
            )}
          </View>

          {/* Mobile-only Details section */}
          {isMobile && detailRows.length > 0 && activeTab !== "details" && (
            <>
              <Divider className="opacity-40 my-2" />
              <View className="gap-3.5">
                <Text className="text-xs font-heading uppercase tracking-widest text-ink-muted">
                  Details
                </Text>
                <DetailsTab rows={detailRows} />
              </View>
            </>
          )}
        </View>

        {/* Right Column: Stats Card & Contact Details (Desktop Sidebar) */}
        <View className="hidden lg:flex gap-5 lg:w-[324px] w-full">

          {/* Stats Overview Card (smaller) */}
          <Card className="gap-4 border border-linen bg-card rounded-3xl p-5">
            <Text className="text-[10px] font-heading uppercase tracking-widest text-pink-600">
              Overview
            </Text>
            <View className="gap-3">
              <View className="flex-row items-baseline gap-1.5">
                <Text className="font-sans text-sm font-bold text-ink">{eventCount}</Text>
                <Text className="text-[10px] font-heading uppercase text-ink-muted">Events</Text>
              </View>
              <View className="flex-row items-baseline gap-1.5">
                <Text className="font-sans text-sm font-bold text-ink">{likeStatus?.count ?? 0}</Text>
                <Text className="text-[10px] font-heading uppercase text-ink-muted">Likes</Text>
              </View>
              <View className="flex-row items-baseline gap-1.5">
                <Text className="font-sans text-sm font-bold text-ink">{followStatus?.count ?? 0}</Text>
                <Text className="text-[10px] font-heading uppercase text-ink-muted">Followers</Text>
              </View>
              <View className="flex-row items-baseline gap-1.5">
                <Text className="font-sans text-sm font-bold text-ink">{topics.length}</Text>
                <Text className="text-[10px] font-heading uppercase text-ink-muted">Topics</Text>
              </View>
            </View>
          </Card>

          {/* Contact & location card */}
          {detailRows.length > 0 ? (
            <Card className="gap-5 border border-linen bg-card rounded-3xl p-6">
              <Text variant="overline" tone="pink">
                Get in touch
              </Text>
              <View className="gap-4">
                {detailRows.map((row) => (
                  <Pressable
                    key={row.key}
                    disabled={!row.onPress}
                    onPress={row.onPress}
                    className={cn("flex-row items-start gap-3", row.onPress && "active:opacity-75")}
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-sand/60">
                      <Icon name={row.icon} size={15} color={colors.inkMuted} />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-[10px] text-ink-faint uppercase font-heading tracking-wide">
                        {row.title}
                      </Text>
                      <Text
                        className={cn(
                          "text-xs font-semibold mt-0.5 text-ink",
                          row.onPress && "text-ochre-600 underline",
                        )}
                        numberOfLines={2}
                      >
                        {row.value}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </Card>
          ) : null}

          {/* Tools card */}
          <Card className="gap-3 border border-linen bg-card rounded-3xl p-6">
            <Text variant="overline" tone="muted">
              Share &amp; tools
            </Text>
            {isOwnerOrEditor && (
              <Button
                label="Edit hub profile"
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={<Icon name="edit" size={14} color={colors.ink} />}
                onPress={() => router.push(`/hub/edit/${hub.slug}`)}
              />
            )}
            <Button
              label="Link in bio"
              variant="ghost"
              size="sm"
              fullWidth
              leftIcon={<Icon name="link" size={14} color={colors.ink} />}
              onPress={() => router.push(`/l/hub/${hub.slug}`)}
            />
            <Button
              label="Digital business card"
              variant="ghost"
              size="sm"
              fullWidth
              leftIcon={<Icon name="bag" size={14} color={colors.ink} />}
              onPress={() => router.push(`/card/hub/${hub.slug}`)}
            />
          </Card>
        </View>

      </View>
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab Components                                                             */
/* -------------------------------------------------------------------------- */

function EventsTab({
  events,
  loading,
  count,
  isOwner,
  hubId,
  ownerId,
}: {
  events: ReturnType<typeof useHubEvents>["data"];
  loading: boolean;
  count: number;
  isOwner: boolean;
  hubId: string;
  ownerId: string;
}) {
  const [viewMode, setViewMode] = useState<"box" | "list">("box");

  if (loading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator size="small" color={colors.pink} />
      </View>
    );
  }

  if (count === 0) {
    return (
      <Card className="items-center gap-2 p-8 border border-dashed border-linen bg-sand/15">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-sand/70">
          <Icon name="calendar" size={24} color={colors.inkFaint} />
        </View>
        <Text variant="subheading" className="font-display font-bold mt-1">No events yet</Text>
        <Text variant="caption" tone="faint" className="text-center max-w-xs leading-5">
          {isOwner
            ? "Publish your first event and it’ll show up here for your community."
            : "This hub hasn’t scheduled any upcoming events. Follow to be notified when it does."}
        </Text>
        {isOwner ? (
          <CreateEventButton
            hubId={hubId}
            hubOwnerId={ownerId}
            label="Create your first event"
            variant="secondary"
            size="sm"
            className="mt-3"
          />
        ) : null}
      </Card>
    );
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between border-b border-linen/25 pb-3">
        {isOwner ? (
          <CreateEventButton
            hubId={hubId}
            hubOwnerId={ownerId}
            label="+ Add event"
            variant="outline"
            size="sm"
          />
        ) : (
          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
            All Events ({count})
          </Text>
        )}

        {/* View Layout Toggle */}
        <View className="flex-row items-center gap-1 bg-sand/40 p-0.5 rounded-xl border border-linen/35">
          <Pressable
            onPress={() => setViewMode("box")}
            className={cn(
              "px-3 py-1 rounded-lg flex-row items-center gap-1.5",
              viewMode === "box" ? "bg-card shadow-subtle border border-linen/40" : ""
            )}
          >
            <Icon name="grid" size={13} color={viewMode === "box" ? colors.ink : colors.inkMuted} />
            <Text className={cn("text-[10px] font-heading", viewMode === "box" ? "text-ink font-semibold" : "text-ink-muted")}>
              Box
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode("list")}
            className={cn(
              "px-3 py-1 rounded-lg flex-row items-center gap-1.5",
              viewMode === "list" ? "bg-card shadow-subtle border border-linen/40" : ""
            )}
          >
            <Icon name="menu" size={13} color={viewMode === "list" ? colors.ink : colors.inkMuted} />
            <Text className={cn("text-[10px] font-heading", viewMode === "list" ? "text-ink font-semibold" : "text-ink-muted")}>
              List
            </Text>
          </Pressable>
        </View>
      </View>

      <View className={cn("gap-4", viewMode === "box" ? "md:flex-row md:flex-wrap" : "flex-col")}>
        {events?.map((event) => (
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
  );
}

function AboutTab({
  fullDescription,
  topics,
  partners,
}: {
  fullDescription: string | null;
  topics: string[];
  partners: string[];
}) {
  const router = useRouter();

  if (!fullDescription && topics.length === 0 && partners.length === 0) {
    return (
      <Text variant="caption" tone="faint" className="italic py-2">
        No information provided.
      </Text>
    );
  }
  return (
    <View className="gap-8">
      {fullDescription ? (
        <Text className="font-sans text-sm md:text-base text-ink-muted leading-7">
          {fullDescription}
        </Text>
      ) : null}

      {topics.length > 0 ? (
        <View className="gap-3">
          <View className="flex-row flex-wrap gap-2">
            {topics.map((topic) => (
              <Pressable
                key={topic}
                onPress={() => router.push(`/tag/${encodeURIComponent(topic)}`)}
                className="rounded-xl bg-sand/50 border border-linen px-3.5 py-1.5 active:bg-sand"
                accessibilityRole="link"
                accessibilityLabel={`View events tagged with ${topic}`}
              >
                <Text className="text-xs font-heading text-ink-muted">
                  {topic}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {partners.length > 0 ? (
        <View className="gap-3">
          <Text className="text-[10px] font-heading uppercase tracking-widest text-eucalyptus">
            Indigenous partners
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {partners.map((p) => (
              <Badge key={p} label={p} variant="eucalyptus" />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function DetailsTab({
  rows,
}: {
  rows: { key: string; icon: IconName; title: string; value: string; onPress?: () => void }[];
}) {
  if (rows.length === 0) {
    return (
      <Text variant="caption" tone="faint" className="italic py-2">
        No details listed.
      </Text>
    );
  }
  return (
    <Card padded={false} className="px-4 border border-linen bg-card rounded-2xl">
      {rows.map((row, i) => (
        <View key={row.key}>
          {i > 0 ? <Divider className="opacity-40" /> : null}
          <ListRow
            title={row.title}
            value={row.value}
            onPress={row.onPress}
            left={
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-sand/60">
                <Icon name={row.icon} size={15} color={colors.inkMuted} />
              </View>
            }
          />
        </View>
      ))}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components & Skeletons                                                 */
/* -------------------------------------------------------------------------- */



function HubSkeleton() {
  return (
    <Screen maxWidth="content" contentClassName="pt-0 pb-10">
      <View
        className="rounded-b-[28px] bg-sand animate-pulse"
        style={{ aspectRatio: 5 / 2, marginLeft: -20, marginRight: -20 }}
      />
      <View className="flex-row items-end gap-4 mt-[-44px]">
        <View className="h-[92px] w-[92px] rounded-full border-[3px] border-paper bg-linen" />
        <View className="flex-1 gap-2 pb-2">
          <View className="h-7 w-2/3 rounded-lg bg-sand animate-pulse" />
          <View className="h-4 w-1/3 rounded bg-sand animate-pulse" />
        </View>
      </View>
      <View className="mt-8 h-16 rounded-2xl bg-sand animate-pulse" />
      <View className="mt-6 gap-3">
        <View className="h-4 w-full rounded bg-sand animate-pulse" />
        <View className="h-4 w-5/6 rounded bg-sand animate-pulse" />
        <View className="h-48 w-full rounded-2xl bg-sand animate-pulse mt-2" />
      </View>
    </Screen>
  );
}

