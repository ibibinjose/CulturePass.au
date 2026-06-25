import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HubCard } from "@/features/hubs/HubCard";
import { useMyHubs } from "@/features/hubs/api";
import { useMyProfile } from "@/features/profiles/api";

export default function MyHubsScreen() {
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const { data: hubs, isLoading, isError } = useMyHubs();

  if (!profile) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-10">
        <Text variant="title" className="mt-6">
          Sign in required
        </Text>
        <Text variant="body" tone="muted" className="mt-2">
          You need to sign in to view your hubs.
        </Text>
        <Button
          label="Sign in"
          className="mt-6 self-start"
          onPress={() => router.push("/(auth)/sign-in")}
        />
      </Screen>
    );
  }

  return (
    <Screen contentClassName="pt-10">
      <View className="mb-6 flex-row items-center justify-between">
        <Text variant="overline" tone="ochre">
          My Hubs
        </Text>
        <Button 
          label="+ Create Hub" 
          variant="primary" 
          size="sm" 
          onPress={() => router.push("/create/hub")} 
        />
      </View>

      <Text variant="title">Manage your hubs</Text>
      <Text variant="body" tone="muted" className="mt-2">
        View, edit, and manage the hubs you own.
      </Text>

      <View className="mt-10 gap-4">
        {isLoading ? (
          <Text variant="caption" tone="faint">
            Loading your hubs…
          </Text>
        ) : isError ? (
          <Card>
            <Text variant="caption" tone="muted">
              Couldn't load your hubs. Please try again.
            </Text>
          </Card>
        ) : hubs && hubs.length > 0 ? (
          hubs.map((hub) => (
            <Card key={hub.id} className="p-4">
              <HubCard hub={hub} />
              <View className="flex-row gap-2 mt-4">
                <Button 
                  label="Edit" 
                  variant="outline" 
                  size="sm"
                  onPress={() => router.push(`/hub/edit/${hub.slug}`)}
                />
                <Button 
                  label="View" 
                  variant="outline" 
                  size="sm"
                  onPress={() => router.push(`/hub/${hub.slug}`)}
                />
              </View>
            </Card>
          ))
        ) : (
          <Card>
            <Text variant="subheading">No hubs yet</Text>
            <Text variant="caption" tone="muted" className="mt-1">
              You haven't created any hubs. Start by creating your first hub.
            </Text>
            <Button
              label="Create your first hub"
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