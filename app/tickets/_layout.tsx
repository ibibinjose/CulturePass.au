import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function TicketsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="success" options={{ animation: "fade" }} />
      <Stack.Screen name="cancel" options={{ animation: "fade" }} />
    </Stack>
  );
}
