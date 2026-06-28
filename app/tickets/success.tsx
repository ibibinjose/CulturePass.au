import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen, Text, Button, Card, Icon } from "@/components/ui";
import { colors } from "@/lib/theme";
import { useTicketBySession } from "@/features/tickets/api";

export default function TicketSuccessScreen() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const { data: order, isLoading } = useTicketBySession(session_id);

  const paid = order?.status === "paid";

  return (
    <Screen maxWidth="form" contentClassName="pt-section">
      <Card elevated className="items-center gap-4 p-8">
        <View
          className={`h-16 w-16 items-center justify-center rounded-pill ${
            paid ? "bg-success" : "bg-sand"
          }`}
        >
          <Icon
            name={paid ? "check" : "clock"}
            size={28}
            color={paid ? colors.paper : colors.inkMuted}
            strokeWidth={paid ? 2.6 : 1.8}
          />
        </View>

        <Text variant="title" className="text-center">
          {paid ? "You’re going!" : "Confirming your payment…"}
        </Text>
        <Text variant="body" tone="muted" className="text-center">
          {paid
            ? `Your ticket for ${order?.event?.title ?? "the event"} is confirmed. A receipt has been emailed to you.`
            : isLoading
              ? "Checking your order…"
              : "This can take a few seconds. We’ll update it here automatically."}
        </Text>

        <View className="mt-2 w-full gap-3">
          <Button label="View my tickets" onPress={() => router.replace("/tickets")} />
          {order?.event_id ? (
            <Button
              label="Back to event"
              variant="outline"
              onPress={() => router.replace(`/event/${order.event_id}`)}
            />
          ) : (
            <Button label="Discover events" variant="outline" onPress={() => router.replace("/")} />
          )}
        </View>
      </Card>
    </Screen>
  );
}
