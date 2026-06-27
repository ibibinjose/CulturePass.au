import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { colors } from "@/lib/theme";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/constants";
import type { HubImage } from "@/lib/supabase/database.types";
import { useSavedEvents } from "@/features/events/useSavedEvents";

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
  rsvp_count: number | null;
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
  const saved = useSavedEvents((s) => s.ids.includes(event.id));
  const toggleSaved = useSavedEvents((s) => s.toggle);

  const place = [event.location_city, event.location_state].filter(Boolean).join(", ");
  const coverUrl =
    event.images?.find((image) => image.type === "cover")?.url ?? event.images?.[0]?.url ?? null;
  const start = event.start_time ? new Date(event.start_time) : null;
  const priceLabel = event.is_free ? "Free" : event.price ? `$${event.price}` : null;
  const going = event.rsvp_count ?? 0;

  return (
    <Card onPress={() => router.push(`/event/${event.id}`)} padded={false} className="overflow-hidden">
      {/* Cover */}
      <View className="relative aspect-[16/10] bg-sand">
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-eucalyptus-50">
            <Text className="font-display text-6xl text-eucalyptus-100">
              {event.title.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Date chip */}
        {start ? (
          <View className="absolute left-3 top-3 items-center rounded-xl bg-paper/95 px-3 py-1.5 shadow-subtle">
            <Text variant="overline" tone="pink">
              {dateFormatter.format(start)}
            </Text>
            <Text className="font-heading text-sm leading-tight text-ink">
              {timeFormatter.format(start)}
            </Text>
          </View>
        ) : null}

        {/* Save / bookmark */}
        <Pressable
          onPress={() => toggleSaved(event.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove from saved" : "Save event"}
          accessibilityState={{ selected: saved }}
          className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-pill bg-ink/45 active:bg-ink/65"
        >
          <Icon name="heart" size={18} color={saved ? colors.terracotta : "#FFFFFF"} filled={saved} />
        </Pressable>

        {/* Price chip */}
        {priceLabel ? (
          <View className="absolute bottom-3 right-3 rounded-pill bg-ink/85 px-3 py-1.5">
            <Text className="font-heading text-xs text-paper">{priceLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View className="gap-2.5 p-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge label={EVENT_TYPE_LABELS[event.type]} variant="neutral" />
          {event.hub?.indigenous_led ? <IndigenousLedBadge /> : null}
        </View>

        <Text variant="subheading" numberOfLines={2}>
          {event.title}
        </Text>

        {place ? (
          <View className="flex-row items-center gap-1.5">
            <Icon name="map-pin" size={14} color={colors.inkFaint} />
            <Text variant="caption" tone="faint" numberOfLines={1} className="flex-1">
              {place}
            </Text>
          </View>
        ) : null}

        {event.cultural_focus.length > 0 ? (
          <Text variant="caption" tone="eucalyptus" numberOfLines={1}>
            {event.cultural_focus.join(" • ")}
          </Text>
        ) : null}

        {/* Host + community interest */}
        <View className="mt-0.5 flex-row items-center justify-between gap-2">
          {event.hub ? (
            <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
              By {event.hub.name}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          {going > 0 ? (
            <View className="flex-row items-center gap-1.5">
              <Icon name="users" size={14} color={colors.inkMuted} />
              <Text variant="caption" tone="muted">
                {going} going
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
