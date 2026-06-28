import { forwardRef, type ReactNode, useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";

export interface InputProps extends TextInputProps {
  invalid?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  /** Applied to the wrapping container when icons are present. */
  containerClassName?: string;
}

/**
 * Single-line input. Calm, low-chrome: warm hairline border that deepens to
 * ink on focus. Optional left/right adornments (icons, units). Multiline
 * supported via `multiline` + `numberOfLines`.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { invalid, multiline, leftIcon, rightIcon, className, containerClassName, onFocus, onBlur, ...rest },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const field = (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.inkFaint}
      multiline={multiline}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        "font-sans text-base text-ink",
        leftIcon || rightIcon ? "flex-1" : "bg-card rounded-xl border px-4",
        !leftIcon && !rightIcon && (multiline ? "min-h-[112px] py-3" : "h-12"),
        !leftIcon && !rightIcon && (invalid ? "border-danger" : isFocused ? "border-teal-500" : "border-linen"),
        className,
      )}
      style={multiline ? { textAlignVertical: "top" } : undefined}
      {...rest}
    />
  );

  if (!leftIcon && !rightIcon) return field;

  return (
    <View
      className={cn(
        "bg-card flex-row items-center gap-2.5 rounded-xl border px-4",
        multiline ? "min-h-[112px] py-3" : "h-12",
        invalid ? "border-danger" : isFocused ? "border-teal-500" : "border-linen",
        containerClassName,
      )}
    >
      {leftIcon}
      {field}
      {rightIcon}
    </View>
  );
});
