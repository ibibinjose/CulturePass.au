import { Pressable, View } from "react-native";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";
import { Icon, type IconName } from "./Icon";

export interface SegmentItem<T extends string = string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedControlProps<T extends string> {
  items: readonly SegmentItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `underline` = editorial tab row; `pill` = compact segmented switch. */
  variant?: "underline" | "pill";
  /** Names the group for assistive tech, e.g. "Discover sections". */
  accessibilityLabel?: string;
  className?: string;
}

/**
 * Accessible tab / segmented control. Exposes a proper `tablist` with `tab`
 * children and `selected` state so screen readers and keyboard users can
 * navigate it — a drop-in replacement for the hand-rolled tab rows scattered
 * across screens. Generic over the value union so `onChange` stays type-safe.
 */
export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  variant = "underline",
  accessibilityLabel,
  className,
}: SegmentedControlProps<T>) {
  if (variant === "pill") {
    return (
      <View
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
        className={cn("flex-row rounded-pill bg-sand p-1", className)}
      >
        {items.map((item) => {
          const active = item.value === value;
          return (
            <Pressable
              key={item.value}
              onPress={() => onChange(item.value)}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              className={cn(
                "flex-1 flex-row items-center justify-center gap-1.5 rounded-pill px-3 py-2",
                active ? "bg-card shadow-subtle" : "active:bg-linen/40",
              )}
            >
              {item.icon ? (
                <Icon name={item.icon} size={16} color={active ? colors.ink : colors.inkMuted} />
              ) : null}
              <Text variant="label" className={active ? "text-ink" : "text-ink-muted"}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      className={cn("flex-row gap-6 border-b border-linen", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            className="items-center"
          >
            <View className="flex-row items-center gap-1.5 pb-2">
              {item.icon ? (
                <Icon name={item.icon} size={16} color={active ? colors.ink : colors.inkFaint} />
              ) : null}
              <Text
                variant="label"
                className={cn("font-heading", active ? "text-ink" : "text-ink-faint")}
              >
                {item.label}
              </Text>
            </View>
            <View
              className={cn("h-0.5 w-full rounded-pill", active ? "bg-ochre-500" : "bg-transparent")}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
