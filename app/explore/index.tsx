import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { HubCard } from "@/features/hubs/HubCard";
import { useHubs, type HubFilters } from "@/features/hubs/api";
import { HUB_TYPES, HUB_TYPE_LABELS, type HubType } from "@/lib/constants";

export default function ExploreScreen() {
  const router = useRouter();
  const [type, setType] = useState<HubType | undefined>();
  const [indigenousLed, setIndigenousLed] = useState(false);

  const filters: HubFilters = {
    ...(type ? { type } : {}),
    ...(indigenousLed ? { indigenousLed: true } : {}),
  };
  const { data: hubs, isLoading, isError } = useHubs(filters);

  return (
    <Screen contentClassName="pt-10">
      <Button
        label="← Back"
        variant="ghost"
        size="sm"
        className="mb-6 self-start"
        onPress={() => router.back()}
      />

      <Text variant="title">Explore</Text>
      <Text variant="body" tone="muted" className="mt-2">
        Filter hubs by type, or surface Indigenous-led communities.
      </Text>

      {/* Filters */}
      <View className="mt-8 gap-4">
        <View className="flex-row flex-wrap gap-2">
          <Chip
            label="Indigenous-led"
            selected={indigenousLed}
            onPress={() => setIndigenousLed((v) => !v)}
          />
        </View>
        <View className="flex-row flex-wrap gap-2">
          {HUB_TYPES.map((t) => (
            <Chip
              key={t}
              label={HUB_TYPE_LABELS[t]}
              selected={type === t}
              onPress={() => setType((cur) => (cur === t ? undefined : t))}
            />
          ))}
        </View>
      </View>

      {/* Results */}
      <View className="mt-10 gap-4">
        {isLoading ? (
          <Text variant="caption" tone="faint">
            Loading…
          </Text>
        ) : isError ? (
          <Card>
            <Text variant="caption" tone="muted">
              Couldn’t load hubs. Connect your Supabase project to see results.
            </Text>
          </Card>
        ) : hubs && hubs.length > 0 ? (
          hubs.map((hub) => <HubCard key={hub.slug} hub={hub} />)
        ) : (
          <Card>
            <Text variant="subheading">Nothing here yet</Text>
            <Text variant="caption" tone="muted" className="mt-1">
              Try clearing filters, or create the first hub.
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}
