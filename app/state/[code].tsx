import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  BackButton,
  Button,
  Card,
  Screen,
  Text,
} from "@/components/ui";
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
    <Screen contentClassName="pt-6 md:pt-8">
      <BackButton className="mb-4" />

      {/* Header */}
      <View className="overflow-hidden rounded-3xl border-2 border-teal-500 bg-green-700 p-7 md:p-11">
        <Text variant="overline" className="text-gold-500">
          {stateCode}
        </Text>
        <Text variant="display" tone="white" className="mt-3">
          {state?.name ?? "Australia"}
        </Text>
        <Text variant="lead" className="mt-3 max-w-[560px] text-white/85">
          Hubs, communities and upcoming cultural events across {state?.name ?? "this state"}.
        </Text>
        <View className="mt-7 flex-row gap-8">
          <View>
            <Text variant="display" tone="white">
              {hubCount}
            </Text>
            <Text variant="caption" className="text-white/75">
              Hubs
            </Text>
          </View>
          <View>
            <Text variant="display" tone="white">
              {eventCount}
            </Text>
            <Text variant="caption" className="text-white/75">
              Events
            </Text>
          </View>
        </View>
      </View>

      {/* Upcoming events */}
      <View className="mt-section gap-5">
        <View className="gap-1">
          <Text variant="overline" tone="pink">
            Soon
          </Text>
          <Text variant="title">Upcoming events</Text>
        </View>
        {eventsLoading ? (
          <Text variant="caption" tone="faint">
            Loading events…
          </Text>
        ) : eventsError ? (
          <Card>
            <Text variant="caption" tone="muted">
              Could not load events for {stateCode}. Connect Supabase to see results.
            </Text>
          </Card>
        ) : events && events.length > 0 ? (
          <View className="gap-4 md:flex-row md:flex-wrap">
            {events.slice(0, 6).map((event) => (
              <View key={event.id} className="md:w-[calc(50%-8px)]">
                <EventCard event={event} />
              </View>
            ))}
          </View>
        ) : (
          <Card className="items-start gap-3">
            <Text variant="subheading">No events in {stateCode} yet</Text>
            <Text variant="caption" tone="muted">
              Add the first event so people can see what is happening here.
            </Text>
            <Button label="Add an event" variant="secondary" onPress={() => router.push("/create/event")} />
          </Card>
        )}
      </View>

      {/* Community hubs */}
      <View className="mt-section gap-5">
        <View className="gap-1">
          <Text variant="overline" tone="pink">
            Communities
          </Text>
          <Text variant="title">Community hubs</Text>
        </View>
        {isLoading ? (
          <Text variant="caption" tone="faint">
            Loading hubs…
          </Text>
        ) : isError ? (
          <Card>
            <Text variant="caption" tone="muted">
              Couldn’t load hubs for {stateCode}. Connect Supabase to see results.
            </Text>
          </Card>
        ) : hubs && hubs.length > 0 ? (
          <View className="gap-4 md:flex-row md:flex-wrap">
            {hubs.map((hub) => (
              <View key={hub.slug} className="md:w-[calc(50%-8px)]">
                <HubCard hub={hub} />
              </View>
            ))}
          </View>
        ) : (
          <Card className="items-start gap-3">
            <Text variant="subheading">No pages in {stateCode} yet</Text>
            <Text variant="caption" tone="muted">
              Create one to get your community started.
            </Text>
            <Button label="Create a page" variant="secondary" onPress={() => router.push("/create/hub")} />
          </Card>
        )}
      </View>
    </Screen>
  );
}
