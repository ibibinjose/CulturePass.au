import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/lib/theme";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import type { EventCardData } from "@/features/events/EventCard";
import { useSavedEvents } from "@/features/events/useSavedEvents";

const dateFmt = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** Large image-forward banner card for the "Featured / Happening soon" rail. */
export function FeaturedEventCard({ event }: { event: EventCardData }) {
  const router = useRouter();
  const saved = useSavedEvents((s) => s.ids.includes(event.id));
  const toggleSaved = useSavedEvents((s) => s.toggle);

  const cover = event.images?.find((i) => i.type === "cover")?.url ?? event.images?.[0]?.url ?? null;
  const start = event.start_time ? new Date(event.start_time) : null;
  const place = [event.location_city, event.location_state].filter(Boolean).join(", ");
  const price = event.is_free ? "Free" : event.price ? `$${event.price}` : null;

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      className="overflow-hidden rounded-3xl bg-card active:opacity-95"
    >
      {/* Cover — 1:1 square */}
      <View className="relative aspect-square bg-sand">
        {cover ? (
          <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={180} />
        ) : (
          <View className="flex-1 items-center justify-center bg-eucalyptus-50">
            <Text className="font-display text-7xl text-eucalyptus-100">
              {event.title.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Save */}
        <Pressable
          onPress={() => toggleSaved(event.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove from saved" : "Save event"}
          className="absolute right-3.5 top-3.5 h-10 w-10 items-center justify-center rounded-pill bg-ink/45 active:bg-ink/65"
        >
          <Icon name="heart" size={19} color={saved ? colors.terracotta : "#FFFFFF"} filled={saved} />
        </Pressable>
      </View>

      {/* Info below image */}
      <View className="gap-2 p-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge label={EVENT_TYPE_LABELS[event.type]} variant="ink" />
          {price ? <Badge label={price} variant={event.is_free ? "success" : "ink"} /> : null}
        </View>

        <Text variant="heading" numberOfLines={2}>
          {event.title}
        </Text>

        {/* Date & time */}
        {start ? (
          <View className="flex-row items-center gap-1.5">
            <Icon name="calendar" size={14} color={colors.inkMuted} />
            <Text variant="caption" tone="muted">
              {dateFmt.format(start)}
            </Text>
          </View>
        ) : null}

        {/* Location */}
        {place ? (
          <View className="flex-row items-center gap-1.5">
            <Icon name="map-pin" size={14} color={colors.inkMuted} />
            <Text variant="caption" tone="muted">
              {place}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
