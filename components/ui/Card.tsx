import { Pressable, View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils/cn";

interface CardProps extends ViewProps {
  /** Adds a pressable affordance + onPress. */
  onPress?: () => void;
  padded?: boolean;
  elevated?: boolean;
  /** Rich contrast surfaces: dark night, or the deep-green brand surface. */
  tone?: "default" | "night" | "green";
  className?: string;
}

/**
 * Surface primitive. White card on cream paper with a warm hairline border and
 * a soft shadow only when elevated. `tone="night"` flips it to the rich dark
 * editorial surface. Restraint over decoration.
 */
export function Card({
  onPress,
  padded = true,
  elevated = false,
  tone = "default",
  className,
  children,
  ...rest
}: CardProps) {
  const base = cn(
    "rounded-2xl border",
    tone === "night"
      ? "bg-night border-night-line"
      : tone === "green"
        ? "bg-green-700 border-green-800"
        : "bg-card border-linen",
    padded && "p-5",
    elevated && "shadow-card",
    className,
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={cn(base, "active:opacity-95")} {...rest}>
        {children}
      </Pressable>
    );
  }

  return (
    <View className={base} {...rest}>
      {children}
    </View>
  );
}
