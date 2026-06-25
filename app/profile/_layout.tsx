import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="edit" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
