import { View } from "react-native";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";

type Variant = "neutral" | "ochre" | "eucalyptus" | "terracotta" | "outline";

const STYLES: Record<Variant, { container: string; label: string }> = {
  neutral: { container: "bg-sand", label: "text-ink-muted" },
  ochre: { container: "bg-ochre-50", label: "text-ochre-700" },
  eucalyptus: { container: "bg-eucalyptus-50", label: "text-eucalyptus-700" },
  terracotta: { container: "bg-terracotta-50", label: "text-terracotta-600" },
  outline: { container: "bg-transparent border border-linen", label: "text-ink-muted" },
};

interface BadgeProps {
  label: string;
  variant?: Variant;
  className?: string;
}

/** Compact pill for tags, types and statuses. */
export function Badge({ label, variant = "neutral", className }: BadgeProps) {
  const s = STYLES[variant];
  return (
    <View className={cn("self-start rounded-pill px-3 py-1", s.container, className)}>
      <Text variant="overline" className={cn("tracking-[0.6px]", s.label)}>
        {label}
      </Text>
    </View>
  );
}
