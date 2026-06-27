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

const titleShadow = {
  textShadowColor: "rgba(20,16,12,0.55)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 12,
};

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
      className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-sand active:opacity-95"
    >
      {cover ? (
        <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={180} />
      ) : (
        <View className="flex-1 items-center justify-center bg-eucalyptus-50">
          <Text className="font-display text-7xl text-eucalyptus-100">
            {event.title.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Scrim — two stacked layers approximate a bottom gradient for legibility. */}
      <View className="absolute inset-0 bg-ink/15" />
      <View className="absolute inset-x-0 bottom-0 h-3/5 bg-ink/55" />

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

      {/* Content */}
      <View className="absolute inset-x-0 bottom-0 gap-2 p-5">
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge label={EVENT_TYPE_LABELS[event.type]} variant="ink" />
          {price ? <Badge label={price} variant={event.is_free ? "success" : "ink"} /> : null}
        </View>
        <Text variant="heading" tone="inverse" numberOfLines={2} style={titleShadow}>
          {event.title}
        </Text>
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          {start ? (
            <View className="flex-row items-center gap-1.5">
              <Icon name="calendar" size={14} color={colors.paper} />
              <Text variant="caption" tone="inverse" style={titleShadow}>
                {dateFmt.format(start)}
              </Text>
            </View>
          ) : null}
          {place ? (
            <View className="flex-row items-center gap-1.5">
              <Icon name="map-pin" size={14} color={colors.paper} />
              <Text variant="caption" tone="inverse" style={titleShadow}>
                {place}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
