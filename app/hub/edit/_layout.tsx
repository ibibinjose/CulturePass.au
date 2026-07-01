import { Stack } from "expo-router";
import { colors } from "@/lib/theme";
import { RequireAuth } from "@/features/auth/RequireAuth";

export default function HubEditLayout() {
  // Editing a hub requires sign-in; the screen itself further checks that the
  // signed-in profile owns the hub before allowing edits or deletion.
  return (
    <RequireAuth>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="[slug]" />
      </Stack>
    </RequireAuth>
  );
}
