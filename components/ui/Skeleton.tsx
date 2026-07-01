import { useEffect } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/a11y";

interface SkeletonProps extends ViewProps {
  className?: string;
}

/**
 * Content-shaped loading placeholder. A warm `linen` block with a gentle pulse
 * overlay in `sand` (held static under Reduce Motion). Compose several to
 * mirror the layout that's loading instead of showing a bare spinner — this
 * preserves page structure and feels faster.
 *
 * Shimmer: 1 200 ms cycle — 600 ms fade in + 600 ms fade out, infinite.
 * Sizing/shape come from `className` (e.g. `h-4 w-2/3 rounded`). Hidden from
 * assistive tech, since it conveys no real content.
 */
export function Skeleton({ className, style, ...rest }: SkeletonProps) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 0.6 : 0);

  useEffect(() => {
    if (reduced) {
      opacity.value = 0.6;
      return;
    }
    // 1 200 ms cycle: 600 ms fade-in then 600 ms fade-out, repeating indefinitely.
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0, { duration: 600 }),
      ),
      -1,
      false,
    );
  }, [opacity, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
      className={cn("overflow-hidden rounded-lg bg-linen", className)}
      {...rest}
    >
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.sand }, animatedStyle]}
      />
    </View>
  );
}

/**
 * Convenience: a stack of full-width skeleton lines for text-heavy blocks.
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <View className={cn("gap-2", className)} aria-hidden accessibilityElementsHidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === lines - 1 ? "w-1/2" : "w-full")} />
      ))}
    </View>
  );
}
