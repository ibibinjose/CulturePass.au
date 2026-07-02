import { TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";  // npx expo install @expo/vector-icons

import { Text } from "./Text";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import { SOCIAL_PLATFORMS } from "@/lib/social";

interface SocialLinksFieldProps {
  /** Map of platform key → stored handle/value. */
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  className?: string;
}

/**
 * One row per platform with the base URL pre-filled as a non-editable prefix —
 * the user only types their handle. Values are stored as bare handles; the full
 * URL is derived on render (see lib/social.ts).
 */
export function SocialLinksField({ value, onChange, className }: SocialLinksFieldProps) {
  const set = (key: string, text: string) => onChange({ ...value, [key]: text });

  const getSocialIcon = (key: string) => {
    switch (key) {
      case "instagram": return <Ionicons name="logo-instagram" size={18} color={colors.inkMuted} />;
      case "x": return <Ionicons name="logo-twitter" size={18} color={colors.inkMuted} />;
      case "facebook": return <Ionicons name="logo-facebook" size={18} color={colors.inkMuted} />;
      case "linkedin": return <Ionicons name="logo-linkedin" size={18} color={colors.inkMuted} />;
      case "tiktok": return <Ionicons name="logo-tiktok" size={18} color={colors.inkMuted} />;
      case "youtube": return <Ionicons name="logo-youtube" size={18} color={colors.inkMuted} />;
      case "website": return <Ionicons name="globe-outline" size={18} color={colors.inkMuted} />;
      default: return <Ionicons name="link-outline" size={18} color={colors.inkMuted} />;
    }
  };

  return (
    <View className={cn("gap-4", className)}>
      {SOCIAL_PLATFORMS.map((p) => (
        <View key={p.key}>
          <View className="flex-row items-center gap-2 mb-1.5">
            {getSocialIcon(p.key)}
            <Text variant="label" className="font-heading">
              {p.label}
            </Text>
          </View>
          <View className="h-12 flex-row items-center overflow-hidden rounded-xl border border-linen bg-card focus-within:border-ink">
            <Text className="pl-4 font-sans text-base text-ink-faint">{p.prefix}</Text>
            <TextInput
              value={value[p.key] ?? ""}
              onChangeText={(t) => set(p.key, t)}
              placeholder={p.placeholder}
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={p.key === "website" ? "url" : "default"}
              className="h-12 flex-1 pl-1 pr-4 font-sans text-base text-ink"
            />
          </View>
        </View>
      ))}
    </View>
  );
}
