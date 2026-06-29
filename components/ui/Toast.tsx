import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import { Icon, type IconName } from "./Icon";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { announceForAccessibility, useReducedMotion } from "@/lib/a11y";

// =============================================================================
// Toast — non-blocking, accessible feedback. Replaces web-only `alert()`, which
// is inaccessible and undefined on native. Mount <ToastProvider> once near the
// app root, then call `useToast()` from any screen.
// =============================================================================

type ToastVariant = "default" | "success" | "error";

interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  /** Auto-dismiss after this many ms. Default 3500. */
  duration?: number;
}

interface ToastItem extends Required<ToastOptions> {
  id: number;
}

interface ToastContextValue {
  show: (opts: ToastOptions | string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const VARIANT: Record<ToastVariant, { icon: IconName; iconColor: string }> = {
  default: { icon: "info", iconColor: colors.paper },
  success: { icon: "check-circle", iconColor: colors.green },
  error: { icon: "info", iconColor: colors.terracotta },
};

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((opts: ToastOptions | string) => {
    const o: ToastOptions = typeof opts === "string" ? { message: opts } : opts;
    const item: ToastItem = {
      id: ++counter,
      message: o.message,
      variant: o.variant ?? "default",
      duration: o.duration ?? 3500,
    };
    // Cap to the three most recent so the stack never grows unbounded.
    setToasts((cur) => [...cur.slice(-2), item]);
    announceForAccessibility(item.message);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message) => show({ message, variant: "success" }),
      error: (message) => show({ message, variant: "error" }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 84 }}
        className="items-center gap-2 px-gutter"
      >
        {toasts.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: reduced ? 0 : 200,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(onDismiss, item.duration);
    return () => clearTimeout(timer);
  }, [anim, item.duration, onDismiss, reduced]);

  const v = VARIANT[item.variant];

  return (
    <Animated.View
      style={{
        width: "100%",
        maxWidth: 440,
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
        ],
      }}
    >
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={`${item.message}. Tap to dismiss.`}
        accessibilityLiveRegion="polite"
        className={cn(
          "flex-row items-center gap-3 rounded-xl border border-night-line bg-night px-4 py-3 shadow-raised",
        )}
      >
        <Icon name={v.icon} size={18} color={v.iconColor} />
        <Text className="flex-1 font-ui text-sm text-paper">{item.message}</Text>
      </Pressable>
    </Animated.View>
  );
}
