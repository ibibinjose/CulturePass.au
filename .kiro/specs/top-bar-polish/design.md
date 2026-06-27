# Design Document: Top Bar Polish

## Overview

This design covers a focused visual and interaction polish pass on `components/ui/TopBar.tsx` — the single file that owns the global top app bar for CulturePass Australia. No routing, auth, data-fetching, or other files are touched.

Seven issues are addressed in one coherent refactor:

1. **BrandMark** — icon radius, wordmark gap, teal dot sizing, shadow
2. **NavLink** — full-width active indicator, correct height and colour
3. **ActionCluster** — consistent button shape/weight language on desktop
4. **HamburgerButton** — `rounded-xl` → `rounded-pill` shape correction on mobile
5. **ClockWidget** — `text-ink` / `font-ui` upgrade for compact (mobile) variant
6. **Bar background** — `web:bg-paper/95 web:backdrop-blur-md web:sticky web:top-0` + native fallback
7. **Popover** — replace the Modal-based dropdown with an inline absolutely-positioned panel on desktop

The existing sub-component boundaries (NavLink, MenuRow, Clock) are kept; two new named sub-components are extracted: **BrandMark** and **ActionCluster**, and the mobile hamburger block is named **HamburgerButton**. A **Popover** block replaces the desktop arm of the existing `Modal` (the mobile arm keeps using `Modal`).

---

## Architecture

All changes live inside the single file boundary.

```
components/ui/TopBar.tsx
  └── TopBar()                  ← root export, no change to call-site
        ├── BrandMark()         ← extracted sub-component (new)
        ├── NavLink()           ← existing, indicator fix
        ├── Clock()             ← existing, compact tone fix
        ├── ActionCluster()     ← extracted sub-component (new)
        │     └── Popover       ← inline panel replacing Modal on desktop
        ├── HamburgerButton()   ← extracted sub-component (new)
        └── MenuRow()           ← existing, unchanged
```

The `Modal` component is removed from the desktop path entirely. On mobile, `Modal` is kept as-is.

State management is unchanged: a single `menu` state (`null | "nav" | "account"`) controls both desktop Popover and mobile Modal. The `close()` helper is unchanged.

---

## Components and Interfaces

### TopBar (root)

No API changes. Internal layout changes described in [Layout](#layout) below.

**Bar root classes (before → after):**

| Before | After |
|--------|-------|
| `border-b border-linen bg-paper/95` | `border-b border-linen shadow-subtle web:bg-paper/95 web:backdrop-blur-md web:sticky web:top-0 bg-paper` |

`paddingTop: insets.top` stays on the outer View (safe area). The NativeWind `web:` prefix makes the blur/opacity/sticky apply only on web; native receives the solid `bg-paper` fallback.

---

### BrandMark

Extracted from the inline `Pressable` block. Props are implicit (receives `onPress` from parent).

```tsx
function BrandMark({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="flex-row items-center gap-2"
      accessibilityLabel="CulturePass Australia home"
    >
      <View className="h-8 w-8 items-center justify-center rounded-xl bg-ink shadow-subtle">
        <View className="h-2 w-2 rounded-pill bg-teal-500" />
      </View>
      <Text className="font-display text-lg text-ink">CulturePass</Text>
      <Text className="font-display text-lg text-pink-500">AU</Text>
    </Pressable>
  );
}
```

**Changes from current code:**

| Property | Before | After |
|----------|--------|-------|
| Icon–text gap | `mr-2.5` (hard margin) | `gap-2` on container |
| `shadow-subtle` | absent | on the icon View |
| Teal dot | `h-2 w-2` (8×8px ✓) | unchanged |

The wordmark fragments stay as two adjacent `Text` elements (no line break possible between inline `Text` siblings in React Native).

---

### NavLink

**Changes from current code:**

The active indicator changes from `h-0.5 w-5` (fixed 20 px) to `h-[3px] self-stretch` so it spans the full label width.

```tsx
function NavLink({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      className="items-center gap-1.5 px-3 py-2"
    >
      <Text
        variant="label"
        className={cn(
          "font-heading",
          active ? "text-ink" : "text-ink-muted hover:text-ink"
        )}
      >
        {label}
      </Text>
      <View
        className={cn(
          "h-[3px] self-stretch rounded-pill",
          active ? "bg-pink-500" : "bg-transparent"
        )}
      />
    </Pressable>
  );
}
```

**Key difference:** `self-stretch` (maps to `alignSelf: "stretch"`) makes the indicator View expand to the full width of its parent `Pressable`, which is itself sized to fit the label text. The `hover:text-ink` NativeWind class provides web hover feedback (Req 2.4).

---

### ActionCluster (desktop authenticated)

Extracted from the inline JSX for readability. Accepts the data it needs.

```tsx
interface ActionClusterProps {
  profile: { full_name?: string; avatar_url?: string } | undefined;
  unread: number;
  hasUnread: boolean;
  onBell: () => void;
  onCreate: () => void;
  onAvatar: () => void;
}

function ActionCluster({ profile, unread, hasUnread, onBell, onCreate, onAvatar }: ActionClusterProps) {
  return (
    <View className="flex-row items-center gap-3">
      {/* Bell */}
      <Pressable
        onPress={onBell}
        hitSlop={8}
        accessibilityLabel={hasUnread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative h-10 w-10 items-center justify-center rounded-pill border border-linen bg-card active:bg-sand"
      >
        <Icon name="bell" size={19} color={colors.ink} />
        {hasUnread ? (
          <View className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center rounded-pill border border-paper bg-gold-500 px-1">
            <Text className="font-heading text-[10px] leading-none text-ink">
              {unread > 9 ? "9+" : unread}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {/* Create */}
      <Pressable
        onPress={onCreate}
        hitSlop={8}
        className="h-9 flex-row items-center gap-1.5 rounded-pill border border-ink bg-green-500 px-3.5 active:bg-green-600"
      >
        <Icon name="plus" size={16} color={colors.ink} strokeWidth={2.2} />
        <Text variant="label" className="font-heading text-ink">Create</Text>
      </Pressable>

      {/* Avatar trigger */}
      <Pressable onPress={onAvatar} hitSlop={8} accessibilityLabel="Account menu">
        <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={36} />
      </Pressable>
    </View>
  );
}
```

**Changes from current code:**

| Property | Before | After |
|----------|--------|-------|
| Create border | `border-2 border-ink` | `border border-ink` (1 px) |
| Gap between items | `gap-3` (already correct) | `gap-3` (no change) |
| Bell: already `rounded-pill border-linen bg-card h-10 w-10` | ✓ | unchanged |

---

### HamburgerButton (mobile)

Extracted from the inline `else` branch.

```tsx
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
        hasUnread ? "border-gold-500 bg-gold-100" : "border-linen bg-card active:bg-sand",
      )}
    >
      <Icon name="menu" size={20} color={hasUnread ? colors.goldDeep : colors.ink} />
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
```

**Change from current code:** `rounded-xl` → `rounded-pill`. Everything else preserved exactly.

---

### Clock (compact variant fix)

The only change is in the `compact` branch: remove `tone="muted"` and add explicit `text-ink` class.

```tsx
// compact branch (mobile)
if (compact) {
  return (
    <View className="flex-row items-center gap-2">
      <Text variant="label" className="font-ui text-ink">
        {time}
      </Text>
      {weather ? (
        <Text variant="label" className="font-ui text-ink">
          {weather.emoji} {weather.tempC}°
        </Text>
      ) : null}
    </View>
  );
}
```

**Changes from current code:**

| Property | Before | After |
|----------|--------|-------|
| variant | `caption` | `label` |
| tone | `muted` | removed (default) |
| explicit class | — | `text-ink` |
| weather: same changes | `caption` + `muted` | `label` + `text-ink` |

The full (desktop) Clock variant is unchanged.

---

### Popover (desktop dropdown replacement)

The desktop `Modal` is removed. A new inline pattern replaces it using only `View` and `Pressable`.

The outer `View` that wraps the entire bar content (currently the `<View style={{ height: BAR_HEIGHT }} ...>`) needs a sibling container at the bar-root level to host the absolutely-positioned Popover. The approach is:

```
<View style={{ paddingTop: insets.top }} className="...bar-root-classes... relative">
  {/* Normal bar row */}
  <View style={{ height: BAR_HEIGHT }} className="...inner-row...">
    ...
  </View>

  {/* Desktop Popover — rendered only when menu !== null AND isWide */}
  {isWide && menu !== null ? (
    <>
      {/* Scrim: covers everything below the bar, z-index below panel */}
      <Pressable
        onPress={close}
        style={{
          position: "absolute",
          top: BAR_HEIGHT,
          left: 0,
          right: 0,
          bottom: -9999,
        }}
      />
      {/* Panel: attached to the right edge */}
      <View
        style={{
          position: "absolute",
          top: BAR_HEIGHT + 8,
          right: spacing.gutter,
        }}
        className="w-72 overflow-hidden rounded-2xl border border-linen bg-card shadow-raised"
      >
        {/* MenuRows — same content as before */}
        ...
      </View>
    </>
  ) : null}
</View>
```

The `position: "absolute"` on the scrim uses `bottom: -9999` to fill the viewport below the bar without needing `vh` units (not supported in React Native's Yoga layout). On web this also works because the bar container is `sticky top-0`, so the scrim visually covers the entire scrolled-away page.

The `relative` class on the bar-root View (`position: "relative"` in Yoga) establishes the stacking context so absolute children are positioned relative to the bar, not the screen root.

The mobile `Modal` is unchanged and is only rendered when `!isWide && menu !== null`.

---

## Layout

### Bar root View

```
border-b border-linen shadow-subtle
web:bg-paper/95 web:backdrop-blur-md web:sticky web:top-0
bg-paper
relative
```

`paddingTop: insets.top` applied via `style` prop (safe area, unchanged).

### Inner row View

```
height: BAR_HEIGHT (66px)   ← style prop
flex-row items-center gap-5 px-gutter max-w-content mx-auto w-full
```

### Mobile layout (isWide = false)

```
[BrandMark]  [View flex-1]  [Clock compact]  [View flex-1]  [HamburgerButton]
```

Two `<View className="flex-1" />` spacers surround the Clock to centre it. The right spacer is placed between Clock and HamburgerButton.

### Desktop layout (isWide = true)

```
[BrandMark]  [NavLinks gap-1]  [View flex-1]  [Clock full]  [ActionCluster gap-3]
```

Single `<View className="flex-1" />` between NavLinks and Clock (same as current).

---

## Data Models

No new data models. The existing types from imported hooks remain:

```ts
// From @/features/weather/api
type Weather = { emoji: string; tempC: number; name?: string }

// From @/lib/navigation
type AppNavItem = { key: string; label: string; href: Href; match: string; icon: IconName; authOnly?: boolean }
```

The `menu` state type is unchanged: `null | "nav" | "account"`.

---

## Styling Tokens Reference

| Token | Tailwind class | Value |
|-------|---------------|-------|
| Bar background (web) | `web:bg-paper/95` | `#FAF6EF` at 95% opacity |
| Bar background (native) | `bg-paper` | `#FAF6EF` solid |
| Bar blur (web) | `web:backdrop-blur-md` | 12px blur |
| Bar border | `border-b border-linen` | `#E6DAC6` |
| Bar shadow | `shadow-subtle` | `0 1px 2px rgba(26,21,16,0.05)` |
| Popover panel | `shadow-raised` | `0 14px 40px rgba(26,21,16,0.12)` |
| Active indicator | `bg-pink-500` | `#FF1E84` |
| Teal dot | `bg-teal-500` | `#00D2D2` |
| Create button | `bg-green-500` | `#25D366` |
| Bell/hamburger border | `border-linen bg-card` | `#E6DAC6` / `#FFFFFF` |
| Unread badge | `bg-gold-500 border-paper` | `#FED215` / `#FAF6EF` |
| Font display (bold) | `font-display` | Inter 700 |
| Font heading (semibold) | `font-heading` | Inter 600 |
| Font UI (medium) | `font-ui` | Inter 500 |
| Bar height | `BAR_HEIGHT` constant | 66px |
| Gutter | `px-gutter` | 20px |
| Max content width | `max-w-content` | 1180px |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature is a UI component with styling, layout, and conditional rendering logic. Property-based testing applies to the conditional rendering properties (active state, auth state, clock content) that hold universally across their input spaces. Infrastructure-level style checks (specific class names) are better covered by snapshot tests.

### Property 1: NavLink active state consistency

*For any* NavLink rendered with `active={true}`, the rendered indicator View should have `self-stretch` alignment (not a fixed width), height class `h-[3px]`, and `bg-pink-500`, while the label should carry `text-ink` and `font-heading`. Conversely, for `active={false}`, the indicator should be `bg-transparent` and the label `text-ink-muted`.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 2: NavLink accessibility props

*For any* NavLink rendered with any `active` boolean value, the root `Pressable` should have `accessibilityRole="link"` and `accessibilityState.selected` matching the `active` prop.

**Validates: Requirements 2.5**

### Property 3: Bell badge renders for any positive unread count

*For any* positive integer unread count passed to the bell Pressable, a badge View should be rendered with `bg-gold-500`, `border-paper`, `rounded-pill`, positioned at `-top-0.5 -right-0.5`, and should display either the exact count or "9+" if the count exceeds 9.

**Validates: Requirements 3.5**

### Property 4: Compact Clock text styling for any date and weather data

*For any* `Date` value passed as `now`, the compact (mobile) Clock renders the time string in a `Text` element carrying both `font-ui` and `text-ink`. *For any* `Weather` object, the compact Clock also renders the weather fragment in a `Text` element with `font-ui` and `text-ink`. When `weather` is `undefined` or `null`, no weather `Text` element is rendered.

**Validates: Requirements 5.1, 5.2, 5.3, 5.5**

### Property 5: Popover toggle idempotence

*For any* Popover open state, pressing the avatar trigger again should toggle the Popover closed (i.e., `menu` state returns to `null`). This is an idempotence property: open → close → open should return to the original open state.

**Validates: Requirements 7.5**

### Property 6: Popover menu content matches expected items for any auth state

*For any* auth state (authenticated with profile data, authenticated without profile, unauthenticated), the menu items rendered inside the Popover should exactly match the expected set: unauthenticated users see only sign-in and create-account rows; authenticated users see notifications, messages, create, profile (when profile exists), tickets, settings, and sign-out.

**Validates: Requirements 7.7**

---

## Interaction States

### NavLink

| State | Label colour | Indicator |
|-------|-------------|-----------|
| Default / inactive | `text-ink-muted` | `bg-transparent`, `self-stretch h-[3px]` |
| Hovered (web only) | `text-ink` (via `hover:text-ink`) | `bg-transparent` |
| Active | `text-ink font-heading` | `bg-pink-500 self-stretch h-[3px]` |

### HamburgerButton

| State | Border | Background | Icon colour |
|-------|--------|-----------|-------------|
| Default | `border-linen` | `bg-card` | `colors.ink` |
| Unread | `border-gold-500` | `bg-gold-100` | `colors.goldDeep` |
| Pressed | `active:opacity-80` | — | — |

### Bell (desktop)

| State | Border | Background |
|-------|--------|-----------|
| Default | `border-linen` | `bg-card` |
| Pressed | `active:bg-sand` | — |
| Unread | badge at `-top-0.5 -right-0.5` | `bg-gold-500` |

### Create button (desktop)

| State | Background |
|-------|-----------|
| Default | `bg-green-500` |
| Pressed | `active:bg-green-600` |

### Popover

| State | Behaviour |
|-------|-----------|
| Closed | Neither scrim nor panel rendered |
| Open | Scrim (`Pressable` behind panel) + panel (`View`) rendered as absolute children of bar root |
| Scrim pressed | `close()` called → `menu = null` |
| Trigger pressed while open | `setMenu("account")` is called again → same value (no change); or guard to toggle: `setMenu(m => m ? null : "account")` |

For Req 7.5, the trigger should toggle closed. The implementation should check `menu !== null` before setting: `setMenu(menu === "account" ? null : "account")`.

---

## Platform Handling

### Web

- `web:bg-paper/95 web:backdrop-blur-md` — semi-transparent blurred bar
- `web:sticky web:top-0` — bar stays pinned during scroll via CSS `position: sticky`
- `hover:text-ink` on NavLink label — hover feedback via CSS `:hover`
- The Popover pattern (absolute positioning) works naturally in the web DOM

### React Native (iOS / Android)

- `bg-paper` (solid, 100% opacity) — NativeWind strips `web:` prefixed classes on native
- `sticky` has no equivalent in Yoga layout; the bar position is handled by the root layout (`_layout.tsx` places it outside the scroll container)
- `hover:` classes are ignored on native — no hover state
- The Popover uses React Native `position: "absolute"` style — works identically on iOS/Android

No platform-specific files (`.web.tsx`) are needed; NativeWind's `web:` prefix handles all splits inline.

---

## Accessibility Annotations

| Element | Role | Label | State |
|---------|------|-------|-------|
| BrandMark | (default `button`) | `"CulturePass Australia home"` | — |
| NavLink | `link` | label text | `selected: active` |
| Bell | (default `button`) | `"Notifications"` or `"Notifications, N unread"` | — |
| Create | (default `button`) | implicit from child `Text` | — |
| Avatar trigger | (default `button`) | `"Account menu"` | — |
| HamburgerButton | (default `button`) | `"Open menu"` or `"Open menu, N unread notifications"` | — |
| Popover scrim | (default `button`) | none (decorative close target) | — |

The `accessibilityRole="link"` on NavLink is important for screen readers to announce nav items as links rather than buttons. All hitSlop values are preserved unchanged.

---

## Error Handling

- **Weather unavailable** (`weather === undefined | null`): Clock compact renders time only; no placeholder or layout shift.
- **Unread count unavailable** (defaults to `0`): `useUnreadCount` returns `0` on error — `hasUnread` stays `false`, no badge rendered. No change from current behaviour.
- **Sign-out failure**: Caught silently in `handleSignOut`, unchanged from current behaviour.
- **Profile unavailable**: `profile` is `undefined` — Avatar falls back to initials (handled by Avatar component). The "Profile" MenuRow is conditionally rendered only when `profile` exists (unchanged).

---

## Testing Strategy

This feature has no complex algorithmic logic — it is a UI component with conditional rendering, styling, and one state toggle. Testing strategy is therefore:

**Snapshot tests** (primary coverage):
- Full render in each mode: mobile unauthenticated, mobile authenticated (no unread), mobile authenticated (with unread), desktop unauthenticated, desktop authenticated (no unread), desktop authenticated (with unread)
- Popover open state snapshot (desktop authenticated)
- Compact Clock with and without weather data

**Property-based tests** (for conditional/parametric behaviour):
- Property 1: NavLink active/inactive styling — use `fast-check` or Jest parameterization across `active: true | false`
- Property 2: NavLink a11y props — verify across all nav items and both active states
- Property 3: Bell badge count rendering — vary `unread` from 1–20, verify badge content
- Property 4: Compact Clock text styling — vary `Date` and `Weather` inputs
- Property 5: Popover toggle — verify press-while-open closes
- Property 6: Popover menu items — verify across authenticated/unauthenticated states

**Unit tests** (specific behaviours):
- BrandMark press calls `router.push("/")`
- HamburgerButton unread state applies correct classes
- Clock with `weather=undefined` renders no weather fragment
- Scrim press calls `close()`
- Popover is absent on mobile (`!isWide`)
- Modal is absent on desktop (`isWide`)

Property-based tests should use **fast-check** (the existing ecosystem choice for React/TypeScript projects). Each property test runs minimum 100 iterations. Tests reference design properties by number using the tag comment format:
`// Feature: top-bar-polish, Property N: <property text>`
