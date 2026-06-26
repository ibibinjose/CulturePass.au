import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HubCard } from "@/features/hubs/HubCard";
import { useHubs } from "@/features/hubs/api";
import { EventCard } from "@/features/events/EventCard";
import { useEvents } from "@/features/events/api";
import { AUSTRALIAN_STATES, type StateCode } from "@/lib/constants";

export default function StateScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const stateCode = (code ?? "").toUpperCase() as StateCode;
  const state = AUSTRALIAN_STATES.find((s) => s.code === stateCode);
  const { data: hubs, isLoading, isError } = useHubs({ state: stateCode });
  const { data: events, isLoading: eventsLoading, isError: eventsError } = useEvents({
    state: stateCode,
  });
  const hubCount = hubs?.length ?? 0;
  const eventCount = events?.length ?? 0;

  return (
    <Screen contentClassName="pt-10">
      <Button
        label="← Back"
        variant="ghost"
        size="sm"
        className="mb-6 self-start"
        onPress={() => router.back()}
      />

      <Text variant="overline" tone="faint">
        {stateCode}
      </Text>
      <Text variant="title" className="mt-2">
        {state?.name ?? "Australia"}
      </Text>
      <Text variant="body" tone="muted" className="mt-2">
        Hubs, communities and upcoming cultural events across {state?.name ?? "this state"}.
      </Text>

      <View className="mt-8 flex-row flex-wrap gap-3">
        <Card className="min-w-[150px] flex-1 bg-sand">
          <Text variant="title">{hubCount}</Text>
          <Text variant="caption" tone="muted" className="mt-1">
            Hubs
          </Text>
        </Card>
        <Card className="min-w-[150px] flex-1 bg-sand">
          <Text variant="title">{eventCount}</Text>
          <Text variant="caption" tone="muted" className="mt-1">
            Events
          </Text>
        </Card>
      </View>

      <View className="mt-10 gap-4">
        <Text variant="heading">Upcoming events</Text>
        {eventsLoading ? (
          <Text variant="caption" tone="faint">
            Loading events...
          </Text>
        ) : eventsError ? (
          <Card>
            <Text variant="caption" tone="muted">
              Could not load events for {stateCode}. Connect Supabase to see results.
            </Text>
          </Card>
        ) : events && events.length > 0 ? (
          events.slice(0, 6).map((event) => <EventCard key={event.id} event={event} />)
        ) : (
          <Card className="gap-3">
            <Text variant="subheading">No events in {stateCode} yet</Text>
            <Text variant="caption" tone="muted">
              Add the first event so people can see what is happening here.
            </Text>
            <Button
              label="Add an event"
              variant="secondary"
              className="self-start"
              onPress={() => router.push("/create/event")}
            />
          </Card>
        )}
      </View>

      <View className="mt-10 gap-4">
        <Text variant="heading">Community hubs</Text>
        {isLoading ? (
          <Text variant="caption" tone="faint">
            Loading hubs...
          </Text>
        ) : isError ? (
          <Card>
            <Text variant="caption" tone="muted">
              Couldn’t load hubs for {stateCode}. Connect Supabase to see results.
            </Text>
          </Card>
        ) : hubs && hubs.length > 0 ? (
          hubs.map((hub) => <HubCard key={hub.slug} hub={hub} />)
        ) : (
          <Card className="gap-3">
            <Text variant="subheading">No hubs in {stateCode} yet</Text>
            <Text variant="caption" tone="muted">
              Create one to get your community started.
            </Text>
            <Button
              label="Create a hub"
              variant="secondary"
              className="self-start"
              onPress={() => router.push("/create/hub")}
            />
          </Card>
        )}
      </View>
    </Screen>
  );
}
