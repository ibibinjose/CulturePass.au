import type { ReactNode } from "react";
import { Redirect } from "expo-router";

import {
  Screen,
  Text,
} from "@/components/ui";
import { useAuth } from "./AuthProvider";

/** Gate a screen behind authentication: redirect to sign-in when signed out. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return (
      <Screen contentClassName="pt-section">
        <Text variant="caption" tone="faint">
          Loading…
        </Text>
      </Screen>
    );
  }

  if (!isAuthenticated) return <Redirect href="/sign-in" />;

  return <>{children}</>;
}
