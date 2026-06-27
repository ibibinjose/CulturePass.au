import { useState, type ReactNode } from "react";
import { Linking, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";

import {
  Screen,
  Text,
  Button,
  BackButton,
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
import { useHub } from "@/features/hubs/api";
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

  if (isLoading) return <HubSkeleton />;

  if (isError || !hub) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-6">
        <BackButton fallbackHref="/explore" />
        <Card className="mt-8 items-start gap-2">
          <Text variant="title">Hub not found</Text>
          <Text variant="body" tone="muted">
            It may be unpublished, or your Supabase project isn’t connected yet.
          </Text>
          <Button
            label="Browse hubs"
            variant="secondary"
            className="mt-4"
            onPress={() => router.replace("/explore")}
          />
        </Card>
      </Screen>
    );
  }

  // `council` is the embedded reference row from the select() join.
  const council = (hub as { council?: { name: string; traditional_custodians: string[] | null } })
    .council;
  const custodians =
    (hub.traditional_custodians && hub.traditional_custodians.length > 0
      ? hub.traditional_custodians
      : council?.traditional_custodians) ?? null;
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");

  // Pick a cover (banner) and a logo (avatar) from the hub's images.
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
      // surfaced quietly; the inbox is reachable from the menu
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
    council?.name ? { key: "council", icon: "users" as IconName, title: "Council", value: council.name } : null,
    place ? { key: "loc", icon: "map-pin" as IconName, title: "Location", value: place } : null,
    hub.location_postcode ? { key: "pc", icon: "map-pin" as IconName, title: "Postcode", value: hub.location_postcode } : null,
  ].filter(Boolean) as { key: string; icon: IconName; title: string; value: string; onPress?: () => void }[];

  const primaryAction = isOwnerOrEditor ? (
    <Button label="Edit hub" variant="outline" size="sm" onPress={() => router.push(`/hub/edit/${hub.slug}`)} />
  ) : hub.website ? (
    <Button label="Visit website" variant="primary" size="sm" onPress={() => openUrl(hub.website!)} />
  ) : hub.address || place ? (
    <Button label="Directions" variant="outline" size="sm" onPress={openDirections} />
  ) : null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "events", label: eventCount > 0 ? `Events · ${eventCount}` : "Events" },
    { key: "about", label: "About" },
    { key: "details", label: "Details" },
  ];

  return (
    <Screen maxWidth="prose" contentClassName="pt-0">
      {/* Cover banner with a floating back button (full-bleed across the gutter) */}
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
            <Text className="font-display text-7xl text-linen">
              {hub.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="absolute left-3 top-3">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/explore"))}
            accessibilityLabel="Go back"
            hitSlop={6}
            className="h-10 w-10 items-center justify-center rounded-pill bg-ink/45 active:bg-ink/60"
          >
            <Icon name="arrow-left" size={20} color={colors.paper} />
          </Pressable>
        </View>
      </View>

      {/* Avatar (overlapping) + primary action */}
      <View className="flex-row items-end justify-between">
        <View className="-mt-12">
          <Avatar name={hub.name} uri={logoUrl} size={88} ring />
        </View>
        <View className="pb-1">{primaryAction}</View>
      </View>

      {/* Identity */}
      <View className="mt-4 gap-3">
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <Text variant="title">{hub.name}</Text>
            {isVerified ? <VerifiedCheck /> : null}
          </View>
          <Text variant="caption" tone="faint">
            @{hub.slug} · {HUB_TYPE_LABELS[hub.type as HubType]}
          </Text>
        </View>

        {hub.indigenous_led ? <IndigenousLedBadge /> : null}

        {hub.short_description ? (
          <Text variant="bodyLarge" className="leading-7">
            {hub.short_description}
          </Text>
        ) : null}

        {/* Meta line — location · website · joined */}
        <MetaRow>
          {place ? <MetaItem icon="map-pin" text={place} /> : null}
          {custodians && custodians.length > 0 ? (
            <MetaItem text={`${custodians.join(" • ")} Country`} tone="eucalyptus" />
          ) : null}
          {websiteLabel && hub.website ? (
            <MetaItem icon="globe" text={websiteLabel} tone="eucalyptus" onPress={() => openUrl(hub.website!)} />
          ) : null}
          {joined ? <MetaItem icon="clock" text={`Joined ${joined}`} /> : null}
        </MetaRow>

        {/* Stats */}
        <View className="mt-1 flex-row flex-wrap gap-x-7 gap-y-2">
          <Stat value={eventCount} label="Events" onPress={() => setTab("events")} />
          {topics.length > 0 ? <Stat value={topics.length} label="Topics" onPress={() => setTab("about")} /> : null}
          {partners.length > 0 ? <Stat value={partners.length} label="Partners" onPress={() => setTab("about")} /> : null}
        </View>

        {/* Message organiser (non-owners) */}
        {!isOwnerOrEditor ? (
          <Button
            label="Message organiser"
            variant="secondary"
            className="mt-1"
            loading={startConversation.isPending}
            leftIcon={<Icon name="chat" size={18} color={colors.paper} />}
            onPress={messageOrganiser}
          />
        ) : null}

        {/* Share & shareable surfaces */}
        <View className="mt-1 flex-row flex-wrap gap-3">
          <ShareButton path={`/hub/${hub.slug}`} title={hub.name} message={hub.short_description ?? undefined} />
          <Button label="Link in bio" variant="outline" size="sm" onPress={() => router.push(`/l/hub/${hub.slug}`)} />
          <Button label="Business card" variant="outline" size="sm" onPress={() => router.push(`/card/hub/${hub.slug}`)} />
        </View>
      </View>

      {/* Welcome to Country — kept visible above the tabs, as a sign of respect */}
      <WelcomeToCountry statement={hub.welcome_to_country} custodians={custodians} className="mt-6" />

      {/* Tabs */}
      <View className="mt-6 flex-row gap-6 border-b border-linen">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} className="items-center">
              <Text
                variant="label"
                className={cn("pb-3 font-heading text-sm", active ? "text-ink" : "text-ink-faint")}
              >
                {t.label}
              </Text>
              <View className={cn("h-0.5 w-full rounded-pill", active ? "bg-ochre-500" : "bg-transparent")} />
            </Pressable>
          );
        })}
      </View>

      {/* Tab content */}
      <View className="pb-4 pt-6">
        {tab === "events" ? (
          <EventsTab
            events={events}
            loading={eventsLoading}
            count={eventCount}
            isOwner={isOwnerOrEditor}
            hubId={hub.id}
            ownerId={hub.owner_id}
          />
        ) : tab === "about" ? (
          <AboutTab fullDescription={hub.full_description} topics={topics} partners={partners} />
        ) : (
          <DetailsTab rows={detailRows} />
        )}
      </View>
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Tabs                                                                       */
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
  if (loading) {
    return (
      <Text variant="caption" tone="faint">
        Loading events…
      </Text>
    );
  }

  if (count === 0) {
    return (
      <Card className="items-start gap-1">
        <Text variant="subheading">No events yet</Text>
        <Text variant="caption" tone="muted">
          This hub doesn’t have any events scheduled.
        </Text>
        {isOwner ? (
          <CreateEventButton
            hubId={hubId}
            hubOwnerId={ownerId}
            label="Create your first event"
            variant="secondary"
            size="md"
            className="mt-4 self-start"
          />
        ) : null}
      </Card>
    );
  }

  return (
    <View className="gap-4">
      {isOwner ? (
        <CreateEventButton
          hubId={hubId}
          hubOwnerId={ownerId}
          label="+ Add event"
          variant="outline"
          size="sm"
          className="self-start"
        />
      ) : null}
      {events?.map((event) => <EventCard key={event.id} event={event} />)}
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
  if (!fullDescription && topics.length === 0 && partners.length === 0) {
    return (
      <Text variant="caption" tone="faint">
        Nothing here yet.
      </Text>
    );
  }
  return (
    <View className="gap-8">
      {fullDescription ? (
        <Text variant="bodyLarge" className="leading-7">
          {fullDescription}
        </Text>
      ) : null}

      {topics.length > 0 ? (
        <View className="gap-3">
          <Text variant="overline" tone="pink">
            Topics
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {topics.map((topic) => (
              <View key={topic} className="rounded-pill bg-sand px-3.5 py-2">
                <Text variant="label" className="text-sm text-ink-muted">
                  {topic}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {partners.length > 0 ? (
        <View className="gap-3">
          <Text variant="overline" tone="eucalyptus">
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
      <Text variant="caption" tone="faint">
        No contact details yet.
      </Text>
    );
  }
  return (
    <Card padded={false} className="px-5">
      {rows.map((row, i) => (
        <View key={row.key}>
          {i > 0 ? <Divider /> : null}
          <ListRow
            title={row.title}
            value={row.value}
            onPress={row.onPress}
            left={
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-sand">
                <Icon name={row.icon} size={17} color={colors.inkMuted} />
              </View>
            }
          />
        </View>
      ))}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Bits                                                                       */
/* -------------------------------------------------------------------------- */

function VerifiedCheck() {
  return (
    <View className="h-5 w-5 items-center justify-center rounded-pill bg-eucalyptus-500">
      <Icon name="check" size={12} color={colors.paper} strokeWidth={2.6} />
    </View>
  );
}

function Stat({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-baseline gap-1.5 active:opacity-60">
      <Text className="font-display text-lg text-ink">{value}</Text>
      <Text variant="caption" tone="faint">
        {label}
      </Text>
    </Pressable>
  );
}

function MetaRow({ children }: { children: ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  if (items.length === 0) return null;
  return <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">{items}</View>;
}

function MetaItem({
  icon,
  text,
  tone = "faint",
  onPress,
}: {
  icon?: IconName;
  text: string;
  tone?: "faint" | "eucalyptus";
  onPress?: () => void;
}) {
  const color = tone === "eucalyptus" ? colors.eucalyptus : colors.inkFaint;
  return (
    <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-center gap-1.5 active:opacity-60">
      {icon ? <Icon name={icon} size={14} color={color} /> : null}
      <Text variant="caption" tone={tone} className={cn(onPress && "underline")}>
        {text}
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
      <View className="-mt-12 h-[88px] w-[88px] rounded-pill border-4 border-paper bg-linen" />
      <View className="mt-4 gap-3">
        <View className="h-8 w-2/3 rounded-lg bg-sand" />
        <View className="h-4 w-1/3 rounded bg-sand" />
        <View className="h-4 w-full rounded bg-sand" />
        <View className="h-4 w-1/2 rounded bg-sand" />
      </View>
    </Screen>
  );
}
