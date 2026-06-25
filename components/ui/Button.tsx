import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, View, type PressableProps } from "react-native";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const CONTAINER: Record<Variant, string> = {
  primary: "bg-ink active:bg-ink/90",
  secondary: "bg-ochre-500 active:bg-ochre-600",
  outline: "bg-transparent border border-linen active:bg-sand",
  ghost: "bg-transparent active:bg-sand",
  danger: "bg-danger active:bg-danger/90",
};

const LABEL: Record<Variant, string> = {
  primary: "text-paper",
  secondary: "text-paper",
  outline: "text-ink",
  ghost: "text-ink",
  danger: "text-paper",
};

const SIZE: Record<Size, string> = {
  sm: "h-10 px-4 rounded-lg",
  md: "h-12 px-5 rounded-lg",
  lg: "h-14 px-6 rounded-xl",
};

const LABEL_SIZE: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-base",
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
        <ActivityIndicator size="small" color={variant === "outline" || variant === "ghost" || variant === "danger" ? "#FAF6EF" : "#1C1815"} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text variant="label" className={cn(LABEL[variant], LABEL_SIZE[size])}>
            {label}
          </Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
