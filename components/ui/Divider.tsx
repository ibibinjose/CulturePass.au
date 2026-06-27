import { View } from "react-native";
import { cn } from "@/lib/utils/cn";

interface DividerProps {
  /** Hairline color: warm linen on light, or a subtle line on night surfaces. */
  tone?: "default" | "night";
  className?: string;
}

/** Hairline divider in warm linen. */
export function Divider({ tone = "default", className }: DividerProps) {
  return (
    <View className={cn("h-px w-full", tone === "night" ? "bg-night-line" : "bg-linen", className)} />
  );
}
