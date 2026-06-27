import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, View } from "react-native";
import { useRouter, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "./Text";
import { Icon, type IconName } from "./Icon";
import { colors } from "@/lib/theme";
import { useMobileLayout } from "@/lib/useMobileLayout";

interface Tab {
  key: string;
  label: string;
  href: Href;
  /** Path prefix used for the active state. */
  match?: string;
  icon?: IconName;
  center?: boolean;
}

const TABS: Tab[] = [
  { key: "home", label: "Home", href: "/", match: "/", icon: "home" },
  { key: "calendar", label: "Calendar", href: "/calendar", match: "/calendar", icon: "calendar" },
  { key: "create", label: "Create", href: "/create", center: true },
  { key: "messages", label: "Messages", href: "/messages", match: "/messages", icon: "chat" },
  { key: "hubs", label: "My Hubs", href: "/my-hubs", match: "/my-hubs", icon: "grid" },
];

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

  const isActive = (match?: string) =>
    !!match &&
    (match === "/" ? pathname === "/" : pathname === match || pathname.startsWith(`${match}/`));

  return (
    <View style={{ paddingBottom: insets.bottom }} className="border-t border-linen bg-paper/98">
      <View className="h-16 flex-row items-stretch">
        {TABS.map((tab) => {
          if (tab.center) {
            return (
              <View key={tab.key} className="flex-1 items-center justify-center">
                <Pressable
                  onPress={() => router.navigate(tab.href)}
                  accessibilityRole="button"
                  accessibilityLabel="Create"
                  className="-mt-7 items-center gap-1"
                >
                  <View className="h-14 w-14 items-center justify-center rounded-pill border-4 border-paper bg-green-500 shadow-card active:bg-green-600">
                    <Icon name="plus" size={26} color={colors.ink} strokeWidth={2.4} />
                  </View>
                  <Text variant="overline" tone="faint" className="text-[10px]">
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
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className="flex-1 items-center justify-center gap-1"
            >
              <Icon name={tab.icon!} size={23} color={active ? colors.pink : colors.inkFaint} strokeWidth={active ? 2 : 1.8} />
              <Text variant="overline" className={active ? "text-pink-600" : "text-ink-faint"}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
