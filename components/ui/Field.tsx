import type { ReactNode } from "react";
import { View } from "react-native";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";

interface FieldProps {
  label?: string;
  helper?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Form field wrapper: label (with optional flag), the control, and either a
 * helper line or an error line. Keeps creation flows tidy and consistent.
 */
export function Field({ label, helper, error, optional, className, children }: FieldProps) {
  return (
    <View className={cn("gap-2", className)}>
      {label ? (
        <View className="flex-row items-baseline justify-between">
          <Text variant="label" className="font-heading">
            {label}
          </Text>
          {optional ? (
            <Text variant="caption" tone="faint">
              Optional
            </Text>
          ) : null}
        </View>
      ) : null}

      {children}

      {error ? (
        <Text variant="caption" className="text-danger">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" tone="faint">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
