import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Hub } from "aws-amplify/utils";

import { supabase } from "@/lib/supabase/client";
import { isAwsBackend } from "@/lib/backend";
import { getAwsAuthUser, type AwsAuthUser } from "@/lib/aws/auth";
import { qk } from "@/lib/query";

/** Backend-neutral user — only the fields the app actually reads. */
export type AuthUser = AwsAuthUser;

interface AuthState {
  user: AuthUser | null;
  /** True until the initial session check resolves. */
  initializing: boolean;
  isAuthenticated: boolean;
  /** Set by the recovery deep-link / email flow; gates the update-password screen. */
  isRecovering: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    let active = true;

    // Keep query-driven consumers (session + profile-scoped data) fresh.
    const refreshScopedQueries = () => {
      queryClient.invalidateQueries({ queryKey: qk.session });
      queryClient.invalidateQueries({ queryKey: qk.myProfile });
      queryClient.invalidateQueries({ queryKey: qk.myHubs });
    };

    if (isAwsBackend) {
      getAwsAuthUser().then((u) => {
        if (!active) return;
        setUser(u);
        setInitializing(false);
      });

      // Cognito has no PASSWORD_RECOVERY event (reset is code-based), so
      // isRecovering stays false on AWS.
      const unsubscribe = Hub.listen("auth", ({ payload }) => {
        if (payload.event === "signedOut") {
          setUser(null);
          setInitializing(false);
          refreshScopedQueries();
        } else if (payload.event === "signedIn" || payload.event === "tokenRefresh") {
          getAwsAuthUser().then((u) => {
            if (!active) return;
            setUser(u);
            setInitializing(false);
            refreshScopedQueries();
          });
        }
      });

      return () => {
        active = false;
        unsubscribe();
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data.session;
      setUser(session ? { id: session.user.id, email: session.user.email } : null);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setUser(nextSession ? { id: nextSession.user.id, email: nextSession.user.email } : null);
      setInitializing(false);
      if (event === "PASSWORD_RECOVERY") setIsRecovering(true);
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") setIsRecovering(false);
      refreshScopedQueries();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      isAuthenticated: !!user,
      isRecovering,
    }),
    [user, initializing, isRecovering],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
