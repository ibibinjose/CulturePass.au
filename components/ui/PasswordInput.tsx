import { useState } from "react";
import { Pressable, View, type TextInputProps } from "react-native";
import { Input } from "./Input";
import { Text } from "./Text";

interface PasswordInputProps extends Omit<TextInputProps, "secureTextEntry"> {
  invalid?: boolean;
}

/** Password field with an inline show/hide toggle. */
export function PasswordInput({ invalid, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="relative justify-center">
      <Input
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoComplete="password"
        invalid={invalid}
        className="pr-16"
        {...rest}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        className="absolute right-3 px-1 py-1"
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
      >
        <Text variant="label" tone="muted" className="text-sm">
          {visible ? "Hide" : "Show"}
        </Text>
      </Pressable>
    </View>
  );
}
