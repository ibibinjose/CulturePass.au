import { useEffect, useState } from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";
import { useRouter, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";
import { Avatar } from "./Avatar";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMyProfile } from "@/features/profiles/api";
import { useSignOut } from "@/features/auth/api";
import { useWeather, type Weather } from "@/features/weather/api";

/** Primary navigation links shown inline (wide) or in the menu (narrow). */
const NAV: { label: string; href: Href; path: string; authOnly?: boolean }[] = [
  { label: "Home", href: "/", path: "/" },
  { label: "Explore", href: "/explore", path: "/explore" },
  { label: "Calendar", href: "/calendar", path: "/calendar" },
  { label: "My Hubs", href: "/my-hubs", path: "/my-hubs", authOnly: true },
];

const BAR_HEIGHT = 64;
const WIDE = 768;

const dateFmt = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const timeFmt = new Intl.DateTimeFormat("en-AU", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** Live ticking clock, refreshed each second. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Global top app bar: brand, primary nav, a live date/time clock and an
 * auth-aware menu. Inline links on wide (web) layouts collapse into a dropdown
 * menu on narrow screens. Mounted once in the root layout so it persists across
 * navigation.
 */
export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE;

  const { isAuthenticated } = useAuth();
  const { data: profile } = useMyProfile();
  const signOut = useSignOut();
  const now = useClock();
  const { data: weather } = useWeather();

  const [menu, setMenu] = useState<null | "nav" | "account">(null);
  const close = () => setMenu(null);

  const go = (href: Href) => {
    close();
    router.push(href);
  };

  async function handleSignOut() {
    close();
    try {
      await signOut.mutateAsync();
      router.replace("/");
    } catch {
      // surfaced by the settings screen; nav bar fails quietly
    }
  }

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const links = NAV.filter((n) => !n.authOnly || isAuthenticated);

  return (
    <View style={{ paddingTop: insets.top }} className="border-b border-linen bg-card/95">
      <View
        style={{ height: BAR_HEIGHT }}
        className="mx-auto w-full max-w-content flex-row items-center gap-5 px-gutter"
      >
        {/* Brand */}
        <Pressable
          onPress={() => router.push("/")}
          hitSlop={8}
          className="flex-row items-center"
          accessibilityLabel="CulturePass Australia home"
        >
          <View className="mr-2 h-7 w-7 items-center justify-center rounded-sm bg-ink">
            <Text variant="label" tone="inverse" className="text-xs">
              CP
            </Text>
          </View>
          <Text variant="label" className="text-base">
            CulturePass
          </Text>
          <Text variant="label" tone="faint" className="ml-1 text-base">
            AU
          </Text>
        </Pressable>

        {/* Inline nav (wide only) */}
        {isWide ? (
          <View className="flex-row items-center gap-1">
            {links.map((n) => (
              <NavLink
                key={n.label}
                label={n.label}
                active={isActive(n.path)}
                onPress={() => router.push(n.href)}
              />
            ))}
          </View>
        ) : null}

        <View className="flex-1" />

        {/* Live date + time + weather */}
        <Clock now={now} weather={weather} compact={!isWide} />

        {/* Right-hand actions */}
        {isWide && isAuthenticated ? (
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.push("/create")}
              hitSlop={8}
              className="h-9 items-center justify-center rounded-lg bg-whatsapp px-3 active:bg-whatsapp-dark"
            >
              <Text variant="label" className="text-white">
                Create
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMenu("account")}
              hitSlop={8}
              accessibilityLabel="Account menu"
            >
              <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={34} />
            </Pressable>
          </View>
        ) : isWide && !isAuthenticated ? (
          <Pressable
            onPress={() => router.push("/sign-in")}
            hitSlop={8}
            className="h-9 items-center justify-center rounded-lg border border-linen px-3 active:bg-sand"
          >
            <Text variant="label">
              Sign in
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setMenu("nav")}
            hitSlop={8}
            accessibilityLabel="Open menu"
            className="h-9 w-9 items-center justify-center rounded-sm border border-linen active:bg-sand"
          >
            <Text className="font-heading text-xl leading-none text-ink">≡</Text>
          </Pressable>
        )}
      </View>

      {/* Dropdown / menu sheet */}
      <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={close}>
        <View className="flex-1">
          <Pressable
            onPress={close}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            pointerEvents="box-none"
            style={{ paddingTop: insets.top + BAR_HEIGHT }}
            className="flex-1"
          >
            <View
              pointerEvents="box-none"
              className="mx-auto w-full max-w-content items-end px-gutter"
            >
              <View className="w-64 overflow-hidden rounded-lg border border-linen bg-card shadow-card">
                {menu === "nav" ? (
                  <>
                    {links.map((n) => (
                      <MenuRow
                        key={n.label}
                        label={n.label}
                        active={isActive(n.path)}
                        onPress={() => go(n.href)}
                      />
                    ))}
                    <View className="h-px bg-linen" />
                  </>
                ) : null}

                {isAuthenticated ? (
                  <>
                    <MenuRow label="Create" onPress={() => go("/create")} />
                    {profile ? (
                      <MenuRow
                        label="Profile"
                        onPress={() => go(`/profile/${profile.id}`)}
                      />
                    ) : null}
                    <MenuRow label="My tickets" onPress={() => go("/tickets")} />
                    <MenuRow label="Settings" onPress={() => go("/settings")} />
                    <View className="h-px bg-linen" />
                    <MenuRow label="Sign out" danger onPress={handleSignOut} />
                  </>
                ) : (
                  <>
                    <MenuRow label="Sign in" onPress={() => go("/sign-in")} />
                    <MenuRow label="Create account" onPress={() => go("/sign-up")} />
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function NavLink({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      className={cn(
        "rounded-sm px-3 py-2 active:bg-sand",
        active && "bg-ink",
      )}
    >
      <Text variant="label" className={active ? "text-paper" : "text-ink-muted"}>
        {label}
      </Text>
    </Pressable>
  );
}

function MenuRow({
  label,
  active,
  danger,
  onPress,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="px-4 py-3 active:bg-sand">
      <Text
        variant="label"
        className={cn(danger ? "text-danger" : active ? "text-ink" : "text-ink")}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Clock({
  now,
  weather,
  compact,
}: {
  now: Date;
  weather?: Weather | null;
  compact: boolean;
}) {
  const time = timeFmt.format(now);
  if (compact) {
    return (
      <View className="flex-row items-center gap-2">
        <Text variant="caption" tone="muted" className="font-ui">
          {time}
        </Text>
        {weather ? (
          <Text variant="caption" tone="muted" className="font-ui">
            {weather.emoji} {weather.tempC}°
          </Text>
        ) : null}
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-4">
      {weather ? (
        <View className="items-end">
          <Text variant="caption" className="font-ui text-ink">
            {weather.emoji} {weather.tempC}°
          </Text>
          {weather.name ? (
            <Text variant="overline" tone="faint" numberOfLines={1}>
              {weather.name}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View className="items-end">
        <Text variant="caption" className="font-ui text-ink">
          {time}
        </Text>
        <Text variant="overline" tone="faint">
          {dateFmt.format(now)}
        </Text>
      </View>
    </View>
  );
}
