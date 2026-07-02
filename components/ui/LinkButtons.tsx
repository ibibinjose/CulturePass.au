import { Linking, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";  // run: npx expo install @expo/vector-icons

import { Text } from "./Text";
import { Icon } from "./Icon";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

export interface LinkItem {
  label: string;
  sublabel?: string;
  href: string;
}

/** Stacked, full-width tappable link buttons — the link-in-bio (linktree) look. */
export function LinkButtons({ items, className }: { items: LinkItem[]; className?: string }) {
  if (items.length === 0) return null;

  const getSocialIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("instagram")) return <Ionicons name="logo-instagram" size={20} color={colors.ink} />;
    if (l.includes("x") || l.includes("twitter")) return <Ionicons name="logo-twitter" size={20} color={colors.ink} />;
    if (l.includes("facebook")) return <Ionicons name="logo-facebook" size={20} color={colors.ink} />;
    if (l.includes("linkedin")) return <Ionicons name="logo-linkedin" size={20} color={colors.ink} />;
    if (l.includes("tiktok")) return <Ionicons name="logo-tiktok" size={20} color={colors.ink} />;
    if (l.includes("youtube")) return <Ionicons name="logo-youtube" size={20} color={colors.ink} />;
    if (l.includes("website") || l.includes("web")) return <Ionicons name="globe-outline" size={20} color={colors.ink} />;
    return <Ionicons name="link-outline" size={20} color={colors.ink} />;
  };

  return (
    <View className={cn("gap-3", className)}>
      {items.map((item) => (
        <Pressable
          key={`${item.label}-${item.href}`}
          onPress={() => Linking.openURL(item.href)}
          accessibilityRole="link"
          className="flex-row items-center gap-3 rounded-2xl border border-linen bg-card px-5 py-4 active:bg-sand"
        >
          {getSocialIcon(item.label)}
          <View className="flex-1">
            <Text variant="label" className="font-heading text-ink">
              {item.label}
            </Text>
            {item.sublabel ? (
              <Text variant="caption" tone="faint" className="mt-0.5">
                {item.sublabel}
              </Text>
            ) : null}
          </View>
          <Icon name="arrow-up-right" size={18} color={colors.inkFaint} />
        </Pressable>
      ))}
    </View>
  );
}
