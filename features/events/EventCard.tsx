import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import {
  Badge,
  Card,
  Icon,
  Text,
} from "@/components/ui";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { colors } from "@/lib/theme";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/constants";
import type { HubImage } from "@/lib/types/database.types";
import { useSavedEvents } from "@/features/events/useSavedEvents";
import { useEventLikes, useToggleEventLike } from "@/features/events/api";
import { useMyProfile } from "@/features/profiles/api";
import { cn } from "@/lib/utils/cn";

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
    images: HubImage[];
  } | null;
  event_cohosts?: {
    id: string;
    role: "cohost" | "venue" | "partner" | "sponsor";
    status: "pending" | "accepted" | "declined";
    hub: {
      id: string;
      name: string;
      slug: string;
      images: any;
    } | null;
    profile: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    } | null;
  }[];
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

const getCountdownString = (startDate: Date | null) => {
  if (!startDate) return null;
  const now = new Date();
  const diffMs = startDate.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const diffMins = Math.floor(diffMs / 60000);
  const mins = diffMins % 60;
  const diffHrs = Math.floor(diffMins / 60);
  const hrs = diffHrs % 24;
  const days = Math.floor(diffHrs / 24);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (days > 0 || hrs > 0) parts.push(`${hrs}h`);
  parts.push(`${mins}m`);
  return `Starts in ${parts.join(" ")}`;
};

export type EventStatus = "live" | "upcoming" | "past";

export function getEventStatus(startTime: string | null, endTime: string | null): EventStatus {
  if (!startTime) return "upcoming";
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 3 * 60 * 60 * 1000);

  if (now >= start && now <= end) {
    return "live";
  } else if (now < start) {
    return "upcoming";
  } else {
    return "past";
  }
}

export interface EventCardProps {
  event: EventCardData;
  variant?: "box" | "list";
}

export function EventCard({ event, variant = "box" }: EventCardProps) {
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const isLoggedIn = !!profile;

  const acceptedCohosts = (event.event_cohosts ?? []).filter((c) => c.status === "accepted");
  const firstCohost = acceptedCohosts[0];
  const firstCohostName = firstCohost
    ? firstCohost.hub?.name || firstCohost.profile?.full_name
    : "";
  const cohostsSuffix = acceptedCohosts.length === 1 && firstCohostName
    ? ` + ${firstCohostName}`
    : acceptedCohosts.length > 1
    ? ` + ${acceptedCohosts.length} partners`
    : "";

  const localSaved = useSavedEvents((s) => s.ids.includes(event.id));
  const localToggle = useSavedEvents((s) => s.toggle);

  const { data: dbLikes } = useEventLikes(event.id);
  const dbToggle = useToggleEventLike();

  const saved = isLoggedIn ? (dbLikes?.liked ?? false) : localSaved;

  const handleToggleLike = () => {
    if (isLoggedIn) {
      dbToggle.mutate({ eventId: event.id, liked: saved });
    } else {
      localToggle(event.id);
    }
  };

  const place = [event.location_city, event.location_state].filter(Boolean).join(", ");
  const coverUrl =
    event.images?.find((image) => image.type === "cover")?.url ?? event.images?.[0]?.url ?? null;
  const start = event.start_time ? new Date(event.start_time) : null;
  const priceLabel = event.is_free ? "Free" : event.price ? `$${event.price}` : null;
  const going = event.rsvp_count ?? 0;
  const countdownText = getCountdownString(start);
  const status = getEventStatus(event.start_time, event.end_time);

  if (variant === "list") {
    return (
      <Card onPress={() => router.push(`/event/${event.id}`)} padded={false} className={cn("overflow-hidden p-3 flex-row gap-4", status === "past" && "opacity-60")}>
        {/* Left Side: Cover Image */}
        <View className="relative h-24 w-24 rounded-2xl overflow-hidden bg-sand">
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-eucalyptus-50">
              <Text className="font-display text-3xl text-eucalyptus-100">
                {event.title.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {status === "live" && (
            <View className="absolute top-1 left-1 rounded bg-emerald-600 px-1.5 py-0.5 shadow-sm">
              <Text className="font-heading text-[8px] text-white font-bold">● LIVE</Text>
            </View>
          )}
          {status === "past" && (
            <View className="absolute top-1 left-1 rounded bg-ink/55 px-1.5 py-0.5">
              <Text className="font-heading text-[8px] text-paper font-semibold">PAST</Text>
            </View>
          )}
          {priceLabel ? (
            <View className="absolute bottom-1 right-1 rounded bg-ink/80 px-1.5 py-0.5">
              <Text className="font-heading text-[10px] text-paper">{priceLabel}</Text>
            </View>
          ) : null}
        </View>

        {/* Right Side: Info Stack */}
        <View className="flex-1 justify-between py-0.5">
          <View className="gap-1">
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-row items-center gap-1.5">
                <Badge label={EVENT_TYPE_LABELS[event.type]} variant="neutral" className="px-2 py-0.5" />
                {event.hub?.indigenous_led ? <IndigenousLedBadge /> : null}
              </View>
              <Pressable
                onPress={handleToggleLike}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={saved ? "Remove from saved" : "Save event"}
                accessibilityState={{ selected: saved }}
                className="h-7 w-7 items-center justify-center rounded-pill bg-sand active:bg-linen"
              >
                <Icon name="heart" size={13} color={saved ? colors.terracotta : colors.inkMuted} filled={saved} />
              </Pressable>
            </View>

            <Text variant="label" className="text-base font-heading text-ink" numberOfLines={1}>
              {event.title}
            </Text>

            {start ? (
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Icon name="calendar" size={12} color={colors.inkFaint} />
                <Text variant="caption" tone="faint" numberOfLines={1} className="text-xs">
                  {dateFormatter.format(start)} · {timeFormatter.format(start)}
                </Text>
              </View>
            ) : null}

            {countdownText ? (
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Icon name="clock" size={12} color={colors.terracotta} />
                <Text variant="caption" className="text-xs font-semibold text-terracotta" numberOfLines={1}>
                  {countdownText}
                </Text>
              </View>
            ) : null}

            {place ? (
              <View className="flex-row items-center gap-1.5">
                <Icon name="map-pin" size={12} color={colors.inkFaint} />
                <Text variant="caption" tone="faint" numberOfLines={1} className="text-xs">
                  {place}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-center justify-between gap-2 border-t border-linen/30 pt-1.5 mt-1">
            {event.hub ? (
              <View className="flex-row items-center gap-1.5 flex-1">
                {event.hub.images && event.hub.images.length > 0 ? (
                  <View className="h-[16px] w-[16px] overflow-hidden rounded bg-sand border border-linen/20">
                    <Image
                      source={{ uri: event.hub.images.find((img: any) => img?.type === "logo")?.url }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  </View>
                ) : null}
                <Text variant="caption" tone="muted" numberOfLines={1} className="text-[11px] flex-1">
                  By {event.hub.name}{cohostsSuffix}
                </Text>
              </View>
            ) : (
              <View className="flex-1" />
            )}
            {going > 0 ? (
              <View className="flex-row items-center gap-1.5">
                <Icon name="users" size={12} color={colors.inkMuted} />
                <Text variant="caption" tone="muted" className="text-[11px]">
                  {going} going
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card onPress={() => router.push(`/event/${event.id}`)} padded={false} className={cn("overflow-hidden", status === "past" && "opacity-65")}>
      {/* Cover — 1:1 square */}
      <View className="relative aspect-square bg-sand">
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

        {/* Status Tag Overlay */}
        {status === "live" && (
          <View className="absolute left-3 top-3 bg-emerald-600 px-2.5 py-1 rounded-full shadow-sm">
            <Text className="text-[9px] font-heading uppercase tracking-widest text-white font-bold">
              ● Live Now
            </Text>
          </View>
        )}
        {status === "past" && (
          <View className="absolute left-3 top-3 bg-ink/65 px-2.5 py-1 rounded-full">
            <Text className="text-[9px] font-heading uppercase tracking-widest text-paper font-semibold">
              Past Event
            </Text>
          </View>
        )}

        {/* Save / bookmark */}
        <Pressable
          onPress={handleToggleLike}
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

        {/* Date & time */}
        {start ? (
          <View className="flex-row items-center gap-1.5">
            <Icon name="calendar" size={14} color={colors.inkFaint} />
            <Text variant="caption" tone="faint" numberOfLines={1} className="flex-1">
              {dateFormatter.format(start)} · {timeFormatter.format(start)}
            </Text>
          </View>
        ) : null}

        {countdownText ? (
          <View className="flex-row items-center gap-1.5">
            <Icon name="clock" size={14} color={colors.terracotta} />
            <Text variant="caption" className="flex-1 text-xs font-semibold text-terracotta" numberOfLines={1}>
              {countdownText}
            </Text>
          </View>
        ) : null}

        {/* Location */}
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
            <View className="flex-row items-center gap-1.5 flex-1">
              {event.hub.images && event.hub.images.length > 0 ? (
                <View className="h-[18px] w-[18px] overflow-hidden rounded bg-sand border border-linen/20">
                  <Image
                    source={{ uri: event.hub.images.find((img: any) => img?.type === "logo")?.url }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </View>
              ) : null}
              <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
                By {event.hub.name}{cohostsSuffix}
              </Text>
            </View>
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
