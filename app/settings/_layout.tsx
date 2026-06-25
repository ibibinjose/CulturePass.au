import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
