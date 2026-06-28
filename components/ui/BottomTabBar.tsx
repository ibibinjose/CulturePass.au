import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, View } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "./Text";
import { Icon } from "./Icon";
import { colors } from "@/lib/theme";
import { useMobileLayout } from "@/lib/useMobileLayout";
import { MOBILE_TABS, isActivePath, type AppNavItem } from "@/lib/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMyProfile } from "@/features/profiles/api";
import { cn } from "@/lib/utils/cn";

/**
 * Mobile bottom tab bar. Rendered globally (alongside the TopBar) and only on a
 * mobile layout — desktop web uses the TopBar's inline links instead. The
 * TopBar burger menu still carries account links (Tickets, Settings, Sign out).
 */
export function BottomTabBar() {
  const mobile = useMobileLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { data: profile } = useMyProfile();
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

  // Auth-only tabs (Chat, Profile) only appear once signed in.
  const tabs = MOBILE_TABS.filter((tab) => !tab.authOnly || isAuthenticated);

  const handlePress = (tab: AppNavItem) => {
    // Profile is a dynamic route — resolve it to the signed-in user's id.
    if (tab.key === "profile") {
      if (profile) {
        router.navigate({ pathname: "/profile/[id]", params: { id: profile.id } });
      } else {
        router.navigate("/sign-in");
      }
      return;
    }
    router.navigate(tab.href);
  };

  return (
    <View style={{ paddingBottom: insets.bottom }} className="border-t border-pink-600 bg-pink-500">
      <View className="h-16 flex-row items-stretch">
        {tabs.map((tab) => {
          const active = isActive(tab.match);
          return (
            <Pressable
              key={tab.key}
              onPress={() => handlePress(tab)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              className={cn(
                "flex-1 items-center justify-center gap-1",
                active ? "opacity-100" : "opacity-60"
              )}
            >
              <Icon
                name={tab.icon}
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
