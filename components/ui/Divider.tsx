import { View } from "react-native";
import { cn } from "@/lib/utils/cn";

/** Hairline divider in warm linen. */
export function Divider({ className }: { className?: string }) {
  return <View className={cn("h-px w-full bg-linen", className)} />;
}
