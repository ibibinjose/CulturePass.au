import { Pressable } from "react-native";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

/** Toggleable chip for filters and multi-select tags. */
export function Chip({ label, selected, onPress, className }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        "rounded-pill border px-4 py-2",
        selected ? "border-ink bg-ink" : "border-linen bg-card active:bg-sand",
        className,
      )}
    >
      <Text variant="label" className={cn("text-sm", selected ? "text-paper" : "text-ink-muted")}>
        {label}
      </Text>
    </Pressable>
  );
}
