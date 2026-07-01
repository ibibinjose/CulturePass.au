import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, View, type PressableProps } from "react-native";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "whatsapp" | "pink";
type Size = "sm" | "md" | "lg";

// Brand button system: bright fills with black (ink) borders. Gold is the main
// action; pink the secondary; green drives "create / get started" actions.
// Solid fills carry a soft warm shadow that lifts on hover and presses flat on
// tap; outline/ghost gain a sand hover surface. Tactile, never noisy.
const CONTAINER: Record<Variant, string> = {
  primary: "bg-gold-500 border-2 border-ink shadow-subtle hover:shadow-card active:bg-gold-600 active:shadow-none",
  secondary: "bg-pink-700 border-2 border-ink shadow-subtle hover:shadow-card active:bg-pink-600 active:shadow-none",
  outline: "bg-card border-2 border-ink hover:bg-sand active:bg-sand",
  ghost: "bg-transparent hover:bg-sand active:bg-sand",
  danger: "bg-danger border-2 border-ink shadow-subtle hover:shadow-card active:bg-danger/90 active:shadow-none",
  whatsapp: "bg-green-500 border-2 border-ink shadow-subtle hover:shadow-card active:bg-green-600 active:shadow-none",
  pink: "bg-pink-700 border-2 border-ink shadow-subtle hover:shadow-card active:bg-pink-600 active:shadow-none",
};

const LABEL: Record<Variant, string> = {
  primary: "text-ink",
  secondary: "text-white",
  outline: "text-ink",
  ghost: "text-ink",
  danger: "text-paper",
  whatsapp: "text-ink",
  pink: "text-white",
};

const SPINNER: Record<Variant, string> = {
  primary: colors.ink,
  secondary: "#FFFFFF",
  outline: colors.ink,
  ghost: colors.ink,
  danger: colors.paper,
  whatsapp: colors.ink,
  pink: "#FFFFFF",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 rounded-lg",
  md: "h-11 web:h-10 px-4 rounded-xl",
  lg: "h-12 px-5.5 rounded-xl",
};

const LABEL_SIZE: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
};

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
}

/**
 * Primary action primitive. Ink-on-paper by default; ochre for the warm
 * secondary action; whatsapp green reserved for "create / get started".
 */
export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={cn(
        "flex-row items-center justify-center gap-2",
        SIZE[size],
        CONTAINER[variant],
        fullWidth && "w-full",
        isDisabled && "opacity-40",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={SPINNER[variant]} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text variant="label" className={cn("font-heading", LABEL[variant], LABEL_SIZE[size])}>
            {label}
          </Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
