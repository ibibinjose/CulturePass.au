import type { ReactNode } from "react";
import { View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  error?: string | null;
  notice?: string | null;
}

/** Shared centred scaffold for the auth screens — calm, single-column. */
export function AuthShell({ title, subtitle, children, footer, error, notice }: AuthShellProps) {
  return (
    <Screen maxWidth="form" contentClassName="pt-section">
      <Text variant="overline" tone="ochre">
        CulturePass Australia
      </Text>
      <Text variant="title" className="mt-3">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" tone="muted" className="mt-3">
          {subtitle}
        </Text>
      ) : null}

      {notice ? (
        <Card className="mt-6 border-eucalyptus-100 bg-eucalyptus-50">
          <Text variant="caption" className="text-eucalyptus-700">
            {notice}
          </Text>
        </Card>
      ) : null}

      {error ? (
        <Card className="mt-6 border-danger/30 bg-terracotta-50">
          <Text variant="caption" className="text-terracotta-600">
            {error}
          </Text>
        </Card>
      ) : null}

      <View className="mt-8 gap-5">{children}</View>

      {footer ? <View className="mt-8 items-center gap-3">{footer}</View> : null}
    </Screen>
  );
}
