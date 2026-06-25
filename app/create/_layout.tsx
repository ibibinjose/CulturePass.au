import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function CreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="hub" />
      <Stack.Screen name="professional" />
    </Stack>
  );
}
