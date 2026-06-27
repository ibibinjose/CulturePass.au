import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useRouter, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils/cn";
import { colors, spacing } from "@/lib/theme";
import { Text } from "./Text";
import { Avatar } from "./Avatar";
import { Pinwheel } from "./Pinwheel";
import { Icon, type IconName } from "./Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMyProfile } from "@/features/profiles/api";
import { useSignOut } from "@/features/auth/api";
import { useUnreadCount } from "@/features/notifications/api";
import { useWeather, type Weather } from "@/features/weather/api";
import { useMobileLayout } from "@/lib/useMobileLayout";
import { PRIMARY_NAV, isActivePath } from "@/lib/navigation";

const BAR_HEIGHT = 66;

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

/** BrandMark sub-component for the top bar. */
function BrandMark({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="flex-row items-center gap-2.5 active:opacity-85"
      accessibilityRole="link"
      accessibilityLabel="CulturePass Australia home"
    >
      <View className="h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-subtle">
        <Pinwheel size={26} />
      </View>
      <View className="flex-row items-baseline gap-1">
        <Text className="font-display text-lg leading-none text-white">CulturePass</Text>
        <Text className="font-display text-lg leading-none text-gold-500">AU</Text>
      </View>
    </Pressable>
  );
}

/** Mobile HamburgerButton sub-component. */
interface HamburgerButtonProps {
  hasUnread: boolean;
  unread: number;
  onPress: () => void;
}

function HamburgerButton({ hasUnread, unread, onPress }: HamburgerButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={hasUnread ? `Open menu, ${unread} unread notifications` : "Open menu"}
      className={cn(
        "relative h-10 w-10 items-center justify-center rounded-pill border active:opacity-80",
        hasUnread ? "border-gold-500 bg-gold-100" : "border-pink-600 bg-pink-600/40 active:bg-pink-600/80",
      )}
    >
      <Icon name="menu" size={20} color={hasUnread ? colors.goldDeep : colors.white} />
      {hasUnread ? (
        <View className="absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-pill border border-paper bg-gold-500 px-1">
          <Text className="font-heading text-[10px] leading-none text-ink">
            {unread > 9 ? "9+" : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Desktop ActionCluster sub-component. */
interface ActionClusterProps {
  profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
    hubs?: { id: string; name: string; slug: string; images: any }[] | null;
  } | null;
  unread: number;
  hasUnread: boolean;
  onBell: () => void;
  onCreate: () => void;
  onAvatar: () => void;
}

function ActionCluster({
  profile,
  unread,
  hasUnread,
  onBell,
  onCreate,
  onAvatar,
}: ActionClusterProps) {
  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        onPress={onBell}
        hitSlop={8}
        accessibilityLabel={hasUnread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative h-10 w-10 items-center justify-center rounded-pill border border-pink-600 bg-pink-600/40 active:bg-pink-600/80"
      >
        <Icon name="bell" size={19} color={colors.white} />
        {hasUnread ? (
          <View className="absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-pill border border-paper bg-gold-500 px-1">
            <Text className="font-heading text-[10px] leading-none text-ink">
              {unread > 9 ? "9+" : unread}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        onPress={onCreate}
        hitSlop={8}
        className="h-9 flex-row items-center gap-1.5 rounded-pill bg-white px-3.5 active:bg-white/80"
      >
        <Icon name="plus" size={16} color={colors.pink} strokeWidth={2.2} />
        <Text variant="label" className="font-heading text-pink-600">
          Create
        </Text>
      </Pressable>
      <Pressable onPress={onAvatar} hitSlop={8} accessibilityLabel="Account menu" className="active:opacity-85">
        <Avatar
          name={profile?.full_name}
          uri={profile?.avatar_url}
          size={36}
          ring
          hubLogoUri={profile?.hubs?.[0]?.images?.find((img: any) => img?.type === "logo")?.url}
        />
      </Pressable>
    </View>
  );
}

/**
 * Global top app bar: brand, primary nav, a live date/time clock and an
 * auth-aware menu. Inline links on wide (web) layouts collapse into a dropdown
 * on narrow screens (where primary nav lives in the BottomTabBar). Mounted once
 * in the root layout so it persists across navigation.
 */
export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isWide = !useMobileLayout();

  const { isAuthenticated } = useAuth();
  const { data: profile } = useMyProfile();
  const signOut = useSignOut();
  const now = useClock();
  const { data: weather } = useWeather();
  const { data: unread = 0 } = useUnreadCount();
  const hasUnread = isAuthenticated && unread > 0;

  const [menu, setMenu] = useState<null | "nav" | "account">(null);
  const close = () => setMenu(null);
  const toggleAccount = () => setMenu((m) => (m === "account" ? null : "account"));

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

  const isActive = (match: string) => isActivePath(pathname, match);
  const links = PRIMARY_NAV.filter((n) => !n.authOnly || isAuthenticated);

  const renderMenuContent = () => (
    <>
      {menu === "nav" ? (
        <>
          {links.map((n) => (
            <MenuRow
              key={n.label}
              label={n.label}
              icon={n.icon}
              active={isActive(n.match)}
              onPress={() => go(n.href)}
            />
          ))}
          <View className="h-px bg-linen" />
        </>
      ) : null}

      <MenuRow label="My Council" icon="map-pin" onPress={() => go("/my-council")} />
      <View className="h-px bg-linen" />

      {isAuthenticated ? (
        <>
          <MenuRow
            label="Notifications"
            icon="bell"
            badge={hasUnread ? unread : undefined}
            onPress={() => go("/notifications")}
          />
          <MenuRow label="Messages" icon="chat" onPress={() => go("/messages")} />
          <View className="h-px bg-linen" />
          <MenuRow label="Create" icon="plus" onPress={() => go("/create")} />
          {profile ? (
            <>
              <MenuRow label="Profile" icon="user" onPress={() => go(`/profile/${profile.id}`)} />
              <MenuRow label="My Hubs" icon="grid" onPress={() => go("/my-hubs")} />
            </>
          ) : null}
          <MenuRow label="My tickets" icon="ticket" onPress={() => go("/tickets")} />
          {profile?.is_admin ? (
            <MenuRow label="Admin Dashboard" icon="lock" onPress={() => go("/admin")} />
          ) : null}
          <MenuRow label="Settings" icon="settings" onPress={() => go("/settings")} />
          <View className="h-px bg-linen" />
          <MenuRow label="Sign out" icon="logout" danger onPress={handleSignOut} />
        </>
      ) : (
        <>
          <MenuRow label="Sign in" icon="user" onPress={() => go("/sign-in")} />
          <MenuRow label="Create account" icon="plus" onPress={() => go("/sign-up")} />
        </>
      )}
    </>
  );

  return (
    <View
      style={{ paddingTop: insets.top, zIndex: 50 }}
      className="border-b border-pink-600 shadow-subtle web:bg-pink-500/95 web:backdrop-blur-md web:sticky web:top-0 bg-pink-500 relative overflow-visible"
    >
      <View
        style={{ height: BAR_HEIGHT }}
        className="mx-auto w-full max-w-content flex-row items-center gap-5 px-gutter"
      >
        {/* Brand */}
        <BrandMark onPress={() => router.push("/")} />

        {/* Inline nav (wide only) */}
        {isWide ? (
          <View className="flex-row items-center gap-1">
            {links.map((n) => (
              <NavLink
                key={n.label}
                label={n.label}
                active={isActive(n.match)}
                onPress={() => router.push(n.href)}
              />
            ))}
          </View>
        ) : null}

        <View className="flex-1" />

        {/* Live date + time + weather */}
        <Clock now={now} weather={weather} compact={!isWide} />

        <View className="flex-1" />

        {/* Right-hand actions */}
        {isWide && isAuthenticated ? (
          <ActionCluster
            profile={profile}
            unread={unread}
            hasUnread={hasUnread}
            onBell={() => router.push("/notifications")}
            onCreate={() => router.push("/create")}
            onAvatar={toggleAccount}
          />
        ) : isWide && !isAuthenticated ? (
          <Pressable
            onPress={() => router.push("/sign-in")}
            hitSlop={8}
            className="h-9 items-center justify-center rounded-pill border border-ink px-4 active:bg-sand"
          >
            <Text variant="label" className="font-heading">
              Sign in
            </Text>
          </Pressable>
        ) : (
          <HamburgerButton
            hasUnread={hasUnread}
            unread={unread}
            onPress={() => setMenu("nav")}
          />
        )}
      </View>

      {/* Desktop Popover Menu */}
      {isWide && menu !== null ? (
        <>
          <Pressable
            onPress={close}
            style={{ position: "absolute", top: BAR_HEIGHT, left: 0, right: 0, bottom: -9999, zIndex: 98 }}
          />
          <View
            style={{ position: "absolute", top: BAR_HEIGHT + 8, right: spacing.gutter, zIndex: 99 }}
            className="w-72 overflow-hidden rounded-2xl border border-linen bg-card shadow-raised"
          >
            {renderMenuContent()}
          </View>
        </>
      ) : null}

      {/* Mobile Dropdown / menu sheet */}
      {!isWide ? (
        <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={close}>
          <View className="flex-1">
            <Pressable
              onPress={close}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View pointerEvents="box-none" style={{ paddingTop: insets.top + BAR_HEIGHT + 8 }} className="flex-1">
              <View pointerEvents="box-none" className="mx-auto w-full max-w-content items-end px-gutter">
                <View className="w-72 overflow-hidden rounded-2xl border border-linen bg-card shadow-raised">
                  {renderMenuContent()}
                </View>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function NavLink({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      className="items-center gap-1.5 px-3 py-2"
    >
      <Text variant="label" className={cn("font-heading text-sm", active ? "text-white" : "text-white/80 hover:text-white")}>
        {label}
      </Text>
      <View className={cn("h-[3px] self-stretch rounded-pill", active ? "bg-gold-500" : "bg-transparent")} />
    </Pressable>
  );
}

function MenuRow({
  label,
  icon,
  active,
  danger,
  badge,
  onPress,
}: {
  label: string;
  icon?: IconName;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const color = danger ? colors.danger : colors.ink;
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 px-4 py-3.5 active:bg-sand">
      {icon ? <Icon name={icon} size={18} color={danger ? colors.danger : colors.inkMuted} /> : null}
      <Text variant="label" className={cn("font-heading", danger ? "text-danger" : "text-ink")} style={{ color }}>
        {label}
      </Text>
      {badge ? (
        <View className="ml-auto h-5 min-w-5 items-center justify-center rounded-pill bg-gold-500 px-1.5">
          <Text className="font-heading text-[11px] leading-none text-ink">{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : active ? (
        <View className="ml-auto h-1.5 w-1.5 rounded-pill bg-pink-500" />
      ) : null}
    </Pressable>
  );
}

function Clock({ now, weather, compact }: { now: Date; weather?: Weather | null; compact: boolean }) {
  const time = timeFmt.format(now);
  if (compact) {
    return (
      <View className="flex-row items-center gap-2">
        <Text variant="label" className="font-ui text-white">
          {time}
        </Text>
        {weather ? (
          <Text variant="label" className="font-ui text-white">
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
          <Text variant="caption" className="font-ui text-white">
            {weather.emoji} {weather.tempC}°
          </Text>
          {weather.name ? (
            <Text variant="overline" className="text-white/70" numberOfLines={1}>
              {weather.name}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View className="items-end">
        <Text variant="caption" className="font-ui text-white">
          {time}
        </Text>
        <Text variant="overline" className="text-white/70">
          {dateFmt.format(now)}
        </Text>
      </View>
    </View>
  );
}
