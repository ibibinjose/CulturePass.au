import { useState } from "react";
import { Pressable, View } from "react-native";
import { Input } from "./Input";
import { Text } from "./Text";
import { Icon } from "./Icon";
import { colors } from "@/lib/theme";

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

/** Add/remove free-text values (custodian groups, partners, tags). */
export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [text, setText] = useState("");

  const add = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
    setText("");
  };

  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Input
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            onSubmitEditing={add}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>
        <Pressable
          onPress={add}
          accessibilityRole="button"
          accessibilityLabel="Add"
          className="h-12 w-12 items-center justify-center rounded-xl bg-ink active:bg-ink/90"
        >
          <Icon name="plus" size={20} color={colors.paper} strokeWidth={2.2} />
        </Pressable>
      </View>

      {value.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {value.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => onChange(value.filter((t) => t !== tag))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${tag}`}
              className="flex-row items-center gap-1.5 rounded-pill bg-sand px-3.5 py-2 active:opacity-70"
            >
              <Text variant="label" className="text-sm text-ink-muted">
                {tag}
              </Text>
              <Icon name="close" size={13} color={colors.inkFaint} strokeWidth={2.2} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
