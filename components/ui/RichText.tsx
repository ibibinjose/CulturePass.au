import React from "react";
import { View } from "react-native";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";

interface RichTextProps {
  text: string;
  onTagPress?: (tag: string) => void;
  onMentionPress?: (mention: string) => void;
  className?: string;
}

function parseInlineText(
  line: string,
  onTagPress?: (tag: string) => void,
  onMentionPress?: (mention: string) => void
) {
  // Matches: **bold**, *italic*, _italic_, #hashtag, @mention
  const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|_.*?_|#[\w\-]+|@[\w\-]+)/g;
  const parts = line.split(tokenRegex);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const content = part.slice(2, -2);
      return (
        <Text key={i} className="font-bold text-ink inline">
          {content}
        </Text>
      );
    }
    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      const content = part.slice(1, -1);
      return (
        <Text key={i} className="text-ink inlineStyle italic inline">
          {content}
        </Text>
      );
    }
    if (part.startsWith("#")) {
      const tag = part.slice(1);
      return (
        <Text
          key={i}
          onPress={() => onTagPress?.(tag)}
          className="font-heading text-pink-600 active:opacity-75 inline"
        >
          {part}
        </Text>
      );
    }
    if (part.startsWith("@")) {
      const mention = part.slice(1);
      return (
        <Text
          key={i}
          onPress={() => onMentionPress?.(mention)}
          className="font-heading text-ochre-600 active:opacity-75 inline"
        >
          {part}
        </Text>
      );
    }
    return part;
  });
}

/**
 * Renders text with basic Markdown (headings, bold, italics)
 * and active hashtags (#tag) and mentions (@mention).
 */
export function RichText({ text, onTagPress, onMentionPress, className }: RichTextProps) {
  if (!text) return null;
  const lines = text.split("\n");

  return (
    <View className={cn("gap-2", className)}>
      {lines.map((line, index) => {
        // Heading 1
        if (line.startsWith("# ")) {
          return (
            <Text key={index} variant="title" className="font-display mt-2 mb-1">
              {line.slice(2)}
            </Text>
          );
        }
        // Heading 2
        if (line.startsWith("## ")) {
          return (
            <Text key={index} variant="heading" className="font-display mt-2 mb-1">
              {line.slice(3)}
            </Text>
          );
        }
        // Heading 3
        if (line.startsWith("### ")) {
          return (
            <Text key={index} variant="subheading" className="font-heading mt-2 mb-1">
              {line.slice(4)}
            </Text>
          );
        }
        // Plain body line
        return (
          <Text key={index} variant="bodyLarge" tone="muted" className="leading-7">
            {parseInlineText(line, onTagPress, onMentionPress)}
          </Text>
        );
      })}
    </View>
  );
}
