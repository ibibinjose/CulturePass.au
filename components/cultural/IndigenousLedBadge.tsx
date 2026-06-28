import { View } from "react-native";
import {
  Text,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * Marks an Indigenous-led hub. Restrained: a small three-mark glyph + label,
 * using the First Nations flag palette only here and on other sanctioned
 * cultural surfaces.
 */
export function IndigenousLedBadge({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-2 self-start rounded-pill bg-country-black px-3 py-1.5",
        className,
      )}
    >
      <View className="flex-row gap-0.5">
        <View className="h-2 w-2 rounded-pill bg-country-red" />
        <View className="h-2 w-2 rounded-pill bg-country-ochre" />
        <View className="h-2 w-2 rounded-pill bg-paper" />
      </View>
      <Text variant="overline" className="text-paper tracking-[0.6px]">
        Indigenous-led
      </Text>
    </View>
  );
}
