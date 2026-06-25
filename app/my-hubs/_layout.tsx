import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function MyHubsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}