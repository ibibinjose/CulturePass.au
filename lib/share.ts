// =============================================================================
// CulturePass Australia — cross-platform sharing
// Web: the Web Share API with a clipboard fallback. Native: the OS share sheet.
// No extra native modules required (RN's Share + expo-linking only).
// =============================================================================

import { Platform, Share } from "react-native";
import * as Linking from "expo-linking";

/** Absolute, shareable URL for an in-app path (e.g. "/l/profile/123"). */
export function shareUrl(path: string): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return new URL(path, window.location.origin).toString();
  }
  // Native: use universal links in production standalone builds, but local Expo Go linking in dev.
  if (__DEV__) {
    return Linking.createURL(path);
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `https://culturepass.au${cleanPath}`;
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function shareContent(opts: {
  url: string;
  title?: string;
  message?: string;
}): Promise<ShareResult> {
  const { url, title, message } = opts;

  if (Platform.OS === "web") {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share({ title, text: message, url });
        return "shared";
      } catch {
        return "cancelled";
      }
    }
    return copyText(url);
  }

  try {
    if (Platform.OS === "ios") {
      await Share.share({ url, message: title ?? message });
    } else {
      const body = [message ?? title, url].filter(Boolean).join("\n");
      await Share.share({ message: body, title });
    }
    return "shared";
  } catch {
    return "cancelled";
  }
}

/** Copy text to the clipboard (web) or fall back to the share sheet (native). */
export async function copyText(text: string): Promise<ShareResult> {
  if (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    navigator.clipboard?.writeText
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      return "failed";
    }
  }
  // No clipboard native module is bundled; the share sheet lets users copy.
  try {
    await Share.share({ message: text });
    return "shared";
  } catch {
    return "failed";
  }
}
