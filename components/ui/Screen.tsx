import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { cn } from "@/lib/utils/cn";
import { useMobileLayout } from "@/lib/useMobileLayout";

interface ScreenProps extends ScrollViewProps {
  /** Scrollable by default; set false for fixed layouts (e.g. maps). */
  scroll?: boolean;
  /** Centre + constrain content width on web for a calm reading measure. */
  maxWidth?: "content" | "prose" | "form" | "none";
  /** Page background: cream paper (default) or the rich night surface. */
  tone?: "paper" | "night";
  edges?: readonly Edge[];
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

const MOBILE_EDGES: Edge[] = [];
const DESKTOP_EDGES: Edge[] = ["bottom"];

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
  tone = "paper",
  edges,
  className,
  contentClassName,
  children,
  ...rest
}: ScreenProps) {
  const mobile = useMobileLayout();
  // The TopBar owns the top inset everywhere; on mobile the BottomTabBar owns
  // the bottom inset, so screens guard the bottom edge only on desktop web.
  // An explicit `edges` prop always wins.
  const resolvedEdges = edges ?? (mobile ? MOBILE_EDGES : DESKTOP_EDGES);
  const bg = tone === "night" ? "bg-night" : "bg-paper";

  const inner = (
    <View className={cn("mx-auto w-full px-gutter", MAX[maxWidth], contentClassName)}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={resolvedEdges} className={cn("flex-1", bg, className)}>
      {/* Keep inputs visible above the keyboard on iOS; Android uses adjustResize. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="grow pb-24"
            {...rest}
          >
            {inner}
          </ScrollView>
        ) : (
          <View className="flex-1">{inner}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
