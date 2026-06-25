import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";

export interface InputProps extends TextInputProps {
  invalid?: boolean;
  className?: string;
}

/**
 * Single-line input. Calm, low-chrome: warm hairline border that deepens to
 * ink on focus. Multiline supported via `multiline` + `numberOfLines`.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { invalid, multiline, className, ...rest },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.inkFaint}
      multiline={multiline}
      className={cn(
        "bg-card rounded-lg border px-4 font-sans text-base text-ink",
        multiline ? "min-h-[112px] py-3" : "h-12",
        invalid ? "border-danger" : "border-linen focus:border-ink",
        className,
      )}
      style={multiline ? { textAlignVertical: "top" } : undefined}
      {...rest}
    />
  );
});
