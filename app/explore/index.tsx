import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/lib/theme";
import { HubCard } from "@/features/hubs/HubCard";
import { useHubs, type HubFilters } from "@/features/hubs/api";
import { EventCard } from "@/features/events/EventCard";
import { useEvents } from "@/features/events/api";
import {
  AUSTRALIAN_STATES,
  HUB_TYPES,
  HUB_TYPE_DESCRIPTIONS,
  HUB_TYPE_LABELS,
  type HubType,
  type StateCode,
} from "@/lib/constants";

export default function ExploreScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [state, setState] = useState<StateCode | undefined>();
  const [type, setType] = useState<HubType | undefined>();
  const [indigenousLed, setIndigenousLed] = useState(false);

  const filters: HubFilters = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(state ? { state } : {}),
    ...(type ? { type } : {}),
    ...(indigenousLed ? { indigenousLed: true } : {}),
  };
  const { data: hubs, isLoading, isError } = useHubs(filters);
  const { data: events, isLoading: eventsLoading } = useEvents(state ? { state } : {});

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (state ? 1 : 0) + (type ? 1 : 0) + (indigenousLed ? 1 : 0);
  const featuredHubs = hubs?.slice(0, 6) ?? [];
  const upcomingEvents = events?.slice(0, 4) ?? [];

  const clearFilters = () => {
    setSearch("");
    setState(undefined);
    setType(undefined);
    setIndigenousLed(false);
  };

  return (
    <Screen contentClassName="pt-5 md:pt-7">
      <BackButton className="mb-3" />

      {/* Hero */}
      <View className="overflow-hidden rounded-3xl border-2 border-teal-500 bg-green-700">
        <View className="gap-8 p-7 md:flex-row md:items-end md:justify-between md:p-11">
          <View className="max-w-[680px] flex-1">
            <Text variant="overline" className="text-gold-500">
              Explore
            </Text>
            <Text variant="display" tone="white" className="mt-3 max-w-[760px]">
              Find your next community.
            </Text>
            <Text variant="lead" className="mt-4 max-w-[560px] text-white/85">
              Hubs, organisers, spaces and events across Australia.
            </Text>
          </View>

          <View className="w-full gap-3 md:max-w-[280px]">
            <Button label="Create hub" variant="primary" onPress={() => router.push("/create/hub")} />
            <Button label="Add event" variant="secondary" onPress={() => router.push("/create/event")} />
          </View>
        </View>

        <View className="flex-row border-t border-white/20 px-4 py-3 md:px-6">
          <Metric label="Published hubs" value={isLoading ? "…" : String(hubs?.length ?? 0)} />
          <Metric label="Upcoming events" value={eventsLoading ? "…" : String(events?.length ?? 0)} />
          <Metric label="States & territories" value={String(AUSTRALIAN_STATES.length)} />
        </View>
      </View>

      <View className="mt-8 gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Finder */}
        <View className="gap-5 lg:w-[340px]">
          <Card className="gap-5">
            <View className="flex-row items-center gap-2">
              <Icon name="filter" size={18} color={colors.ink} />
              <Text variant="heading">Finder</Text>
            </View>

            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search communities or places"
              returnKeyType="search"
              autoCorrect={false}
              leftIcon={<Icon name="search" size={18} color={colors.inkFaint} />}
            />

            <FilterGroup title="Focus">
              <Chip
                label="Indigenous-led"
                selected={indigenousLed}
                onPress={() => setIndigenousLed((v) => !v)}
              />
            </FilterGroup>

            <FilterGroup title="State or territory">
              {AUSTRALIAN_STATES.map((item) => (
                <Chip
                  key={item.code}
                  label={item.code}
                  selected={state === item.code}
                  onPress={() => setState((cur) => (cur === item.code ? undefined : item.code))}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Hub type">
              {HUB_TYPES.map((item) => (
                <Chip
                  key={item}
                  label={HUB_TYPE_LABELS[item]}
                  selected={type === item}
                  onPress={() => setType((cur) => (cur === item ? undefined : item))}
                />
              ))}
            </FilterGroup>

            {activeFilterCount > 0 ? (
              <Button
                label={`Clear ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"}`}
                variant="outline"
                size="sm"
                onPress={clearFilters}
              />
            ) : null}
          </Card>

          <View className="gap-4 rounded-3xl border border-linen bg-sand p-5">
            <Text variant="subheading">Browse by purpose</Text>
            <View className="gap-3">
              {HUB_TYPES.slice(0, 4).map((item) => (
                <PurposeRow
                  key={item}
                  title={HUB_TYPE_LABELS[item]}
                  description={HUB_TYPE_DESCRIPTIONS[item]}
                  selected={type === item}
                  onPress={() => setType((cur) => (cur === item ? undefined : item))}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Results */}
        <View className="flex-1 gap-10">
          <View className="gap-5">
            <View className="flex-row items-end justify-between gap-3">
              <View className="gap-1">
                <Text variant="overline" tone="pink">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`
                    : "Recently added"}
                </Text>
                <Text variant="title">{search.trim() ? "Matching hubs" : "Featured hubs"}</Text>
              </View>
              <Button label="My hubs" variant="outline" size="sm" onPress={() => router.push("/my-hubs")} />
            </View>

            {isLoading ? (
              <Card>
                <Text variant="caption" tone="faint">
                  Loading communities…
                </Text>
              </Card>
            ) : isError ? (
              <Card>
                <Text variant="caption" tone="muted">
                  Could not load hubs. Connect your Supabase project to see results.
                </Text>
              </Card>
            ) : featuredHubs.length > 0 ? (
              <View className="gap-4 md:flex-row md:flex-wrap">
                {featuredHubs.map((hub) => (
                  <View key={hub.slug} className="md:w-[calc(50%-8px)]">
                    <HubCard hub={hub} />
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                title="No communities match that yet"
                body="Try broadening the filters, or create the first hub for this community."
                action="Create a hub"
                onPress={() => router.push("/create/hub")}
              />
            )}
          </View>

          <View className="gap-5">
            <View className="gap-1">
              <Text variant="overline" tone="pink">
                Soon
              </Text>
              <Text variant="title">Upcoming events</Text>
            </View>

            {eventsLoading ? (
              <Card>
                <Text variant="caption" tone="faint">
                  Loading events…
                </Text>
              </Card>
            ) : upcomingEvents.length > 0 ? (
              <View className="gap-4 md:flex-row md:flex-wrap">
                {upcomingEvents.map((event) => (
                  <View key={event.id} className="md:w-[calc(50%-8px)]">
                    <EventCard event={event} />
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                title="No events listed yet"
                body="Community calendars will appear here as hubs publish events."
                action="Add an event"
                onPress={() => router.push("/create/event")}
              />
            )}
          </View>
        </View>
      </View>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[120px] flex-1 p-2">
      <Text variant="title" tone="white">
        {value}
      </Text>
      <Text variant="caption" className="mt-0.5 text-white/75">
        {label}
      </Text>
    </View>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

function PurposeRow({
  title,
  description,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl border p-4 active:bg-card ${
        selected ? "border-ink bg-card" : "border-linen bg-paper"
      }`}
    >
      <Text variant="label">{title}</Text>
      <Text variant="caption" tone="muted" className="mt-1">
        {description}
      </Text>
    </Pressable>
  );
}

function EmptyState({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Card className="items-start gap-4">
      <View>
        <Text variant="subheading">{title}</Text>
        <Text variant="caption" tone="muted" className="mt-1">
          {body}
        </Text>
      </View>
      <Button label={action} variant="secondary" onPress={onPress} />
    </Card>
  );
}
