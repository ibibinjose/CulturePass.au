import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/a11y";

interface SkeletonProps extends ViewProps {
  className?: string;
}

/**
 * Content-shaped loading placeholder. A warm `sand` block with a gentle pulse
 * between sand and linen (held static under Reduce Motion). Compose several to
 * mirror the layout that's loading instead of showing a bare spinner — this
 * preserves page structure and feels faster.
 *
 * Sizing/shape come from `className` (e.g. `h-4 w-2/3 rounded`). Hidden from
 * assistive tech, since it conveys no real content.
 */
export function Skeleton({ className, style, ...rest }: SkeletonProps) {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (reduced) {
      pulse.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
      className={cn("overflow-hidden rounded-lg bg-sand", className)}
      {...rest}
    >
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.linen, opacity: pulse }]}
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
