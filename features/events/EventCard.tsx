import { View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/constants";
import type { HubImage } from "@/lib/supabase/database.types";

export interface EventCardData {
  id: string;
  hub_id: string;
  type: EventType;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  is_free: boolean;
  price: number | null;
  location_city: string | null;
  location_state: string | null;
  images: HubImage[];
  cultural_focus: string[];
  hub: {
    name: string;
    slug: string;
    indigenous_led: boolean;
    traditional_custodians: string[];
  } | null;
}

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const timeFormatter = new Intl.DateTimeFormat("en-AU", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function EventCard({ event }: { event: EventCardData }) {
  const router = useRouter();
  const place = [event.location_city, event.location_state].filter(Boolean).join(", ");
  const coverUrl =
    event.images?.find((image) => image.type === "cover")?.url ?? event.images?.[0]?.url ?? null;
  const start = event.start_time ? new Date(event.start_time) : null;
  const priceLabel = event.is_free ? "Free" : event.price ? `$${event.price}` : null;

  return (
    <Card
      onPress={() => router.push(`/event/${event.id}`)}
      padded={false}
      className="overflow-hidden"
    >
      {/* Cover */}
      <View className="relative aspect-[16/9] bg-sand">
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-eucalyptus-50">
            <Text className="font-display text-5xl text-eucalyptus-100">
              {event.title.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Date chip */}
        {start ? (
          <View className="absolute left-3 top-3 items-center rounded-lg bg-paper/95 px-2.5 py-1">
            <Text variant="overline" tone="ochre">
              {dateFormatter.format(start)}
            </Text>
            <Text variant="label" className="text-sm leading-none">
              {timeFormatter.format(start)}
            </Text>
          </View>
        ) : null}

        {/* Price chip */}
        {priceLabel ? (
          <View className="absolute right-3 top-3 rounded-pill bg-ink/80 px-2.5 py-1">
            <Text variant="label" className="text-xs text-paper">
              {priceLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View className="gap-2 p-4">
        <View className="flex-row items-center gap-2">
          <Badge label={EVENT_TYPE_LABELS[event.type]} variant="neutral" />
          {event.hub?.indigenous_led ? <Badge label="Indigenous-led" variant="eucalyptus" /> : null}
        </View>

        <Text variant="subheading" numberOfLines={2}>
          {event.title}
        </Text>

        {place ? (
          <Text variant="caption" tone="faint" numberOfLines={1}>
            {place}
          </Text>
        ) : null}

        {event.cultural_focus.length > 0 ? (
          <Text variant="caption" tone="eucalyptus" numberOfLines={1}>
            {event.cultural_focus.join(" • ")}
          </Text>
        ) : null}

        {event.hub ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            By {event.hub.name}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
