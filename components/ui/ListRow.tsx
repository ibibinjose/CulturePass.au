import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import { Text } from "./Text";
import { Icon } from "./Icon";

interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Right-aligned value text (e.g. the current email). */
  value?: string;
  left?: ReactNode;
  /** Right-side control (e.g. a Toggle). Falls back to a chevron when onPress. */
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  className?: string;
}

/**
 * One row in a settings/menu list — optional leading icon/avatar, title +
 * subtitle, and either a trailing value, a custom control, or a chevron.
 */
export function ListRow({
  title,
  subtitle,
  value,
  left,
  right,
  onPress,
  danger,
  className,
}: ListRowProps) {
  const body = (
    <View className={cn("min-h-[60px] flex-row items-center gap-3.5 py-3.5", className)}>
      {left ? <View>{left}</View> : null}
      <View className="flex-1 gap-0.5">
        <Text variant="label" className={cn("text-base", danger && "text-danger")}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="faint">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="caption" tone="muted" numberOfLines={1} className="max-w-[45%]">
          {value}
        </Text>
      ) : null}
      {right ?? (onPress ? <Icon name="chevron-right" size={18} color={colors.inkFaint} /> : null)}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" className="active:opacity-60">
        {body}
      </Pressable>
    );
  }
  return body;
}
