import { Pressable } from "react-native";
import { useRouter, type Href } from "expo-router";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import { Text } from "./Text";
import { Icon } from "./Icon";

interface BackButtonProps {
  label?: string;
  /** Where to go if there's no history to pop back to (e.g. deep links). */
  fallbackHref?: Href;
  /** Override the default pop behaviour (e.g. step-aware wizards). */
  onPress?: () => void;
  className?: string;
}

/** Consistent back affordance — chevron + label, popping the stack. */
export function BackButton({ label = "Back", fallbackHref = "/", onPress: onPressProp, className }: BackButtonProps) {
  const router = useRouter();
  const onPress =
    onPressProp ??
    (() => {
      if (router.canGoBack()) router.back();
      else router.replace(fallbackHref);
    });
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn("-ml-1 flex-row items-center gap-1 self-start py-1 pr-2 active:opacity-60", className)}
    >
      <Icon name="chevron-left" size={18} color={colors.inkMuted} />
      <Text variant="label" tone="muted" className="font-heading">
        {label}
      </Text>
    </Pressable>
  );
}
