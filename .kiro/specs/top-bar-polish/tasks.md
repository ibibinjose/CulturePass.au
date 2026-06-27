# Implementation Plan: Top Bar Polish

## Overview

All changes are confined to `components/ui/TopBar.tsx`. The implementation is a single-file refactor broken into logical steps that each leave the file in a working, renderable state. Tests are sub-tasks marked `*` (optional/skippable). The recommended sequence is: background → brand mark → nav link → hamburger → clock → action cluster → popover.

## Tasks

- [ ] 1. Bar root background and sticky positioning
  - On the outer `View` (the one that holds `paddingTop: insets.top`), replace the `className` with:
    `"border-b border-linen shadow-subtle web:bg-paper/95 web:backdrop-blur-md web:sticky web:top-0 bg-paper relative"`
  - The `relative` class establishes the stacking context needed for the Popover in a later step
  - Remove standalone `bg-paper/95` that was the only class before (it becomes the web-only variant)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 1.1 Snapshot test: bar root classes
    - Render `TopBar` in both mobile and desktop modes (mock `useMobileLayout`)
    - Verify the outer View carries `border-b border-linen shadow-subtle bg-paper` on native
    - Verify `web:bg-paper/95 web:backdrop-blur-md web:sticky web:top-0` classes are present in the className string
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 2. Extract and update BrandMark sub-component
  - Extract the brand `Pressable` block into a named `BrandMark({ onPress })` function above `TopBar`
  - Change the icon–wordmark container: replace `mr-2.5` on the icon `View` with `gap-2` on the `Pressable` container
  - Add `shadow-subtle` to the icon View: `"h-8 w-8 items-center justify-center rounded-xl bg-ink shadow-subtle"`
  - Keep `rounded-xl`, `bg-ink`, and the 8×8 teal dot unchanged
  - Replace the inline brand block in `TopBar` with `<BrandMark onPress={() => router.push("/")} />`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.1 Unit test: BrandMark press navigates home
    - Render `BrandMark` with a mock `onPress`
    - Simulate press, verify the mock was called
    - _Requirements: 1.4_

  - [ ]* 2.2 Snapshot test: BrandMark visual structure
    - Render `BrandMark` and snapshot the output
    - Verify icon View has `rounded-xl bg-ink shadow-subtle`
    - Verify container has `gap-2 items-center`
    - Verify "CulturePass" text has `font-display text-lg text-ink`
    - Verify "AU" text has `font-display text-lg text-pink-500`
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 3. Fix NavLink active indicator
  - In the `NavLink` function, change the indicator `View`:
    - Before: `"h-0.5 w-5 rounded-pill"` + active conditional
    - After: `"h-[3px] self-stretch rounded-pill"` + active conditional
  - Add `hover:text-ink` to the inactive label className (web hover feedback):
    - `cn("font-heading", active ? "text-ink" : "text-ink-muted hover:text-ink")`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.1 Property test: NavLink active/inactive state consistency
    - **Property 1: NavLink active state consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - For `active={true}`: verify indicator has `h-[3px] self-stretch bg-pink-500`, label has `text-ink font-heading`
    - For `active={false}`: verify indicator has `bg-transparent`, label has `text-ink-muted`
    - Run for every item in `PRIMARY_NAV` (both active states)
    - `// Feature: top-bar-polish, Property 1: NavLink active state consistency`

  - [ ]* 3.2 Property test: NavLink accessibility props
    - **Property 2: NavLink accessibility props**
    - **Validates: Requirements 2.5**
    - For every `PRIMARY_NAV` item × `{active: true, active: false}`, render `NavLink` and verify `accessibilityRole="link"` and `accessibilityState.selected === active`
    - `// Feature: top-bar-polish, Property 2: NavLink accessibility props`

- [ ] 4. Extract and fix HamburgerButton sub-component
  - Extract the mobile hamburger `Pressable` block (the `else` branch of the right-hand controls) into a named `HamburgerButton({ hasUnread, unread, onPress })` function
  - Change `rounded-xl` → `rounded-pill` in the `Pressable` className
  - All other classes, `hitSlop={8}`, `accessibilityLabel`, and the unread badge are unchanged
  - Replace the inline block in `TopBar` with `<HamburgerButton hasUnread={hasUnread} unread={unread} onPress={() => setMenu("nav")} />`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.1 Snapshot test: HamburgerButton default state
    - Render with `hasUnread={false}`, verify `rounded-pill border-linen bg-card h-10 w-10` classes
    - Verify no badge rendered
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

  - [ ]* 4.2 Unit test: HamburgerButton unread state
    - Render with `hasUnread={true}` and `unread={3}`, verify `border-gold-500 bg-gold-100` classes
    - Verify badge is rendered with count "3"
    - Render with `unread={12}`, verify badge shows "9+"
    - _Requirements: 4.3_

- [ ] 5. Fix compact Clock text styling
  - In the `compact` branch of the `Clock` function:
    - Change `variant="caption" tone="muted"` → `variant="label"` with explicit `className="font-ui text-ink"` on both the time and weather `Text` elements
    - The weather conditional (`{weather ? ... : null}`) is unchanged
  - The full (desktop) Clock branch is unchanged
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ]* 5.1 Property test: compact Clock text styling for any date and weather
    - **Property 4: Compact Clock text styling for any date and weather data**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**
    - Vary `now` over several representative dates (morning, midnight, afternoon); verify time `Text` has `font-ui text-ink`
    - Vary `weather` over `{emoji, tempC, name}` objects; verify weather `Text` has `font-ui text-ink`
    - Render with `weather={undefined}`; verify no weather element is rendered
    - `// Feature: top-bar-polish, Property 4: Compact Clock text styling`

- [ ] 6. Extract ActionCluster sub-component and fix Create border
  - Extract the desktop-authenticated `<View className="flex-row items-center gap-3">` block into `ActionCluster({ profile, unread, hasUnread, onBell, onCreate, onAvatar })`
  - Inside `ActionCluster`, change the Create `Pressable`:
    - Before: `"... border-2 border-ink ..."`
    - After: `"... border border-ink ..."` (single-pixel border)
  - No other class changes; bell and avatar are already correct
  - Replace the inline block in `TopBar` with `<ActionCluster ... />`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.1 Snapshot test: ActionCluster structure and gap
    - Render `ActionCluster` with mock props, snapshot it
    - Verify outer View has `gap-3`
    - Verify Create Pressable has `border border-ink` (single border, not `border-2`)
    - Verify bell Pressable has `rounded-pill border-linen bg-card h-10 w-10`
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ]* 6.2 Property test: bell badge renders for any positive unread count
    - **Property 3: Bell badge renders for any positive unread count**
    - **Validates: Requirements 3.5**
    - For `unread` values 1–9: verify badge Text shows the exact number and has `bg-gold-500 border-paper rounded-pill`
    - For `unread` values 10–20: verify badge Text shows "9+"
    - For `unread = 0`: verify no badge rendered
    - `// Feature: top-bar-polish, Property 3: Bell badge renders for any positive unread count`

- [ ] 7. Checkpoint — verify bar renders correctly in all modes
  - Ensure all tests pass, ask the user if questions arise.
  - Manually verify in Expo web dev server that the bar is sticky, blurred, and brand mark looks correct
  - Verify NavLink active indicators span the label width on desktop
  - Verify mobile hamburger is now pill-shaped

- [ ] 8. Replace desktop Modal with inline Popover
  - Add a new `menu` toggle helper in `TopBar`:
    ```ts
    const toggleAccount = () => setMenu(m => m === "account" ? null : "account");
    ```
  - Update the avatar trigger `onPress` to use `toggleAccount` instead of `() => setMenu("account")`
  - In the JSX, restructure the bar-root `View` to wrap both the inner row and the new Popover:
    - Move the `paddingTop: insets.top` View to be the outermost container (it already has the `relative` class added in Task 1)
    - Inside it: the existing `<View style={{ height: BAR_HEIGHT }}>` inner row (unchanged)
    - After the inner row, add the desktop Popover block (see design for exact positioning):
      ```tsx
      {isWide && menu !== null ? (
        <>
          <Pressable
            onPress={close}
            style={{ position: "absolute", top: BAR_HEIGHT, left: 0, right: 0, bottom: -9999 }}
          />
          <View
            style={{ position: "absolute", top: BAR_HEIGHT + 8, right: spacing.gutter }}
            className="w-72 overflow-hidden rounded-2xl border border-linen bg-card shadow-raised"
          >
            {/* menu content — same MenuRows as before */}
          </View>
        </>
      ) : null}
      ```
  - Move all `MenuRow` content from the `Modal` into the Popover `View`; keep the same conditional structure (`menu === "nav"` for nav links, auth-gated rows)
  - Change the `Modal` to only render on mobile: wrap it in `{!isWide ? <Modal ...> ... </Modal> : null}`
  - Import `spacing` from `@/lib/theme` for `spacing.gutter` (or inline `20` if preferred)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 8.1 Unit test: Popover absent on mobile, Modal absent on desktop
    - Mock `useMobileLayout` to return `true`; render TopBar authenticated; verify `Modal` is in tree, no absolute-positioned Popover View
    - Mock `useMobileLayout` to return `false`; open menu; verify `Modal` is not in tree, Popover View is present
    - _Requirements: 7.1, 7.6_

  - [ ]* 8.2 Unit test: scrim press closes popover
    - Open Popover (desktop mode); find the scrim `Pressable`; simulate press; verify `menu` state is `null`
    - _Requirements: 7.3_

  - [ ]* 8.3 Property test: Popover toggle idempotence
    - **Property 5: Popover toggle idempotence**
    - **Validates: Requirements 7.5**
    - Press avatar trigger → verify menu opens; press again → verify menu closes; press again → verify menu opens
    - `// Feature: top-bar-polish, Property 5: Popover toggle idempotence`

  - [ ]* 8.4 Property test: Popover menu content for any auth state
    - **Property 6: Popover menu content matches expected items for any auth state**
    - **Validates: Requirements 7.7**
    - Render Popover with `isAuthenticated=false`: verify only "Sign in" and "Create account" rows present
    - Render Popover with `isAuthenticated=true, profile=undefined`: verify nav rows, notification/messages/create/settings/sign-out present; no "Profile" row
    - Render Popover with `isAuthenticated=true, profile={id, full_name}`: verify "Profile" row is also present
    - `// Feature: top-bar-polish, Property 6: Popover menu content matches expected items for any auth state`

  - [ ]* 8.5 Snapshot test: Popover panel classes
    - Open Popover in desktop authenticated mode; verify panel `View` has `rounded-2xl border border-linen bg-card shadow-raised w-72`
    - Verify positioning styles: `position: "absolute"`, `top: BAR_HEIGHT + 8`, `right: spacing.gutter`
    - _Requirements: 7.2, 7.4_

- [ ] 9. Final checkpoint — full regression pass
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm no TypeScript errors (`npx tsc --noEmit`)
  - Spot-check mobile layout: brand mark, centred clock, pill hamburger
  - Spot-check desktop layout: nav links with full-width indicators, action cluster, popover opens/closes

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster implementation run
- All tasks operate on `components/ui/TopBar.tsx` only — no other files are modified
- `spacing` from `@/lib/theme` provides `gutter: 20` for the Popover `right` offset; it's already imported indirectly via `colors` — add `spacing` to the named import
- `fast-check` is the recommended property-based testing library for TypeScript; install with `npm install --save-dev fast-check` if not already present
- Checkpoints at Tasks 7 and 9 gate the two main phases (style polish vs. structural popover change)

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] },
    { "wave": 4, "tasks": ["4"] },
    { "wave": 5, "tasks": ["5"] },
    { "wave": 6, "tasks": ["6"] },
    { "wave": 7, "tasks": ["7"] },
    { "wave": 8, "tasks": ["8"] },
    { "wave": 9, "tasks": ["9"] }
  ]
}
```

Each step leaves `TopBar.tsx` in a buildable state. Steps 1–6 are pure styling/extraction changes with no structural JSX rewiring. Step 8 is the structural change (Modal → Popover) and depends on Task 1 (`relative` stacking context on bar root).
