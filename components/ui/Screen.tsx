import type { ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { cn } from "@/lib/utils/cn";

interface ScreenProps extends ScrollViewProps {
  /** Scrollable by default; set false for fixed layouts (e.g. maps). */
  scroll?: boolean;
  /** Centre + constrain content width on web for a calm reading measure. */
  maxWidth?: "content" | "prose" | "form" | "none";
  edges?: readonly Edge[];
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

const MAX: Record<NonNullable<ScreenProps["maxWidth"]>, string> = {
  content: "max-w-content",
  prose: "max-w-prose",
  form: "max-w-form",
  none: "",
};

/**
 * Page container. Cream background, safe-area aware, optional centred max-width
 * for web. The generous default horizontal gutter keeps layouts airy.
 */
export function Screen({
  scroll = true,
  maxWidth = "content",
  edges = ["top", "bottom"],
  className,
  contentClassName,
  children,
  ...rest
}: ScreenProps) {
  const inner = (
    <View className={cn("mx-auto w-full px-gutter", MAX[maxWidth], contentClassName)}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges} className={cn("flex-1 bg-paper", className)}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="grow pb-16"
          {...rest}
        >
          {inner}
        </ScrollView>
      ) : (
        <View className="flex-1">{inner}</View>
      )}
    </SafeAreaView>
  );
}
