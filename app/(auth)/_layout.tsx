import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
        animation: "fade",
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="update-password" />
    </Stack>
  );
}
