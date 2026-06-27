import { useState } from "react";
import { Pressable, type TextInputProps } from "react-native";
import { Input } from "./Input";
import { Icon } from "./Icon";
import { colors } from "@/lib/theme";

interface PasswordInputProps extends Omit<TextInputProps, "secureTextEntry"> {
  invalid?: boolean;
}

/** Password field with an inline show/hide (eye) toggle. */
export function PasswordInput({ invalid, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoComplete="password"
      invalid={invalid}
      rightIcon={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
        >
          <Icon name={visible ? "eye-off" : "eye"} size={19} color={colors.inkFaint} />
        </Pressable>
      }
      {...rest}
    />
  );
}
