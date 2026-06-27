import { Linking, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { ShareButton } from "@/components/ui/ShareButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { colors } from "@/lib/theme";
import { useEvent } from "@/features/events/api";
import { useMyProfile } from "@/features/profiles/api";
import { useBuyTicket } from "@/features/tickets/api";
import {
  EVENT_TYPE_LABELS,
  HUB_TYPE_LABELS,
  type EventType,
  type HubType,
} from "@/lib/constants";

const dateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const timeFormatter = new Intl.DateTimeFormat("en-AU", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export default function EventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, isLoading, isError } = useEvent(id ?? "");
  const { data: profile } = useMyProfile();
  const buyTicket = useBuyTicket();

  if (isLoading) return <EventSkeleton />;

  if (isError || !event) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-6">
        <BackButton fallbackHref="/explore" />
        <Card className="mt-8 items-start gap-3">
          <Text variant="title">Event not found</Text>
          <Text variant="body" tone="muted">
            It may be unpublished, cancelled, or your Supabase project is not connected yet.
          </Text>
          <Button
            label="Browse events"
            variant="secondary"
            className="mt-3"
            onPress={() => router.replace("/explore")}
          />
        </Card>
      </Screen>
    );
  }

  const place = [event.location_city, event.location_state].filter(Boolean).join(", ");
  const coverUrl = event.images?.find((image) => image.type === "cover")?.url ?? event.images?.[0]?.url ?? null;
  const start = event.start_time ? new Date(event.start_time) : null;
  const end = event.end_time ? new Date(event.end_time) : null;
  const when = start ? dateTimeFormatter.format(start) : "Date to be announced";
  const shortWhen = start ? shortDateFormatter.format(start) : "TBA";
  const timeRange = start
    ? `${timeFormatter.format(start)}${end ? ` - ${timeFormatter.format(end)}` : ""}`
    : "Time to be announced";
  const price = event.is_free ? "Free" : event.price ? `$${event.price}` : "Ticketed";
  const statusTone =
    event.status === "published" ? "eucalyptus" : event.status === "draft" ? "warning" : "danger";
  const statusLabel =
    event.status === "published" ? "Published" : event.status === "draft" ? "Draft" : "Cancelled";
  const ownerId = (event.hub as { owner_id?: string } | null)?.owner_id;
  const isOwner = !!profile && ownerId === profile.id;
  const isPaidTicketed = !event.is_free && !!event.price && Number(event.price) > 0;

  const handleBuy = () => {
    if (!profile) {
      router.push("/sign-in");
      return;
    }
    buyTicket.mutate({ eventId: event.id, quantity: 1 });
  };

  const openTicketUrl = () => {
    if (!event.ticket_url) return;
    const url = /^https?:\/\//i.test(event.ticket_url) ? event.ticket_url : `https://${event.ticket_url}`;
    Linking.openURL(url).catch(() => {});
  };

  const openDirections = () => {
    const query = encodeURIComponent(place || event.title);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {});
  };

  return (
    <Screen contentClassName="pt-0">
      <View
        className="relative overflow-hidden rounded-b-3xl bg-sand"
        style={{ aspectRatio: 2.55, marginLeft: -20, marginRight: -20 }}
      >
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="flex-1 justify-end bg-eucalyptus-50 p-8">
            <Text className="font-display text-7xl text-eucalyptus-100">
              {event.title.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="absolute left-3 top-3">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/explore"))}
            accessibilityLabel="Go back"
            hitSlop={6}
            className="h-10 w-10 items-center justify-center rounded-pill bg-ink/50 active:bg-ink/70"
          >
            <Icon name="arrow-left" size={20} color={colors.paper} />
          </Pressable>
        </View>
      </View>

      <View className="-mt-10 gap-6 lg:flex-row lg:items-start lg:gap-8">
        <View className="flex-1 gap-8">
          <Card elevated className="gap-5">
            <View className="flex-row flex-wrap items-center gap-2">
              <Badge label={EVENT_TYPE_LABELS[event.type as EventType]} variant="ochre" />
              <Badge label={price} variant={event.is_free ? "success" : "ink"} />
              <Badge label={statusLabel} variant={statusTone} dot />
            </View>

            <View className="gap-3">
              <Text variant="display">{event.title}</Text>
              {event.description ? (
                <Text variant="bodyLarge" tone="muted" className="max-w-[760px] leading-7">
                  {event.description}
                </Text>
              ) : null}
            </View>

            <View className="gap-3 md:flex-row">
              {event.ticket_url ? (
                <Button
                  label="Get tickets"
                  variant="primary"
                  className="md:flex-1"
                  onPress={openTicketUrl}
                  rightIcon={<Icon name="external" size={17} color={colors.paper} />}
                />
              ) : isPaidTicketed ? (
                <Button
                  label={`Buy ticket · ${price}`}
                  variant="whatsapp"
                  className="md:flex-1"
                  loading={buyTicket.isPending}
                  onPress={handleBuy}
                  leftIcon={<Icon name="ticket" size={18} color="#FFFFFF" />}
                />
              ) : event.is_free ? (
                <Button label="Free event" variant="outline" disabled className="md:flex-1" />
              ) : (
                <Button label="Tickets TBA" variant="outline" disabled className="md:flex-1" />
              )}
              {place ? (
                <Button label="Directions" variant="outline" className="md:flex-1" onPress={openDirections} />
              ) : null}
            </View>

            {buyTicket.isError ? (
              <Text variant="caption" className="text-terracotta-600">
                {(buyTicket.error as Error)?.message ?? "Couldn’t start checkout."}
              </Text>
            ) : null}

            <View className="flex-row flex-wrap gap-3">
              <ShareButton path={`/event/${event.id}`} title={event.title} message={event.description ?? undefined} />
              <Button label="Link in bio" variant="outline" size="sm" onPress={() => router.push(`/l/event/${event.id}`)} />
              {isOwner ? (
                <Button label="Edit" variant="secondary" size="sm" onPress={() => router.push(`/event/edit/${event.id}`)} />
              ) : null}
            </View>
          </Card>

          <View className="gap-4">
            <SectionHeader eyebrow="Details" title="About this event" />
            <Card padded={false} className="px-5">
              <InfoRow icon="calendar" label="When" title={when} subtitle={end ? `Ends ${dateTimeFormatter.format(end)}` : undefined} />
              <Divider />
              <InfoRow icon="clock" label="Time" title={timeRange} />
              {place ? (
                <>
                  <Divider />
                  <InfoRow icon="map-pin" label="Where" title={place} action="Open map" onPress={openDirections} />
                </>
              ) : null}
              <Divider />
              <InfoRow
                icon="ticket"
                label="Tickets"
                title={price}
                subtitle={event.ticket_url ? "External ticket link available" : "Ticket details have not been added yet"}
                action={event.ticket_url ? "Open" : undefined}
                onPress={event.ticket_url ? openTicketUrl : undefined}
              />
              {event.capacity ? (
                <>
                  <Divider />
                  <InfoRow icon="users" label="Capacity" title={`${event.capacity} places`} subtitle={`${event.rsvp_count ?? 0} RSVPs recorded`} />
                </>
              ) : null}
            </Card>
          </View>

          {event.cultural_focus && event.cultural_focus.length > 0 ? (
            <TagSection title="Cultural focus" items={event.cultural_focus} tone="eucalyptus" />
          ) : null}

          {event.tags && event.tags.length > 0 ? <TagSection title="Tags" items={event.tags} /> : null}
        </View>

        <View className="gap-5 lg:w-[340px]">
          <Card tone="green" className="gap-4">
            <Text variant="overline" className="text-gold-500">
              Event snapshot
            </Text>
            <SnapshotItem icon="calendar" label="Date" value={shortWhen} />
            <SnapshotItem icon="clock" label="Time" value={timeRange} />
            <SnapshotItem icon="ticket" label="Cost" value={price} />
            {place ? <SnapshotItem icon="map-pin" label="Place" value={place} /> : null}
          </Card>

          {event.hub ? (
            <Card className="gap-3" onPress={() => event.hub && router.push(`/hub/${event.hub.slug}`)}>
              <Text variant="overline" tone="pink">
                Hosted by
              </Text>
              <Text variant="subheading">{event.hub.name}</Text>
              <Text variant="caption" tone="muted">
                {HUB_TYPE_LABELS[event.hub.type as HubType]}
              </Text>
              {event.hub.indigenous_led ? <Badge label="Indigenous-led" variant="eucalyptus" dot /> : null}
              {event.hub.traditional_custodians?.length ? (
                <Text variant="caption" tone="eucalyptus">
                  {event.hub.traditional_custodians.join(" • ")} Country
                </Text>
              ) : null}
            </Card>
          ) : null}

          <View className="gap-3 rounded-3xl border border-linen bg-sand p-5">
            <Text variant="subheading">Plan your visit</Text>
            <Text variant="caption" tone="muted">
              Tickets, access and arrival notes.
            </Text>
            {event.ticket_url ? (
              <Button label="Open ticket page" variant="secondary" size="sm" onPress={openTicketUrl} />
            ) : null}
          </View>
        </View>
      </View>
    </Screen>
  );
}

function EventSkeleton() {
  return (
    <Screen contentClassName="pt-8">
      <View className="gap-4">
        <View className="h-48 rounded-2xl bg-sand" />
        <Card className="gap-3">
          <Text variant="caption" tone="faint">
            Loading event…
          </Text>
          <View className="h-8 w-2/3 rounded-lg bg-sand" />
          <View className="h-4 w-full rounded-lg bg-sand" />
          <View className="h-4 w-3/4 rounded-lg bg-sand" />
        </Card>
      </View>
    </Screen>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <View className="gap-1">
      {eyebrow ? (
        <Text variant="overline" tone="pink">
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="heading">{title}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  title,
  subtitle,
  action,
  onPress,
}: {
  icon: IconName;
  label: string;
  title: string;
  subtitle?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3.5 py-4">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-sand">
        <Icon name={icon} size={18} color={colors.inkMuted} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text variant="overline" tone="faint">
          {label}
        </Text>
        <Text variant="label" className="text-base">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action && onPress ? (
        <Button label={action} variant="ghost" size="sm" onPress={onPress} />
      ) : null}
    </View>
  );
}

function TagSection({ title, items, tone }: { title: string; items: string[]; tone?: "eucalyptus" }) {
  return (
    <View className="gap-3">
      <SectionHeader title={title} />
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} label={item} variant={tone === "eucalyptus" ? "eucalyptus" : "outline"} />
        ))}
      </View>
    </View>
  );
}

function SnapshotItem({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3 border-t border-white/20 pt-3">
      <Icon name={icon} size={17} color={colors.white} />
      <View className="flex-1">
        <Text variant="overline" className="text-white/70">
          {label}
        </Text>
        <Text variant="label" tone="white" className="mt-0.5 text-base">
          {value}
        </Text>
      </View>
    </View>
  );
}
