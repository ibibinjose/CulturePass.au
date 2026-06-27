import { useState } from "react";
import { Linking, Pressable, View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useMobileLayout } from "@/lib/useMobileLayout";

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
import { useStartConversation } from "@/features/chat/api";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

type TabKey = "events" | "about" | "details";

export default function HubScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: hub, isLoading, isError } = useHub(slug ?? "");
  const { data: events, isLoading: eventsLoading } = useHubEvents(hub?.id || "");
  const { data: profile } = useMyProfile();
  const startConversation = useStartConversation();
  const [tab, setTab] = useState<TabKey>("events");
  const isMobile = useMobileLayout();

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

  if (isLoading) return <HubSkeleton />;

  if (isError || !hub) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-6">
        <Card className="mt-8 items-start gap-3 border border-linen p-6">
          <Text variant="title" className="font-display tracking-tight">Hub not found</Text>
          <Text variant="body" tone="muted">
            It may be unpublished, or your Supabase project isn’t connected yet.
          </Text>
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
  const joined = hub.created_at
    ? new Date(hub.created_at).toLocaleDateString("en-AU", { month: "long", year: "numeric" })
    : null;

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
    { key: "events", label: eventCount > 0 ? `Events (${eventCount})` : "Events" },
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
        className="relative overflow-hidden rounded-b-3xl bg-sand"
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
              "flex-1 items-end justify-center pr-6",
              hub.indigenous_led ? "bg-eucalyptus-50" : "bg-ochre-50",
            )}
          >
            <Text className="font-display text-8xl text-linen font-bold">
              {hub.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Back Button */}
        <View className="absolute left-4 top-4">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            accessibilityLabel="Go back"
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-ink/40 border border-white/20 active:bg-ink/65"
          >
            <Icon name="arrow-left" size={18} color={colors.paper} />
          </Pressable>
        </View>
      </View>

      {/* Unified Header Identity & Actions Block */}
      <View className="flex-col md:flex-row md:items-end justify-between gap-5 mt-[-44px] pb-6 border-b border-linen/50 z-10">
        <View className="flex-row items-end gap-4 min-w-0 flex-1">
          <Pressable
            onPress={() => {
              if (isOwnerOrEditor) router.push(`/hub/edit/${hub.slug}`);
            }}
            className="active:opacity-90"
          >
            <Avatar name={hub.name} uri={logoUrl} size={88} ring />
          </Pressable>
          
          <View className="min-w-0 flex-1 pb-1 gap-1">
            <View className="flex-row flex-wrap items-center gap-1.5">
              <Text className="font-display text-2xl md:text-3xl font-bold tracking-tight text-ink">
                {hub.name}
              </Text>
              {isVerified ? <VerifiedCheck /> : null}
              {hub.indigenous_led ? <IndigenousLedBadge /> : null}
            </View>
            <Text variant="caption" tone="faint" className="text-xs">
              @{hub.slug} · {HUB_TYPE_LABELS[hub.type as HubType]}
            </Text>
          </View>
        </View>

        {/* Unified Actions Bar (Works consistently for both mobile and desktop) */}
        <View className="flex-row flex-wrap items-center gap-2 pb-1">
          <Button
            label={likeStatus?.liked ? "Liked" : "Like"}
            variant={likeStatus?.liked ? "pink" : "outline"}
            size="sm"
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
          <Button
            label={followStatus?.followed ? "Following" : "Follow"}
            variant={followStatus?.followed ? "primary" : "outline"}
            size="sm"
            leftIcon={
              <Icon
                name="star"
                size={14}
                color={followStatus?.followed ? colors.white : colors.ochre}
                filled={followStatus?.followed}
              />
            }
            onPress={handleFollow}
            loading={toggleFollow.isPending}
          />
          {!isOwnerOrEditor ? (
            <Button
              label="Message"
              variant="secondary"
              size="sm"
              leftIcon={<Icon name="chat" size={14} color={colors.paper} />}
              onPress={messageOrganiser}
              loading={startConversation.isPending}
            />
          ) : null}
          <ShareButton path={`/hub/${hub.slug}`} title={hub.name} message={hub.short_description ?? undefined} />
        </View>
      </View>

      {/* Responsive Two-Column Layout */}
      <View className="mt-6 gap-8 lg:flex-row lg:items-start lg:gap-10">
        
        {/* Left Column: Descriptions & Tab Content */}
        <View className="flex-1 gap-6">
          {hub.short_description ? (
            <Text className="font-sans text-sm md:text-base text-ink-muted leading-7">
              {hub.short_description}
            </Text>
          ) : null}

          {/* Mobile-only Stats */}
          <View className="flex-row flex-wrap gap-x-7 gap-y-2 lg:hidden border-y border-linen/30 py-3">
            <Stat value={eventCount} label="Events" onPress={() => setTab("events")} />
            <Stat value={likeStatus?.count ?? 0} label="Likes" />
            <Stat value={followStatus?.count ?? 0} label="Followers" />
            {topics.length > 0 ? <Stat value={topics.length} label="Topics" onPress={() => setTab("about")} /> : null}
            {partners.length > 0 ? <Stat value={partners.length} label="Partners" onPress={() => setTab("about")} /> : null}
          </View>

          {/* Welcome to Country / Respect Board */}
          <WelcomeToCountry statement={hub.welcome_to_country} custodians={custodians} />

          {/* Tabs */}
          <View className="flex-row gap-6 border-b border-linen">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <Pressable key={t.key} onPress={() => setTab(t.key)} className="items-center pb-3 relative">
                  <Text className={cn("font-heading text-xs", active ? "text-ink font-semibold" : "text-ink-faint")}>
                    {t.label}
                  </Text>
                  {active && (
                    <View className="h-0.5 w-full rounded-full bg-ochre-500 absolute bottom-[-1px]" />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Tab content */}
          <View className="pt-2">
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
        </View>

        {/* Right Column: Directory Stats & Contact Details (Desktop Sidebar) */}
        <View className="hidden lg:flex gap-6 lg:w-[320px] w-full">
          
          {/* Metadata Card */}
          <Card className="gap-6 border border-linen bg-card rounded-3xl p-6">
            <Text variant="overline" tone="pink">
              Hub Directory
            </Text>

            {/* Statistics */}
            <View className="flex-row justify-around border-b border-linen/35 pb-4">
              <View className="items-center">
                <Text className="font-display text-xl font-bold text-ink">
                  {eventCount}
                </Text>
                <Text className="text-[10px] font-heading uppercase text-ink-faint mt-0.5">Events</Text>
              </View>
              <View className="items-center">
                <Text className="font-display text-xl font-bold text-ink">
                  {likeStatus?.count ?? 0}
                </Text>
                <Text className="text-[10px] font-heading uppercase text-ink-faint mt-0.5">Likes</Text>
              </View>
              <View className="items-center">
                <Text className="font-display text-xl font-bold text-ink">
                  {followStatus?.count ?? 0}
                </Text>
                <Text className="text-[10px] font-heading uppercase text-ink-faint mt-0.5">Followers</Text>
              </View>
            </View>

            {/* Contacts & Location list */}
            <View className="gap-4">
              {detailRows.map((row) => (
                <Pressable
                  key={row.key}
                  disabled={!row.onPress}
                  onPress={row.onPress}
                  className={cn("flex-row items-start gap-3", row.onPress && "active:opacity-75")}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-sand/50">
                    <Icon name={row.icon} size={15} color={colors.inkMuted} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-[10px] text-ink-faint uppercase font-heading tracking-wide">
                      {row.title}
                    </Text>
                    <Text
                      className={cn("text-xs font-semibold mt-0.5 text-ink truncate", row.onPress && "text-ochre-600 underline")}
                      numberOfLines={1}
                    >
                      {row.value}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* Action Links Card */}
          <Card className="gap-3.5 border border-linen bg-card rounded-3xl p-5">
            <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
              Utilities
            </Text>
            {isOwnerOrEditor && (
              <Button
                label="Edit Hub Profile"
                variant="outline"
                size="sm"
                fullWidth
                onPress={() => router.push(`/hub/edit/${hub.slug}`)}
              />
            )}
            <Button
              label="Share Link in Bio"
              variant="ghost"
              size="sm"
              fullWidth
              onPress={() => router.push(`/l/hub/${hub.slug}`)}
            />
            <Button
              label="Digital Business Card"
              variant="ghost"
              size="sm"
              fullWidth
              onPress={() => router.push(`/card/hub/${hub.slug}`)}
            />
            {joined && (
              <Text className="text-[9px] text-ink-faint text-center mt-1">
                Joined CulturePass in {joined}
              </Text>
            )}
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
        <Icon name="calendar" size={28} color={colors.inkFaint} />
        <Text variant="subheading" className="font-display font-bold">No events listed</Text>
        <Text variant="caption" tone="muted" className="text-center max-w-xs leading-4">
          This hub doesn’t have any upcoming public events scheduled yet.
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
              viewMode === "box" ? "bg-card shadow-xs border border-linen/10" : ""
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
              viewMode === "list" ? "bg-card shadow-xs border border-linen/10" : ""
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
          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
            Topics
          </Text>
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

function VerifiedCheck() {
  return (
    <View className="h-5 w-5 items-center justify-center rounded-full bg-eucalyptus-500">
      <Icon name="check" size={11} color={colors.paper} strokeWidth={2.6} />
    </View>
  );
}

function Stat({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-baseline gap-1 active:opacity-60">
      <Text className="font-display text-base font-bold text-ink">{value}</Text>
      <Text className="text-[10px] text-ink-faint">
        {label}
      </Text>
    </Pressable>
  );
}

function HubSkeleton() {
  return (
    <Screen maxWidth="prose" contentClassName="pt-0">
      <View
        className="rounded-b-3xl bg-sand"
        style={{ aspectRatio: 5 / 2, marginLeft: -20, marginRight: -20 }}
      />
      <View className="-mt-12 h-[88px] w-[88px] rounded-2xl border-4 border-paper bg-linen" />
      <View className="mt-4 gap-3">
        <View className="h-8 w-2/3 rounded-lg bg-sand animate-pulse" />
        <View className="h-4 w-1/3 rounded bg-sand animate-pulse" />
        <View className="h-4 w-full rounded bg-sand animate-pulse" />
      </View>
    </Screen>
  );
}
