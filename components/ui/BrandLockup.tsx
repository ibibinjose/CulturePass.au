import { View } from "react-native";

import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";
import { Pinwheel } from "./Pinwheel";

/**
 * The standard CulturePass lockup — pinwheel badge + wordmark — for light
 * surfaces (auth, onboarding). The top bar and footer use their own bespoke
 * sizing, but they all share the same {@link Pinwheel} mark.
 */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <View className={cn("flex-row items-center gap-2.5", className)}>
      <View className="h-9 w-9 items-center justify-center rounded-2xl border border-linen bg-white shadow-subtle">
        <Pinwheel size={26} />
      </View>
      <Text className="font-display text-lg text-ink">
        CulturePass <Text className="font-display text-lg text-pink-500">AU</Text>
      </Text>
    </View>
  );
}
