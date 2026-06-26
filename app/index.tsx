import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { AcknowledgementBar } from "@/components/cultural/AcknowledgementBar";
import { HubCard } from "@/features/hubs/HubCard";
import { useHubs, useHubStateCounts } from "@/features/hubs/api";
import { EventCard } from "@/features/events/EventCard";
import { useEvents, useEventStateCounts } from "@/features/events/api";
import { AUSTRALIAN_STATES } from "@/lib/constants";

type ResultMode = "all" | "hubs" | "events";

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<ResultMode>("all");
  const query = search.trim();

  const { data: hubs, isLoading: hubsLoading, isError: hubsError } = useHubs(
    query ? { search: query } : {},
  );
  const { data: events, isLoading: eventsLoading, isError: eventsError } = useEvents(
    query ? { search: query } : {},
  );
  const { data: hubCounts } = useHubStateCounts();
  const { data: eventCounts } = useEventStateCounts();

  const featuredHubs = hubs?.slice(0, query ? 6 : 4) ?? [];
  const featuredEvents = events?.slice(0, query ? 6 : 4) ?? [];

  const showEvents = mode === "all" || mode === "events";
  const showHubs = mode === "all" || mode === "hubs";

  return (
    <Screen contentClassName="pt-8">
      {/* Hero */}
      <View className="overflow-hidden rounded-2xl border border-linen bg-ink p-6 lg:p-8">
        <Text variant="overline" tone="inverse">
          CulturePass Australia
        </Text>
        <Text variant="display" tone="inverse" className="mt-3 max-w-[640px]">
          Culture, nearby.
        </Text>
        <Text variant="body" tone="inverse" className="mt-3 max-w-[460px] opacity-75">
          Discover events, hubs and community across Australia.
        </Text>
        <View className="mt-6 flex-row flex-wrap gap-3">
          <Button label="Find events" variant="secondary" onPress={() => router.push("/explore")} />
          <Button label="Add a hub" variant="whatsapp" onPress={() => router.push("/create/hub")} />
        </View>
      </View>

      {/* Search */}
      <Card className="mt-6 gap-4">
        <View className="gap-2 md:flex-row md:items-center">
          <View className="flex-1">
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search events, hubs or places"
              returnKeyType="search"
              autoCorrect={false}
            />
          </View>
          <Button
            label="Browse"
            className="md:w-[160px]"
            onPress={() => router.push("/explore")}
          />
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Chip label="All" selected={mode === "all"} onPress={() => setMode("all")} />
          <Chip label="Communities" selected={mode === "hubs"} onPress={() => setMode("hubs")} />
          <Chip label="Events" selected={mode === "events"} onPress={() => setMode("events")} />
        </View>
      </Card>

      {/* Discovery */}
      <View className="mt-10 gap-8 lg:flex-row lg:items-start">
        <View className="flex-1 gap-10">
          {showEvents ? (
            <DiscoverySection
              title={query ? "Matching events" : "Coming up"}
              loading={eventsLoading}
              error={eventsError}
              emptyTitle={query ? "No events match that yet" : "No upcoming events yet"}
              emptyBody="Events appear here as organisers publish them."
              actionLabel="Add an event"
              onAction={() => router.push("/create/event")}
            >
              {featuredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </DiscoverySection>
          ) : null}

          {showHubs ? (
            <DiscoverySection
              title={query ? "Matching communities" : "Recently added"}
              loading={hubsLoading}
              error={hubsError}
              emptyTitle={query ? "No communities match that yet" : "No communities yet"}
              emptyBody="Be the first to create a hub for your community."
              actionLabel="Create a hub"
              onAction={() => router.push("/create/hub")}
            >
              {featuredHubs.map((hub) => (
                <HubCard key={hub.slug} hub={hub} />
              ))}
            </DiscoverySection>
          ) : null}
        </View>

        {/* Explore by state */}
        <View className="lg:w-[320px]">
          <Card className="gap-4 bg-sand">
            <Text variant="subheading">Explore by state</Text>
            <View className="gap-2">
              {AUSTRALIAN_STATES.map((state) => {
                const hubCount = hubCounts?.[state.code] ?? 0;
                const eventCount = eventCounts?.[state.code] ?? 0;
                const hasContent = hubCount + eventCount > 0;
                return (
                  <Pressable
                    key={state.code}
                    onPress={() => router.push(`/state/${state.code}`)}
                    className="flex-row items-center justify-between gap-3 rounded-lg border border-linen bg-card p-4 active:bg-paper"
                  >
                    <Text variant="label" className="text-base">
                      {state.name}
                    </Text>
                    <Text variant="caption" tone={hasContent ? "eucalyptus" : "faint"}>
                      {hubCount} · {eventCount}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>
      </View>

      <AcknowledgementBar className="mb-6 mt-12" />
    </Screen>
  );
}

function DiscoverySection({
  title,
  loading,
  error,
  emptyTitle,
  emptyBody,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  loading: boolean;
  error: boolean;
  emptyTitle: string;
  emptyBody: string;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;

  return (
    <View className="gap-4">
      <Text variant="heading">{title}</Text>
      {loading ? (
        <Card>
          <Text variant="caption" tone="faint">
            Loading…
          </Text>
        </Card>
      ) : error ? (
        <Card>
          <Text variant="caption" tone="muted">
            Could not load this section. Check your connection and try again.
          </Text>
        </Card>
      ) : hasChildren ? (
        <View className="gap-4">{children}</View>
      ) : (
        <Card className="gap-3">
          <Text variant="subheading">{emptyTitle}</Text>
          <Text variant="caption" tone="muted">
            {emptyBody}
          </Text>
          <Button
            label={actionLabel}
            variant="whatsapp"
            size="sm"
            className="self-start"
            onPress={onAction}
          />
        </Card>
      )}
    </View>
  );
}
