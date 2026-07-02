import { View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { Button, Pinwheel, Screen, Text } from "@/components/ui";

/**
 * Catch-all for unmatched routes — bad/stale deep links (shared content that
 * was deleted or unpublished, typos) land here instead of expo-router's
 * unstyled default screen.
 */
export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "Page not found" }} />
      <Screen maxWidth="form" contentClassName="pt-section items-center">
        <Pinwheel size={28} />
        <Text variant="title" className="mt-6 text-center">
          Page not found
        </Text>
        <Text variant="body" tone="muted" className="mt-3 text-center">
          This link may have expired, or the page has moved. It could also be an
          event or hub that’s no longer published.
        </Text>
        <View className="mt-8 w-full gap-3">
          <Button label="Go to Discover" onPress={() => router.replace("/")} />
          {router.canGoBack() ? (
            <Button label="Go back" variant="outline" onPress={() => router.back()} />
          ) : null}
        </View>
      </Screen>
    </>
  );
}
