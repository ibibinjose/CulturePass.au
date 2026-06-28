import { View } from "react-native";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";

type Variant =
  | "neutral"
  | "ochre"
  | "eucalyptus"
  | "terracotta"
  | "outline"
  | "ink"
  | "success"
  | "info"
  | "warning"
  | "danger";

const STYLES: Record<Variant, { container: string; label: string; dot: string }> = {
  neutral: { container: "bg-sand", label: "text-ink-muted", dot: "bg-ink-faint" },
  ochre: { container: "bg-ochre-50", label: "text-ochre-700", dot: "bg-ochre-500" },
  eucalyptus: { container: "bg-eucalyptus-50", label: "text-eucalyptus-700", dot: "bg-eucalyptus-500" },
  terracotta: { container: "bg-terracotta-50", label: "text-terracotta-600", dot: "bg-terracotta-500" },
  outline: { container: "bg-transparent border border-linen", label: "text-ink-muted", dot: "bg-ink-faint" },
  ink: { container: "bg-ink", label: "text-paper", dot: "bg-paper" },
  success: { container: "bg-success/10", label: "text-success", dot: "bg-success" },
  info: { container: "bg-ink-muted/10", label: "text-ink-muted", dot: "bg-ink-muted" },
  warning: { container: "bg-warning/10", label: "text-warning", dot: "bg-warning" },
  danger: { container: "bg-danger/10", label: "text-danger", dot: "bg-danger" },
};

interface BadgeProps {
  label: string;
  variant?: Variant;
  /** Show a small leading status dot. */
  dot?: boolean;
  className?: string;
}

/** Compact pill for tags, types and statuses. */
export function Badge({ label, variant = "neutral", dot = false, className }: BadgeProps) {
  const s = STYLES[variant];
  return (
    <View
      className={cn("flex-row items-center gap-1.5 self-start rounded-pill px-3 py-1", s.container, className)}
    >
      {dot ? <View className={cn("h-1.5 w-1.5 rounded-pill", s.dot)} /> : null}
      <Text variant="overline" className={cn("tracking-[0.7px]", s.label)}>
        {label}
      </Text>
    </View>
  );
}
