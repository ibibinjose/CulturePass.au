import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function HubEditLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="[slug]" />
    </Stack>
  );
}