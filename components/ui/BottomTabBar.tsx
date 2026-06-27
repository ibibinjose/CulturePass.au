import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, View } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "./Text";
import { Icon } from "./Icon";
import { colors } from "@/lib/theme";
import { useMobileLayout } from "@/lib/useMobileLayout";
import { MOBILE_TABS, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Mobile bottom tab bar. Rendered globally (alongside the TopBar) and only on a
 * mobile layout — desktop web uses the TopBar's inline links instead. The
 * TopBar burger menu still carries account links (Profile, Tickets, Settings).
 */
export function BottomTabBar() {
  const mobile = useMobileLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Hidden on desktop and while typing (so it never floats over the keyboard).
  if (!mobile || keyboardUp) return null;

  const isActive = (match: string) => isActivePath(pathname, match);

  return (
    <View style={{ paddingBottom: insets.bottom }} className="border-t border-pink-600 bg-pink-500">
      <View className="h-16 flex-row items-stretch">
        {MOBILE_TABS.map((tab) => {
          if (tab.center) {
            return (
              <View key={tab.key} className="flex-1 items-center justify-center">
                <Pressable
                  onPress={() => router.navigate(tab.href)}
                  accessibilityRole="button"
                  accessibilityLabel="Create"
                  className="-mt-7 items-center gap-1"
                >
                  <View className="h-14 w-14 items-center justify-center rounded-pill border-4 border-pink-500 bg-white shadow-card active:bg-white/90">
                    <Icon name="plus" size={26} color={colors.pink} strokeWidth={2.4} />
                  </View>
                  <Text variant="overline" className="text-[10px] font-heading text-white/80">
                    {tab.label}
                  </Text>
                </Pressable>
              </View>
            );
          }

          const active = isActive(tab.match);
          return (
            <Pressable
              key={tab.key}
              onPress={() => router.navigate(tab.href)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={cn(
                "flex-1 items-center justify-center gap-1",
                active ? "opacity-100" : "opacity-60"
              )}
            >
              <Icon
                name={tab.icon!}
                size={23}
                color={colors.white}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <Text
                variant="overline"
                className="text-[10px] font-heading text-white"
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
