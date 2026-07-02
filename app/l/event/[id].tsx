import { View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  Screen,
  Text,
  Button,
  Badge,
  LinkButtons,
  ShareBar,
  Pinwheel,
  Skeleton,
  SkeletonText,
  type LinkItem,
} from "@/components/ui";
import { useEvent } from "@/features/events/api";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/constants";

import { getEventTimezone } from "@/lib/utils/timezone";

/** Link-in-bio (linktree-style) page for an event. */
export default function EventLinkInBio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(id ?? "");

  if (isLoading) {
    return (
      <Screen maxWidth="form" contentClassName="pt-section">
        <Skeleton className="w-full rounded-[22px]" style={{ aspectRatio: 1 }} />
        <View className="mt-6 items-center gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </View>
        <SkeletonText lines={3} className="mt-6" />
        <Skeleton className="mt-8 h-12 w-full rounded-xl" />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen maxWidth="form" contentClassName="pt-section">
        <Text variant="title">Not available</Text>
        <Text variant="body" tone="muted" className="mt-3">
          This event is unpublished or doesn’t exist.
        </Text>
      </Screen>
    );
  }

  const hubRel = (event as { hub?: { name: string; slug: string } | { name: string; slug: string }[] }).hub;
  const hub = Array.isArray(hubRel) ? hubRel[0] : hubRel;
  const coverUrl = event.images?.[0]?.url ?? null;
  const place = [event.location_city, event.location_state].filter(Boolean).join(", ");
  const eventTimezone = getEventTimezone(event.location_state);
  const when = event.start_time
    ? new Intl.DateTimeFormat("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: eventTimezone,
        timeZoneName: "short",
      }).format(new Date(event.start_time))
    : null;

  const items: LinkItem[] = [];
  if (event.ticket_url) items.push({ label: "Get tickets", href: event.ticket_url });

  return (
    <Screen maxWidth="form" contentClassName="pt-section">
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={{ width: "100%", aspectRatio: 1, borderRadius: 22 }}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      <View className="mt-6 items-center gap-2">
        <Badge label={EVENT_TYPE_LABELS[event.type as EventType]} />
        <Text variant="title" className="text-center">
          {event.title}
        </Text>
        {when ? (
          <Text variant="body" tone="muted" className="text-center">
            {when}
          </Text>
        ) : null}
        {place ? (
          <Text variant="caption" tone="faint" className="text-center">
            {place}
          </Text>
        ) : null}
        <View className="mt-1 flex-row gap-2">
          {event.is_free ? (
            <Badge label="Free" variant="success" />
          ) : event.price ? (
            <Badge label={`$${event.price}`} variant="info" />
          ) : null}
        </View>
      </View>

      {event.description ? (
        <Text variant="body" className="mt-6 text-center leading-7">
          {event.description}
        </Text>
      ) : null}

      <LinkButtons className="mt-8" items={items} />

      <Button
        label="View event details"
        variant="outline"
        className="mt-3"
        onPress={() => router.push(`/event/${event.id}`)}
      />
      {hub?.slug ? (
        <Button
          label={`Hosted by ${hub.name}`}
          variant="ghost"
          className="mt-2"
          onPress={() => router.push(`/hub/${hub.slug}`)}
        />
      ) : null}

      <ShareBar
        className="mt-8"
        path={`/l/event/${event.id}`}
        title={event.title}
        message={event.description ?? undefined}
      />

      <View className="mt-10 items-center gap-2">
        <Pinwheel size={22} />
        <Text variant="overline" tone="faint" className="text-center">
          Powered by CulturePass Australia
        </Text>
      </View>
    </Screen>
  );
}
