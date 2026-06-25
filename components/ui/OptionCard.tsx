import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";

interface OptionCardProps {
  title: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
  className?: string;
}

/**
 * Selectable card used in choosers (hub type, professional category, etc.).
 * Selection is shown with an ink border + soft ochre wash — no loud fills.
 */
export function OptionCard({ title, description, selected, onPress, className }: OptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={cn(
        "rounded-lg border p-4",
        selected ? "border-ink bg-ochre-50" : "border-linen bg-card active:bg-sand",
        className,
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text variant="subheading">{title}</Text>
          {description ? (
            <Text variant="caption" tone="muted">
              {description}
            </Text>
          ) : null}
        </View>
        <View
          className={cn(
            "mt-1 h-5 w-5 rounded-pill border-2",
            selected ? "border-ink bg-ink" : "border-linen",
          )}
        >
          {selected ? <View className="m-auto h-1.5 w-1.5 rounded-pill bg-paper" /> : null}
        </View>
      </View>
    </Pressable>
  );
}
