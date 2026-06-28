import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";

import { useAuth } from "@/features/auth/AuthProvider";
import { useMyProfile } from "@/features/profiles/api";
import { parsePreferences } from "@/lib/validation/profile";

/**
 * Sends a signed-in user who hasn't finished onboarding to /onboarding once.
 * Renders nothing; mounted near the app root (inside AuthProvider). Skips the
 * redirect while on the auth or onboarding routes to avoid loops.
 */
export function OnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated } = useAuth();
  const { data: profile, isLoading } = useMyProfile();

  useEffect(() => {
    if (!isAuthenticated || isLoading || !profile) return;
    const prefs = parsePreferences(profile.preferences);
    if (prefs.onboarding.completed) return;

    const top = segments[0] as string | undefined;
    if (top === "onboarding" || top === "(auth)") return;

    router.replace("/onboarding");
  }, [isAuthenticated, isLoading, profile, segments, router]);

  return null;
}
