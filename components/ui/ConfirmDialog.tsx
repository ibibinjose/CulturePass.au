import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { Button } from "./Button";

// =============================================================================
// ConfirmDialog — accessible promise-based confirmation. Replaces native
// `Alert.alert` / web `window.confirm`, which are inconsistent across platforms
// and unstyled. Mount <ConfirmProvider> once near the app root, then:
//   const confirm = useConfirm();
//   if (await confirm({ title: "Delete account?", destructive: true })) { ... }
// =============================================================================

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (danger) and reads as such. */
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

interface DialogState extends ConfirmOptions {
  visible: boolean;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setState({ ...opts, visible: true });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setState((s) => (s ? { ...s, visible: false } : s));
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        visible={!!state?.visible}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <View className="flex-1 items-center justify-center px-gutter">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
            onPress={() => close(false)}
            style={StyleSheet.absoluteFill}
            className="bg-night/40"
          />
          <View
            accessibilityViewIsModal
            accessibilityRole="alert"
            className="w-full max-w-form gap-4 rounded-2xl border border-linen bg-card p-6 shadow-float"
          >
            <View className="gap-1.5">
              <Text variant="heading">{state?.title}</Text>
              {state?.message ? (
                <Text variant="body" tone="muted">
                  {state.message}
                </Text>
              ) : null}
            </View>
            <View className="flex-row justify-end gap-3">
              <Button
                label={state?.cancelLabel ?? "Cancel"}
                variant="outline"
                size="sm"
                onPress={() => close(false)}
              />
              <Button
                label={state?.confirmLabel ?? "Confirm"}
                variant={state?.destructive ? "danger" : "primary"}
                size="sm"
                onPress={() => close(true)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}
