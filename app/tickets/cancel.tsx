import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, Button, Card } from "@/components/ui";

export default function TicketCancelScreen() {
  const router = useRouter();
  return (
    <Screen maxWidth="form" contentClassName="pt-section">
      <Card className="items-center gap-4 p-8">
        <View className="h-16 w-16 items-center justify-center rounded-pill bg-sand">
          <Text className="font-display text-3xl" tone="muted">
            ×
          </Text>
        </View>
        <Text variant="title" className="text-center">
          Checkout cancelled
        </Text>
        <Text variant="body" tone="muted" className="text-center">
          No payment was taken. You can try again whenever you’re ready.
        </Text>
        <View className="mt-2 w-full gap-3">
          <Button label="Browse events" onPress={() => router.replace("/explore")} />
          <Button label="My tickets" variant="outline" onPress={() => router.replace("/tickets")} />
        </View>
      </Card>
    </Screen>
  );
}
