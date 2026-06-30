// =============================================================================
// Accessibility helpers (v2)
// Small, cross-platform (web + native) utilities so screens can respect the
// user's OS accessibility settings and expose clear focus / screen-reader cues.
// =============================================================================

import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

/**
 * Tracks the OS "Reduce Motion" setting (web `prefers-reduced-motion` or the
 * native accessibility toggle). Gate scale/translate transitions, auto-advancing
 * carousels and looping animations on this so motion-sensitive users get a calm
 * experience. Returns `false` until resolved, then live-updates on change.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Web: the media query is the source of truth.
    if (Platform.OS === "web") {
      if (typeof window === "undefined" || !window.matchMedia) return;
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    }

    // Native: AccessibilityInfo.
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) =>
      setReduced(value),
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}

/**
 * Announce a transient message to screen readers. Used by the Toast system so
 * non-blocking feedback is still heard by VoiceOver / TalkBack users (iOS in
 * particular doesn't read `accessibilityLiveRegion`).
 */
export function announceForAccessibility(message: string): void {
  AccessibilityInfo.announceForAccessibility?.(message);
}

/**
 * Web keyboard focus ring. No-op on native (no focus-ring concept there). Apply
 * to interactive primitives so keyboard users get a clear, on-brand indicator.
 * Uses `focus-visible` so it only appears for keyboard (not pointer) focus.
 */
export const FOCUS_RING =
  "web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ochre-500 web:focus-visible:ring-offset-2 web:focus-visible:ring-offset-paper";
