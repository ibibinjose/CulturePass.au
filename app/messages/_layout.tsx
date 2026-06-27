import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
        animation: "slide_from_right",
      }}
    />
  );
}
