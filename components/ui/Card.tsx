import { Pressable, View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils/cn";

interface CardProps extends ViewProps {
  /** Adds a subtle pressable affordance + onPress. */
  onPress?: () => void;
  padded?: boolean;
  elevated?: boolean;
  className?: string;
}

/**
 * Minimal surface. White card on cream paper, hairline warm border, soft
 * shadow only when explicitly elevated. Restraint over decoration.
 */
export function Card({
  onPress,
  padded = true,
  elevated = false,
  className,
  children,
  ...rest
}: CardProps) {
  const base = cn(
    "bg-card rounded-lg border border-linen",
    padded && "p-5",
    elevated && "shadow-card",
    className,
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={cn(base, "active:opacity-90")} {...rest}>
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
