import { Switch, type SwitchProps, View } from "react-native";
import { colors } from "@/lib/theme";
import { Text } from "./Text";

interface ToggleProps extends SwitchProps {
  label?: string;
  enabled?: boolean;
  onToggle?: (value: boolean) => void;
}

/** Themed on/off switch with label for settings rows. */
export function Toggle({ label, enabled, onToggle, ...props }: ToggleProps) {
  return (
    <View className="flex-row items-center justify-between">
      {label ? <Text variant="label">{label}</Text> : null}
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: colors.linen, true: colors.eucalyptus }}
        thumbColor={colors.card}
        ios_backgroundColor={colors.linen}
        {...props}
      />
    </View>
  );
}