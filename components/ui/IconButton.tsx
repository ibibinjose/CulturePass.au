import { forwardRef } from "react";
import { Pressable, type PressableProps, type View } from "react-native";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import { Icon, type IconName } from "./Icon";

type Size = "sm" | "md" | "lg";
type Tone = "default" | "muted" | "inverse";
type Variant = "plain" | "surface";

const SIZE: Record<Size, { box: string; icon: number }> = {
  sm: { box: "h-9 w-9", icon: 18 },
  md: { box: "h-11 w-11", icon: 22 }, // 44px — meets the min touch-target guideline
  lg: { box: "h-12 w-12", icon: 24 },
};

const TONE_COLOR: Record<Tone, string> = {
  default: colors.ink,
  muted: colors.inkMuted,
  inverse: colors.paper,
};

export interface IconButtonProps extends Omit<PressableProps, "children"> {
  icon: IconName;
  /** Required — an icon-only control must carry an accessible name. */
  accessibilityLabel: string;
  size?: Size;
  tone?: Tone;
  /** Overrides the tone colour for the glyph. */
  color?: string;
  variant?: Variant;
  className?: string;
}

/**
 * Accessible icon-only button. Always exposes an `accessibilityLabel` (enforced
 * by the type), guarantees a ≥44px effective touch target via `hitSlop`, and
 * applies consistent press feedback. Use this instead of a bare `Pressable`
 * wrapping an `Icon` so icon controls are reachable by screen readers and easy
 * to tap. Models its a11y on the `Button` primitive.
 */
export const IconButton = forwardRef<View, IconButtonProps>(function IconButton(
  {
    icon,
    accessibilityLabel,
    size = "md",
    tone = "default",
    color,
    variant = "plain",
    disabled,
    className,
    ...rest
  },
  ref,
) {
  const dims = SIZE[size];
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      className={cn(
        "items-center justify-center rounded-full",
        dims.box,
        variant === "surface" && "border border-linen bg-card active:bg-sand",
        variant === "plain" && "active:bg-sand/70",
        disabled && "opacity-40",
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={dims.icon} color={color ?? TONE_COLOR[tone]} />
    </Pressable>
  );
});
