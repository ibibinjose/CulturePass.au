import { Platform, useWindowDimensions } from "react-native";

/** Width (px) below which web is treated as a mobile layout. */
export const MOBILE_BREAKPOINT = 768;

/**
 * Single source of truth for "show the mobile view".
 *
 * Native (iOS/Android) is always mobile; web is mobile only when the viewport
 * is narrow. Used by the TopBar (compact + burger), the BottomTabBar, and
 * Screen (safe-area edges) so they never disagree about the layout mode.
 */
export function useMobileLayout(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS !== "web" || width < MOBILE_BREAKPOINT;
}
