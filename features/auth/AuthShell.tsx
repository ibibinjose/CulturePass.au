import type { ReactNode } from "react";
import { View } from "react-native";

import {
  BrandLockup,
  Card,
  Icon,
  Screen,
  Text,
} from "@/components/ui";
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
      <BrandLockup className="mb-6" />

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
