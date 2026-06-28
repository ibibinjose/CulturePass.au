import React from "react";
import { Card } from "./Card";
import { Text } from "./Text";
import { Button } from "./Button";

export function EmptyCard({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Card className="items-start gap-2 p-5 border border-linen rounded-2xl bg-card w-full">
      <Text className="font-heading text-sm text-ink">{title}</Text>
      <Text className="font-sans text-xs text-ink-muted leading-5">
        {body}
      </Text>
      <Button label={action} variant="whatsapp" size="sm" className="h-8 px-3 rounded-lg mt-1" onPress={onPress} />
    </Card>
  );
}
