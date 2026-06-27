import type { ReactNode } from "react";
import { View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { BackButton } from "@/components/ui/BackButton";

/** Page shell for a legal/info document: back, eyebrow, title, "last updated". */
export function LegalScreen({
  eyebrow,
  title,
  updated,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Screen maxWidth="prose" contentClassName="pt-6">
      <BackButton fallbackHref="/settings/about" className="mb-5" />

      <Text variant="overline" tone="pink">
        {eyebrow}
      </Text>
      <Text variant="title" className="mt-2">
        {title}
      </Text>
      {updated ? (
        <Text variant="caption" tone="faint" className="mt-2">
          Last updated {updated}
        </Text>
      ) : null}
      {intro ? (
        <Text variant="lead" className="mt-4">
          {intro}
        </Text>
      ) : null}

      <View className="mb-section mt-8 gap-8">{children}</View>
    </Screen>
  );
}

/** A numbered/titled section with its own paragraphs. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text variant="heading">{title}</Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

export function Para({ children }: { children: ReactNode }) {
  return (
    <Text variant="body" className="leading-7">
      {children}
    </Text>
  );
}

export function Bullet({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row gap-2.5 pl-1">
      <Text variant="body" tone="pink" className="leading-7">
        •
      </Text>
      <Text variant="body" className="flex-1 leading-7">
        {children}
      </Text>
    </View>
  );
}
