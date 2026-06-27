import { Linking, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  Screen,
  Text,
  Button,
  BackButton,
  Badge,
  Card,
  Divider,
  ShareButton,
  Icon,
  Avatar,
} from "@/components/ui";
import { colors } from "@/lib/theme";
import {
  useEvent,
  useEventSubscriptionStatus,
  useToggleEventSubscription,
} from "@/features/events/api";
import { useMyProfile } from "@/features/profiles/api";
import { useBuyTicket } from "@/features/tickets/api";
import {
  EVENT_TYPE_LABELS,
  type EventType,
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

export default function EventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, isLoading, isError } = useEvent(id ?? "");
  const { data: profile } = useMyProfile();
  const buyTicket = useBuyTicket();

  const { data: subStatus } = useEventSubscriptionStatus(event?.id || "");
  const toggleSub = useToggleEventSubscription();

  const handleSubscribe = () => {
    if (!profile) {
      router.push("/sign-in");
      return;
    }
    if (event) {
      toggleSub.mutate({ eventId: event.id, subscribed: !!subStatus?.subscribed });
    }
  };

  if (isLoading) return <EventSkeleton />;

  if (isError || !event) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-6">
        <BackButton fallbackHref="/" />
        <Card className="mt-8 items-start gap-3">
          <Text variant="title">Event not found</Text>
          <Text variant="body" tone="muted">
            It may be unpublished, cancelled, or your Supabase project is not connected yet.
          </Text>
          <Button
            label="Browse events"
            variant="secondary"
            className="mt-3"
            onPress={() => router.replace("/")}
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

  const hostImages = (event.hub as any)?.images ?? [];
  const hostLogoUrl = hostImages.find((img: any) => img?.type === "logo")?.url ?? null;

  return (
    <Screen contentClassName="pt-6 px-gutter">
      <BackButton fallbackHref="/" className="mb-4" />

      <View className="gap-8 lg:flex-row lg:items-start lg:gap-10">
        {/* Left Column: Media + Info */}
        <View className="flex-1 gap-6">
          {/* Cover Image */}
          <View className="overflow-hidden rounded-3xl bg-sand shadow-subtle aspect-[2/1] w-full">
            {coverUrl ? (
              <Image
                source={{ uri: coverUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-eucalyptus-50 p-8">
                <Text className="font-display text-8xl text-eucalyptus-100/50">
                  {event.title.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Event Title */}
          <View className="gap-3">
            <View className="flex-row flex-wrap items-center gap-2">
              <Badge label={EVENT_TYPE_LABELS[event.type as EventType]} variant="ochre" />
              <Badge label={statusLabel} variant={statusTone} dot />
            </View>
            <Text variant="display" className="text-3xl md:text-4xl font-display text-ink leading-tight">
              {event.title}
            </Text>
          </View>

          {/* Host Info */}
          {event.hub ? (
            <Pressable
              onPress={() => event.hub && router.push(`/hub/${event.hub.slug}`)}
              className="flex-row items-center gap-3 rounded-2xl border border-linen bg-card p-4 active:bg-sand/40"
            >
              <Avatar name={event.hub.name} uri={hostLogoUrl} size={44} />
              <View className="flex-1">
                <Text variant="caption" tone="faint">Hosted by</Text>
                <Text variant="label" className="font-heading text-base text-ink">
                  {event.hub.name}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.inkMuted} />
            </Pressable>
          ) : null}

          {/* Description */}
          {event.description ? (
            <View className="gap-3">
              <Text variant="heading" className="text-xl font-heading text-ink">About this event</Text>
              <Text variant="bodyLarge" tone="muted" className="leading-7">
                {event.description}
              </Text>
            </View>
          ) : null}

          {/* Tags & Cultural Focus */}
          {event.cultural_focus && event.cultural_focus.length > 0 ? (
            <TagSection title="Cultural focus" items={event.cultural_focus} tone="eucalyptus" />
          ) : null}

          {event.tags && event.tags.length > 0 ? (
            <TagSection title="Tags" items={event.tags} />
          ) : null}
        </View>

        {/* Right Column: Luma Ticket / Logistics Card */}
        <View className="gap-6 lg:w-[360px] w-full">
          <Card className="gap-6 border border-linen bg-card rounded-3xl shadow-card p-6">
            {/* Price Badge */}
            <View className="flex-row items-center justify-between">
              <Text variant="overline" tone="faint">Registration</Text>
              <Badge label={price} variant={event.is_free ? "success" : "ink"} className="px-3 py-1 text-sm font-heading" />
            </View>

            {/* Date / Time */}
            <View className="flex-row items-start gap-4">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sand/60">
                <Icon name="calendar" size={20} color={colors.ink} />
              </View>
              <View className="flex-1">
                <Text variant="caption" tone="faint">Date & Time</Text>
                <Text variant="label" className="text-base font-heading text-ink mt-0.5">
                  {when}
                </Text>
                <Text variant="caption" tone="muted" className="mt-0.5">
                  {timeRange}
                </Text>
              </View>
            </View>

            <Divider />

            {/* Location */}
            {place ? (
              <View className="flex-row items-start gap-4">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sand/60">
                  <Icon name="map-pin" size={20} color={colors.ink} />
                </View>
                <View className="flex-1">
                  <Text variant="caption" tone="faint">Location</Text>
                  <Text variant="label" className="text-base font-heading text-ink mt-0.5">
                    {place}
                  </Text>
                  <Pressable onPress={openDirections} className="mt-1">
                    <Text variant="caption" className="text-ochre-600 font-heading underline">
                      Open map
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {place ? <Divider /> : null}

            {/* Event capacity & RSVPs */}
            <View className="flex-row items-start gap-4">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sand/60">
                <Icon name="users" size={20} color={colors.ink} />
              </View>
              <View className="flex-1">
                <Text variant="caption" tone="faint">Guest List</Text>
                <Text variant="label" className="text-base font-heading text-ink mt-0.5">
                  {event.rsvp_count ?? 0} attending
                </Text>
                {event.capacity ? (
                  <Text variant="caption" tone="muted" className="mt-0.5">
                    {event.capacity - (event.rsvp_count ?? 0)} spots remaining (Capacity: {event.capacity})
                  </Text>
                ) : null}
              </View>
            </View>

            <Divider />

            {/* Primary Action Button */}
            <View className="gap-3">
              {event.ticket_url ? (
                <Button
                  label="Get tickets"
                  variant="primary"
                  fullWidth
                  onPress={openTicketUrl}
                  rightIcon={<Icon name="external" size={17} color={colors.ink} />}
                />
              ) : isPaidTicketed ? (
                <Button
                  label={`Buy ticket · ${price}`}
                  variant="whatsapp"
                  fullWidth
                  loading={buyTicket.isPending}
                  onPress={handleBuy}
                  leftIcon={<Icon name="ticket" size={18} color="#FFFFFF" />}
                />
              ) : null}

              {/* Subscribe button (highly prominent RSVP option) */}
              <Button
                label={subStatus?.subscribed ? "Subscribed" : "Subscribe to Event"}
                variant={subStatus?.subscribed ? "whatsapp" : "outline"}
                fullWidth
                leftIcon={
                  <Icon
                    name={subStatus?.subscribed ? "check" : "bell"}
                    size={16}
                    color={subStatus?.subscribed ? colors.ink : colors.ink}
                  />
                }
                onPress={handleSubscribe}
                loading={toggleSub.isPending}
              />
            </View>

            {buyTicket.isError ? (
              <Text variant="caption" className="text-terracotta-600 text-center">
                {(buyTicket.error as Error)?.message ?? "Couldn’t start checkout."}
              </Text>
            ) : null}

            {/* Share action */}
            <View className="flex-row items-center gap-3 mt-2">
              <ShareButton path={`/event/${event.id}`} title={event.title} message={event.description ?? undefined} className="flex-1" />
              <Button label="Link in bio" variant="outline" size="sm" className="flex-1" onPress={() => router.push(`/l/event/${event.id}`)} />
            </View>

            {isOwner ? (
              <Button
                label="Edit Event Settings"
                variant="secondary"
                size="sm"
                fullWidth
                className="mt-2"
                onPress={() => router.push(`/event/edit/${event.id}`)}
              />
            ) : null}
          </Card>
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

function TagSection({ title, items, tone }: { title: string; items: string[]; tone?: "eucalyptus" }) {
  const router = useRouter();
  return (
    <View className="gap-3">
      <SectionHeader title={title} />
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => (
          <Pressable
            key={item}
            onPress={() => router.push(`/tag/${encodeURIComponent(item)}`)}
            className="active:opacity-80"
            accessibilityRole="link"
            accessibilityLabel={`View events tagged with ${item}`}
          >
            <Badge label={item} variant={tone === "eucalyptus" ? "eucalyptus" : "outline"} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
