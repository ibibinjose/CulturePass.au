import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  Screen,
  Text,
  BackButton,
  Card,
  Icon,
} from "@/components/ui";
import { HubCard } from "@/features/hubs/HubCard";
import { useHubs } from "@/features/hubs/api";
import { EventCard } from "@/features/events/EventCard";
import { useEvents } from "@/features/events/api";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

export default function TagScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const decodedTag = tag ? decodeURIComponent(tag) : "";

  const [viewMode, setViewMode] = useState<"box" | "list">("box");

  // Fetch events with this tag
  const { data: events, isLoading: eventsLoading, isError: eventsError } = useEvents({
    tag: decodedTag,
  });

  // Fetch hubs with this tag
  const { data: hubs, isLoading: hubsLoading, isError: hubsError } = useHubs({
    tag: decodedTag,
  });

  return (
    <Screen contentClassName="pt-6 px-gutter">
      <BackButton fallbackHref="/" className="mb-4" />

      {/* Header Banner */}
      <View className="mb-8 rounded-3xl bg-pink-500 border border-pink-600 p-8 shadow-subtle">
        <Text variant="overline" className="text-white/80">
          Tag Directory
        </Text>
        <Text variant="display" className="text-4xl text-white font-display mt-1">
          #{decodedTag}
        </Text>
        <Text variant="bodyLarge" className="text-white/90 mt-2 leading-6 max-w-prose">
          Explore upcoming events and active communities hosting meetups, workshops, and activities tagged with #{decodedTag}.
        </Text>
      </View>

      <View className="gap-10 lg:flex-row lg:items-start lg:gap-10">
        {/* Main Section: Events */}
        <View className="flex-1 gap-6">
          <View className="flex-row items-center justify-between border-b border-linen pb-3">
            <View>
              <Text variant="heading">Upcoming events</Text>
              <Text variant="caption" tone="faint" className="mt-0.5">
                {eventsLoading
                  ? "Loading events…"
                  : events
                  ? `${events.length} event${events.length === 1 ? "" : "s"} found`
                  : "0 events found"}
              </Text>
            </View>

            {/* Layout Toggle */}
            {events && events.length > 0 ? (
              <View className="flex-row items-center gap-1 bg-sand/50 p-0.5 rounded-xl border border-linen/40">
                <Pressable
                  onPress={() => setViewMode("box")}
                  className={cn(
                    "px-3 py-1 rounded-lg flex-row items-center gap-1.5",
                    viewMode === "box" ? "bg-card shadow-subtle border border-linen/20" : ""
                  )}
                >
                  <Icon name="grid" size={13} color={viewMode === "box" ? colors.ink : colors.inkMuted} />
                  <Text variant="caption" className={cn("text-xs font-heading", viewMode === "box" ? "text-ink" : "text-ink-muted")}>
                    Box
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setViewMode("list")}
                  className={cn(
                    "px-3 py-1 rounded-lg flex-row items-center gap-1.5",
                    viewMode === "list" ? "bg-card shadow-subtle border border-linen/20" : ""
                  )}
                >
                  <Icon name="menu" size={13} color={viewMode === "list" ? colors.ink : colors.inkMuted} />
                  <Text variant="caption" className={cn("text-xs font-heading", viewMode === "list" ? "text-ink" : "text-ink-muted")}>
                    List
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {eventsLoading ? (
            <Card>
              <Text variant="caption" tone="faint">
                Loading events…
              </Text>
            </Card>
          ) : eventsError ? (
            <Card>
              <Text variant="caption" tone="muted">
                Could not load events.
              </Text>
            </Card>
          ) : events && events.length > 0 ? (
            <View className={cn("gap-4", viewMode === "box" ? "md:flex-row md:flex-wrap" : "flex-column")}>
              {events.map((event) => (
                <View
                  key={event.id}
                  className={cn(
                    viewMode === "box"
                      ? "w-full md:w-[calc(50%-8px)]"
                      : "w-full"
                  )}
                >
                  <EventCard event={event} variant={viewMode} />
                </View>
              ))}
            </View>
          ) : (
            <Card className="items-start gap-1 py-10">
              <Text variant="subheading">No events found</Text>
              <Text variant="caption" tone="muted">
                There are no upcoming events scheduled with this tag yet.
              </Text>
            </Card>
          )}
        </View>

        {/* Sidebar: Communities / Hubs */}
        <View className="lg:w-[320px] w-full gap-5">
          <View className="border-b border-linen pb-3">
            <Text variant="heading">Active hubs</Text>
            <Text variant="caption" tone="faint" className="mt-0.5">
              {hubsLoading
                ? "Loading hubs…"
                : hubs
                ? `${hubs.length} communit${hubs.length === 1 ? "y" : "ies"} matching`
                : "0 hubs matching"}
            </Text>
          </View>

          {hubsLoading ? (
            <Card>
              <Text variant="caption" tone="faint">
                Loading communities…
              </Text>
            </Card>
          ) : hubsError ? (
            <Card>
              <Text variant="caption" tone="muted">
                Could not load hubs.
              </Text>
            </Card>
          ) : hubs && hubs.length > 0 ? (
            <View className="gap-4">
              {hubs.map((hub) => (
                <HubCard key={hub.slug} hub={hub} />
              ))}
            </View>
          ) : (
            <Card className="items-start gap-1">
              <Text variant="subheading" className="text-sm">No hubs yet</Text>
              <Text variant="caption" tone="muted" className="text-xs">
                No active communities are currently tagged with #{decodedTag}.
              </Text>
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}
