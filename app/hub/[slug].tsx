import { useState, type ReactNode } from "react";
import { Linking, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";

import {
  Screen,
  Text,
  Button,
  Badge,
  Card,
  Divider,
  ListRow,
  Avatar,
} from "@/components/ui";
import { WelcomeToCountry } from "@/components/cultural/WelcomeToCountry";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { EventCard } from "@/features/events/EventCard";
import { CreateEventButton } from "@/features/events/CreateEventButton";
import { useHub } from "@/features/hubs/api";
import { useHubEvents } from "@/features/events/api";
import { useMyProfile } from "@/features/profiles/api";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

type TabKey = "events" | "about" | "details";

export default function HubScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: hub, isLoading, isError } = useHub(slug ?? "");
  const { data: events, isLoading: eventsLoading } = useHubEvents(hub?.id || "");
  const { data: profile } = useMyProfile();
  const [tab, setTab] = useState<TabKey>("events");

  if (isLoading) return <HubSkeleton />;

  if (isError || !hub) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-10">
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Card className="mt-8 gap-2">
          <Text variant="title">Hub not found</Text>
          <Text variant="body" tone="muted">
            It may be unpublished, or your Supabase project isn’t connected yet.
          </Text>
          <Button
            label="Browse hubs"
            variant="secondary"
            className="mt-4 self-start"
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

  const detailRows = [
    websiteLabel && hub.website
      ? { key: "web", title: "Website", value: websiteLabel, onPress: () => openUrl(hub.website!) }
      : null,
    hub.contact_email
      ? {
          key: "email",
          title: "Email",
          value: hub.contact_email,
          onPress: () => openEmail(hub.contact_email!),
        }
      : null,
    hub.phone
      ? { key: "phone", title: "Phone", value: hub.phone, onPress: () => openPhone(hub.phone!) }
      : null,
    hub.address
      ? { key: "address", title: "Address", value: hub.address, onPress: openDirections }
      : null,
    council?.name ? { key: "council", title: "Council", value: council.name } : null,
    place ? { key: "loc", title: "Location", value: place } : null,
    hub.location_postcode ? { key: "pc", title: "Postcode", value: hub.location_postcode } : null,
  ].filter(Boolean) as { key: string; title: string; value: string; onPress?: () => void }[];

  const primaryAction = isOwnerOrEditor ? (
    <Button
      label="Edit hub"
      variant="outline"
      size="sm"
      onPress={() => router.push(`/hub/edit/${hub.slug}`)}
    />
  ) : hub.website ? (
    <Button
      label="Visit website"
      variant="primary"
      size="sm"
      onPress={() => openUrl(hub.website!)}
    />
  ) : hub.address || place ? (
    <Button label="Directions" variant="outline" size="sm" onPress={openDirections} />
  ) : null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "events", label: eventCount > 0 ? `Events · ${eventCount}` : "Events" },
    { key: "about", label: "About" },
    { key: "details", label: "Details" },
  ];

  return (
    <Screen maxWidth="prose" contentClassName="pt-0" edges={["bottom"]}>
      {/* Cover banner with a floating back button (full-bleed across the gutter) */}
      <View
        className="relative overflow-hidden bg-sand"
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
              hub.indigenous_led ? "bg-eucalyptus-50" : "bg-sand",
            )}
          >
            <Text className="font-display text-6xl text-linen">
              {hub.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="absolute left-3 top-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            className="h-9 w-9 items-center justify-center rounded-pill bg-ink/45 active:bg-ink/60"
          >
            <Text className="font-heading text-lg text-paper">←</Text>
          </Pressable>
        </View>
      </View>

      {/* Avatar (overlapping) + primary action */}
      <View className="flex-row items-end justify-between">
        <View className="-mt-12 rounded-pill bg-paper p-1">
          <Avatar name={hub.name} uri={logoUrl} size={84} />
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
          <Text variant="body" className="leading-7">
            {hub.short_description}
          </Text>
        ) : null}

        {/* Meta line — location · website · joined */}
        <MetaRow>
          {place ? <MetaItem text={place} /> : null}
          {custodians && custodians.length > 0 ? (
            <MetaItem text={`${custodians.join(" • ")} Country`} tone="eucalyptus" />
          ) : null}
          {websiteLabel && hub.website ? (
            <MetaItem text={websiteLabel} tone="eucalyptus" onPress={() => openUrl(hub.website!)} />
          ) : null}
          {joined ? <MetaItem text={`Joined ${joined}`} /> : null}
        </MetaRow>

        {/* Stats */}
        <View className="mt-1 flex-row flex-wrap gap-x-6 gap-y-2">
          <Stat value={eventCount} label="Events" onPress={() => setTab("events")} />
          {topics.length > 0 ? (
            <Stat value={topics.length} label="Topics" onPress={() => setTab("about")} />
          ) : null}
          {partners.length > 0 ? (
            <Stat value={partners.length} label="Partners" onPress={() => setTab("about")} />
          ) : null}
        </View>
      </View>

      {/* Welcome to Country — kept visible above the tabs, as a sign of respect */}
      <WelcomeToCountry
        statement={hub.welcome_to_country}
        custodians={custodians}
        className="mt-6"
      />

      {/* Tabs */}
      <View className="mt-6 flex-row gap-6 border-b border-linen">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} className="items-center">
              <Text
                variant="label"
                className={cn("pb-3 text-sm", active ? "text-ink" : "text-ink-faint")}
              >
                {t.label}
              </Text>
              <View
                className={cn("h-0.5 w-full rounded-pill", active ? "bg-ink" : "bg-transparent")}
              />
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
        <Text variant="body" className="leading-7">
          {fullDescription}
        </Text>
      ) : null}

      {topics.length > 0 ? (
        <View className="gap-3">
          <Text variant="overline" tone="faint">
            Topics
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {topics.map((topic) => (
              <View key={topic} className="rounded-pill bg-sand px-3 py-1.5">
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
          <Text variant="overline" tone="faint">
            Indigenous partners
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {partners.map((p) => (
              <Badge key={p} label={p} variant="outline" />
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
  rows: { key: string; title: string; value: string; onPress?: () => void }[];
}) {
  if (rows.length === 0) {
    return (
      <Text variant="caption" tone="faint">
        No contact details yet.
      </Text>
    );
  }
  return (
    <Card className="px-5 py-1">
      {rows.map((row, i) => (
        <View key={row.key}>
          {i > 0 ? <Divider /> : null}
          <ListRow title={row.title} value={row.value} onPress={row.onPress} />
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
      <Text className="font-heading text-2xs text-paper">✓</Text>
    </View>
  );
}

function Stat({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-baseline gap-1 active:opacity-60">
      <Text variant="label" className="text-base text-ink">
        {value}
      </Text>
      <Text variant="caption" tone="faint">
        {label}
      </Text>
    </Pressable>
  );
}

function MetaRow({ children }: { children: ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
      {items.map((node, i) => (
        <View key={i} className="flex-row items-center gap-2">
          {i > 0 ? (
            <Text variant="caption" tone="faint">
              ·
            </Text>
          ) : null}
          {node}
        </View>
      ))}
    </View>
  );
}

function MetaItem({
  text,
  tone = "faint",
  onPress,
}: {
  text: string;
  tone?: "faint" | "eucalyptus";
  onPress?: () => void;
}) {
  return (
    <Text
      variant="caption"
      tone={tone}
      onPress={onPress}
      className={cn(onPress && "underline")}
    >
      {text}
    </Text>
  );
}

function HubSkeleton() {
  return (
    <Screen maxWidth="prose" contentClassName="pt-0" edges={["bottom"]}>
      <View className="bg-sand" style={{ aspectRatio: 5 / 2, marginLeft: -20, marginRight: -20 }} />
      <View className="-mt-12 h-[92px] w-[92px] rounded-pill border-4 border-paper bg-sand" />
      <View className="mt-4 gap-3">
        <View className="h-8 w-2/3 rounded-lg bg-sand" />
        <View className="h-4 w-1/3 rounded bg-sand" />
        <View className="h-4 w-full rounded bg-sand" />
        <View className="h-4 w-1/2 rounded bg-sand" />
      </View>
    </Screen>
  );
}
