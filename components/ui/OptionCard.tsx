import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import { Text } from "./Text";
import { Icon } from "./Icon";

interface OptionCardProps {
  title: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
  className?: string;
}

/**
 * Selectable card used in choosers (hub type, professional category, etc.).
 * Selection reads as an ink border + soft ochre wash and a filled tick — no
 * loud fills.
 */
export function OptionCard({ title, description, selected, onPress, className }: OptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={cn(
        "rounded-2xl border p-5",
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
            "mt-0.5 h-6 w-6 items-center justify-center rounded-pill border-2",
            selected ? "border-ink bg-ink" : "border-linen",
          )}
        >
          {selected ? <Icon name="check" size={13} color={colors.paper} strokeWidth={2.4} /> : null}
        </View>
      </View>
    </Pressable>
  );
}
