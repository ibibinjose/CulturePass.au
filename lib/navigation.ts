import type { Href } from "expo-router";

import type { IconName } from "@/components/ui/Icon";

export type AppNavItem = {
  key: string;
  label: string;
  href: Href;
  match: string;
  icon: IconName;
  authOnly?: boolean;
};

export type AppFooterGroup = {
  title: string;
  links: {
    label: string;
    href: Href;
  }[];
};

export const PRIMARY_NAV: AppNavItem[] = [
  { key: "discover", label: "Discover", href: "/", match: "/", icon: "compass" },
  { key: "calendar", label: "Calendar", href: "/calendar", match: "/calendar", icon: "calendar" },
  { key: "my-council", label: "My Council", href: "/my-council", match: "/my-council", icon: "map-pin" },
  { key: "communities", label: "Communities", href: "/communities", match: "/communities", icon: "users" },
  { key: "messages", label: "Messages", href: "/messages", match: "/messages", icon: "chat", authOnly: true },
];

export const MOBILE_TABS: AppNavItem[] = [
  { key: "discover", label: "Discover", href: "/", match: "/", icon: "compass" },
  { key: "calendar", label: "Calendar", href: "/calendar", match: "/calendar", icon: "calendar" },
  { key: "communities", label: "Community", href: "/communities", match: "/communities", icon: "users" },
  { key: "messages", label: "Chat", href: "/messages", match: "/messages", icon: "chat", authOnly: true },
  // Resolved at runtime to the signed-in user's public profile (/profile/[id])
  // in BottomTabBar — the placeholder href keeps the typed-routes config valid.
  { key: "profile", label: "Profile", href: "/profile/edit", match: "/profile", icon: "user", authOnly: true },
];

export const FOOTER_GROUPS: AppFooterGroup[] = [
  {
    title: "Discover",
    links: [
      { label: "Discover", href: "/" },
      { label: "Calendar", href: "/calendar" },
      { label: "Councils Directory", href: "/councils" },
    ],
  },
  {
    title: "Create",
    links: [
      { label: "Create a hub", href: "/create/hub" },
      { label: "Professional profile", href: "/create/professional" },
      { label: "My hubs", href: "/my-hubs" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Messages", href: "/messages" },
      { label: "Notifications", href: "/notifications" },
      { label: "Tickets", href: "/tickets" },
      { label: "Settings", href: "/settings" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/settings/about" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Contact", href: "/legal/contact" },
    ],
  },
];

export function isActivePath(pathname: string, match: string) {
  return match === "/" ? pathname === "/" : pathname === match || pathname.startsWith(`${match}/`);
}
