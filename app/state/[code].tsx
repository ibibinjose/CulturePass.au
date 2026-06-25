import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HubCard } from "@/features/hubs/HubCard";
import { useHubs } from "@/features/hubs/api";
import { AUSTRALIAN_STATES, type StateCode } from "@/lib/constants";

export default function StateScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const stateCode = (code ?? "").toUpperCase() as StateCode;
  const state = AUSTRALIAN_STATES.find((s) => s.code === stateCode);
  const { data: hubs, isLoading, isError } = useHubs({ state: stateCode });

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
        Hubs and communities across {state?.name ?? "this state"}.
      </Text>

      <View className="mt-10 gap-4">
        {isLoading ? (
          <Text variant="caption" tone="faint">
            Loading…
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
          <Card>
            <Text variant="subheading">No hubs in {stateCode} yet</Text>
            <Text variant="caption" tone="muted" className="mt-1">
              Create one to get your community started.
            </Text>
            <Button
              label="Create a hub"
              variant="secondary"
              className="mt-4 self-start"
              onPress={() => router.push("/create/hub")}
            />
          </Card>
        )}
      </View>
    </Screen>
  );
}
