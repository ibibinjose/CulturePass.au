import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";

interface AuthState {
  session: Session | null;
  user: User | null;
  /** True until the initial session check resolves. */
  initializing: boolean;
  isAuthenticated: boolean;
  /** Set by the recovery deep-link / email flow; gates the update-password screen. */
  isRecovering: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setInitializing(false);
      if (event === "PASSWORD_RECOVERY") setIsRecovering(true);
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") setIsRecovering(false);

      // Keep query-driven consumers (session + profile-scoped data) fresh.
      queryClient.invalidateQueries({ queryKey: qk.session });
      queryClient.invalidateQueries({ queryKey: qk.myHubs });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      isAuthenticated: !!session,
      isRecovering,
    }),
    [session, initializing, isRecovering],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
