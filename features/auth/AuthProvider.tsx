import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Hub } from "aws-amplify/utils";

import { getAwsAuthUser, type AwsAuthUser } from "@/lib/aws/auth";
import { setDataSignedIn } from "@/lib/aws/config";
import { qk } from "@/lib/query";

/** Backend-neutral user — only the fields the app actually reads. */
export type AuthUser = AwsAuthUser;

interface AuthState {
  user: AuthUser | null;
  /** True until the initial session check resolves. */
  initializing: boolean;
  isAuthenticated: boolean;
  /** Cognito has no PASSWORD_RECOVERY event; always false on AWS. */
  isRecovering: false;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    // Keep query-driven consumers (session + profile-scoped data) fresh.
    const refreshScopedQueries = () => {
      queryClient.invalidateQueries({ queryKey: qk.session });
      queryClient.invalidateQueries({ queryKey: qk.myProfile });
      queryClient.invalidateQueries({ queryKey: qk.myHubs });
    };

    getAwsAuthUser().then((u) => {
      if (!active) return;
      setUser(u);
      setDataSignedIn(!!u);
      setInitializing(false);
    });

    // Cognito has no PASSWORD_RECOVERY event (reset is code-based), so
    // isRecovering stays false on AWS.
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedOut") {
        setUser(null);
        setDataSignedIn(false);
        setInitializing(false);
        refreshScopedQueries();
      } else if (payload.event === "signedIn" || payload.event === "tokenRefresh") {
        getAwsAuthUser().then((u) => {
          if (!active) return;
          setUser(u);
          setDataSignedIn(!!u);
          setInitializing(false);
          refreshScopedQueries();
        });
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      isAuthenticated: !!user,
      isRecovering: false,
    }),
    [user, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
