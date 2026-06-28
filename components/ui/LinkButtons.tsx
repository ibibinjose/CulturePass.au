import { Linking, Pressable, View } from "react-native";

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
  return (
    <View className={cn("gap-3", className)}>
      {items.map((item) => (
        <Pressable
          key={`${item.label}-${item.href}`}
          onPress={() => Linking.openURL(item.href)}
          accessibilityRole="link"
          className="flex-row items-center gap-3 rounded-2xl border border-linen bg-card px-5 py-4 active:bg-sand"
        >
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
