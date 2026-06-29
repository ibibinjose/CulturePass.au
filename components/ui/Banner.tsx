import type { ReactNode } from "react";
import { View } from "react-native";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";
import { Icon, type IconName } from "./Icon";

type BannerTone = "info" | "success" | "warning" | "error";

const TONE: Record<BannerTone, { container: string; icon: IconName; iconColor: string }> = {
  info: { container: "border-teal-500/30 bg-teal-50", icon: "info", iconColor: colors.tealDeep },
  success: {
    container: "border-green-600/30 bg-green-50",
    icon: "check-circle",
    iconColor: colors.greenDeep,
  },
  warning: { container: "border-gold-600/40 bg-gold-50", icon: "info", iconColor: colors.goldDeep },
  error: {
    container: "border-terracotta-500/30 bg-terracotta-50",
    icon: "info",
    iconColor: colors.terracotta,
  },
};

interface BannerProps {
  tone?: BannerTone;
  title?: string;
  /** Body content — a string is wrapped in muted caption text automatically. */
  children?: ReactNode;
  className?: string;
}

/**
 * Persistent, inline status message with `role="alert"`. Use for form- or
 * page-level feedback that should stay on screen (validation summaries, empty
 * results with guidance, sync errors). For transient confirmations use the
 * Toast system instead.
 */
export function Banner({ tone = "info", title, children, className }: BannerProps) {
  const t = TONE[tone];
  return (
    <View
      accessibilityRole="alert"
      className={cn("flex-row gap-3 rounded-xl border p-4", t.container, className)}
    >
      <View className="pt-0.5">
        <Icon name={t.icon} size={18} color={t.iconColor} />
      </View>
      <View className="flex-1 gap-0.5">
        {title ? (
          <Text variant="label" className="font-heading">
            {title}
          </Text>
        ) : null}
        {typeof children === "string" ? (
          <Text variant="caption" tone="muted">
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}
