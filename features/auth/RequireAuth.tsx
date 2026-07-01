import type { ReactNode } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";

import { Screen, Skeleton } from "@/components/ui";
import { useAuth } from "./AuthProvider";

/** Gate a screen behind authentication: redirect to sign-in when signed out. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return (
      <Screen contentClassName="pt-section gap-5" scroll={false}>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <View className="mt-4 gap-3">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </View>
      </Screen>
    );
  }

  if (!isAuthenticated) return <Redirect href="/sign-in" />;

  return <>{children}</>;
}
