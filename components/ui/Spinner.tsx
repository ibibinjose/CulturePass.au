import { ActivityIndicator, View, type ViewProps } from "react-native";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";

interface SpinnerProps extends ViewProps {
  size?: "small" | "large";
  /** Glyph colour. Defaults to the warm ochre accent. */
  color?: string;
  /** Optional caption shown beneath the spinner (and used as the a11y label). */
  label?: string;
  className?: string;
}

/**
 * Token-coloured loading spinner with a built-in `progressbar` role. Prefer
 * `<Skeleton>` for content placeholders (it preserves layout); reach for Spinner
 * on indeterminate actions and brief full-area waits.
 */
export function Spinner({
  size = "small",
  color = colors.ochre,
  label,
  className,
  ...rest
}: SpinnerProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? "Loading"}
      className={cn("items-center justify-center gap-2", className)}
      {...rest}
    >
      <ActivityIndicator size={size} color={color} />
      {label ? (
        <Text variant="caption" tone="faint">
          {label}
        </Text>
      ) : null}
    </View>
  );
}
