import type { ReactNode } from "react";
import { View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/lib/theme";

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
      <View className="mb-6 flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-ink">
          <View className="h-2 w-2 rounded-pill bg-teal-500" />
        </View>
        <Text className="font-display text-lg text-ink">
          CulturePass <Text className="font-display text-lg text-pink-500">AU</Text>
        </Text>
      </View>

      <Text variant="display">{title}</Text>
      {subtitle ? (
        <Text variant="lead" className="mt-3">
          {subtitle}
        </Text>
      ) : null}

      {notice ? (
        <View className="mt-6 flex-row items-start gap-2.5 rounded-2xl border border-eucalyptus-100 bg-eucalyptus-50 p-4">
          <Icon name="check-circle" size={18} color={colors.eucalyptus} />
          <Text variant="caption" className="flex-1 text-eucalyptus-700">
            {notice}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View className="mt-6 flex-row items-start gap-2.5 rounded-2xl border border-danger/30 bg-terracotta-50 p-4">
          <Icon name="info" size={18} color={colors.danger} />
          <Text variant="caption" className="flex-1 text-terracotta-600">
            {error}
          </Text>
        </View>
      ) : null}

      <Card elevated className="mt-8 gap-5">
        {children}
      </Card>

      {footer ? <View className="mt-8 items-center gap-3">{footer}</View> : null}
    </Screen>
  );
}
