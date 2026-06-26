import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function BusinessCardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
        animation: "fade",
      }}
    />
  );
}
