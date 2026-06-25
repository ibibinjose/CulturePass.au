import { useState } from "react";
import { Pressable, View } from "react-native";
import { Input } from "./Input";
import { Text } from "./Text";

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
          className="h-12 items-center justify-center rounded-lg border border-linen bg-card px-4 active:bg-sand"
        >
          <Text variant="label">Add</Text>
        </Pressable>
      </View>

      {value.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {value.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => onChange(value.filter((t) => t !== tag))}
              className="flex-row items-center gap-2 rounded-pill bg-sand px-3 py-1.5 active:opacity-70"
            >
              <Text variant="label" className="text-sm text-ink-muted">
                {tag}
              </Text>
              <Text variant="label" className="text-sm text-ink-faint">
                ✕
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
