import { Stack } from "expo-router";
import { colors } from "@/lib/theme";
import { RequireAuth } from "@/features/auth/RequireAuth";

export default function CreateLayout() {
  // Creating anything (a page, an event, a professional profile) requires a
  // signed-in account. RequireAuth redirects guests to sign-in and shows a
  // skeleton while the session resolves; per-screen checks enforce the finer
  // permission (e.g. you can only host events under a page you own).
  return (
    <RequireAuth>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="hub" />
        <Stack.Screen name="event" />
        <Stack.Screen name="professional" />
      </Stack>
    </RequireAuth>
  );
}
