# Requirements Document

## Introduction

The CulturePass Australia app's global TopBar component requires a visual and interaction polish pass to address seven known issues: a weak brand mark, low-contrast nav active states, an inconsistent desktop button language, a mismatched hamburger button shape on mobile, an under-weighted clock/weather widget on mobile, a bar background that causes content ghosting on scroll, and a heavy Modal-based dropdown that should be replaced with a lightweight positioned popover on desktop. All changes must stay within the existing design system tokens (warm-earth palette, Inter type scale, NativeWind/Tailwind utilities) and must not alter any navigation routing logic, auth gating, or data-fetching hooks.

## Glossary

- **TopBar**: The global top app bar component mounted once in `app/_layout.tsx`, rendered at the top of every screen.
- **BrandMark**: The left-most Pressable in the TopBar containing the logo icon and "CulturePass AU" wordmark.
- **LogoIcon**: The square icon view (currently 32×32 `rounded-xl bg-ink` with a teal dot) that represents the app brand.
- **Wordmark**: The inline text "CulturePass" + "AU" rendered next to the LogoIcon.
- **NavLink**: A desktop-only inline nav link in the TopBar that renders a label and an active-state indicator.
- **ActionCluster**: The group of interactive controls rendered on the right side of the TopBar on wide (desktop) layouts — notification bell, Create button, and avatar/sign-in.
- **HamburgerButton**: The mobile-only Pressable that opens the nav/account dropdown on narrow layouts.
- **ClockWidget**: The centre section of the TopBar showing live time, date, and optional weather — rendered in compact form on mobile and in full form on desktop.
- **DropdownMenu**: The overlay panel that opens when the HamburgerButton (mobile) or avatar/account trigger (desktop) is pressed, listing nav and account actions.
- **Popover**: A lightweight absolutely-positioned overlay attached to a trigger element, rendered in the same React tree without a Modal; used on desktop in place of the Modal-based DropdownMenu.
- **BAR_HEIGHT**: The constant 66px height of the inner bar content row.
- **Design system tokens**: Colors, typography, spacing, border-radius, and shadow values defined in `tailwind.config.js`.
- **Wide layout**: Screen widths where `useMobileLayout()` returns `false` (desktop/web breakpoint).
- **Mobile layout**: Screen widths where `useMobileLayout()` returns `true`.

## Requirements

### Requirement 1: Brand Mark Visual Upgrade

**User Story:** As a user, I want the app logo and wordmark in the top bar to feel like a deliberate brand mark, so that I immediately recognise the product and it conveys visual quality.

#### Acceptance Criteria

1. THE LogoIcon SHALL use `rounded-xl` (22 px) border radius, `bg-ink` fill, and a teal-500 (`#00D2D2`) circular accent mark of sufficient size to read as intentional — minimum 8×8 px with `rounded-pill`.
2. THE Wordmark SHALL render "CulturePass" in `font-display` weight (700) and " AU" as a visually distinct suffix — `font-display` weight, `text-pink-500` colour — with no line break between the two fragments.
3. THE BrandMark container SHALL align the LogoIcon and Wordmark on a single horizontal baseline with `items-center` and a gap of at least 8 px between icon and text.
4. WHEN the BrandMark is pressed, THE TopBar SHALL navigate to the home route and the navigation SHALL complete — the bar layout SHALL remain stable with no flicker or layout shift during or after navigation.
5. THE LogoIcon SHALL render with `shadow-subtle` to lift it from the bar surface.

### Requirement 2: Desktop Nav Link Active State

**User Story:** As a desktop user, I want active nav links to be clearly distinguished from inactive ones, so that I always know which section I am currently in.

#### Acceptance Criteria

1. WHEN a NavLink is active, THE NavLink SHALL display a bottom indicator that is at least 3 px tall, `rounded-pill`, spans the full width of the label text (not a fixed 20 px), and uses `bg-pink-500` colour.
2. WHEN a NavLink is inactive, THE NavLink SHALL display the label in `text-ink-muted` colour and no bottom indicator.
3. WHEN a NavLink is active, THE NavLink label SHALL display in `text-ink` colour and `font-heading` (600) weight.
4. WHEN a NavLink is hovered (web platform), THE NavLink label SHALL transition to `text-ink` colour to provide hover feedback before selection.
5. THE NavLink SHALL maintain its `accessibilityRole="link"` and `accessibilityState={{ selected: active }}` annotations.

### Requirement 3: Desktop Action Cluster Visual Consistency

**User Story:** As a desktop user, I want the notification bell, Create button, and avatar in the top bar to feel like they belong to the same design system, so that the bar looks polished rather than assembled from different components.

#### Acceptance Criteria

1. THE notification bell Pressable SHALL use `rounded-pill` shape, `border border-linen` stroke, `bg-card` fill, and dimensions of 40×40 px — matching the visual language of the avatar.
2. THE Create button SHALL use `rounded-pill` shape, `bg-green-500` fill, `border border-ink` stroke (1 px, not 2 px), and a height of 36 px — reducing the border weight to match the bell and sign-in buttons.
3. THE avatar Pressable SHALL retain its existing `rounded-pill` (inherent from Avatar component) and `border-linen` border style as the reference baseline for the cluster.
4. WHEN the TopBar renders the authenticated desktop ActionCluster, THE ActionCluster SHALL use a consistent gap of 12 px (`gap-3`) between all three elements.
5. THE unread badge on the notification bell SHALL use `bg-gold-500` fill, `border border-paper` stroke, `rounded-pill` shape, and appear at the `-top-1 -right-1` position.

### Requirement 4: Mobile Hamburger Button Shape Correction

**User Story:** As a mobile user, I want the hamburger menu button to match the visual language of the rest of the bar, so that it does not look out of place.

#### Acceptance Criteria

1. THE HamburgerButton SHALL use `rounded-pill` border radius, replacing the current `rounded-xl` (12 px) shape, to match all other interactive pill-shaped elements in the bar.
2. THE HamburgerButton default state SHALL use `border border-linen bg-card` (consistent with the desktop bell button shape language).
3. WHEN the HamburgerButton has unread notifications, THE HamburgerButton SHALL use `border-gold-500 bg-gold-100` fill and the icon SHALL use `colors.goldDeep` colour — preserving the existing unread-state visual feedback.
4. THE HamburgerButton SHALL retain its `hitSlop={8}` and `accessibilityLabel` annotations.
5. THE HamburgerButton dimensions SHALL be 40×40 px (`h-10 w-10`).

### Requirement 5: Mobile Clock/Weather Widget Visibility

**User Story:** As a mobile user, I want the time and weather information in the top bar to be legible, so that I can glance at it without straining.

#### Acceptance Criteria

1. WHEN the TopBar renders on a mobile layout, THE ClockWidget SHALL display the time using `text-ink` colour (not `text-ink-muted` or faint tones) and `font-ui` (500) weight.
2. WHEN the TopBar renders on a mobile layout and weather data is available, THE ClockWidget SHALL display the weather emoji and temperature in `text-ink` colour adjacent to the time, separated by a gap of 8 px.
3. THE compact ClockWidget SHALL use `variant="label"` or equivalent (`font-ui text-sm`) for time and weather text to ensure legibility at the small bar height.
4. THE ClockWidget SHALL be visually centred between the BrandMark and the right-hand controls on all layouts (mobile and desktop) using `flex-1` spacers on both sides.
5. WHEN weather data is unavailable, THE compact ClockWidget SHALL display only the time with no empty placeholder.

### Requirement 6: Bar Background Depth

**User Story:** As a user, I want the top bar to remain visually crisp and distinct from scrolling page content, so that the bar feels anchored and does not ghost.

#### Acceptance Criteria

1. THE TopBar container SHALL apply `backdrop-blur-md` (or equivalent platform-safe blur) alongside the existing `bg-paper/95` opacity class to prevent content ghosting on scroll.
2. ON React Native (non-web) platforms, IF `backdrop-blur-md` is not supported, THE TopBar container SHALL use `bg-paper` (100% opacity, no transparency) as a fallback to guarantee the bar is fully opaque.
3. THE TopBar container SHALL retain `border-b border-linen` to maintain the hairline separator between the bar and page content.
4. WHEN the TopBar is rendered on web, THE TopBar container position SHALL be sticky (`sticky top-0`) so the bar stays visible during scroll without requiring JavaScript-based scroll listeners.
5. THE TopBar container SHALL apply `shadow-subtle` to provide a soft lift from the content below.

### Requirement 7: Desktop Dropdown Replaced with Popover

**User Story:** As a desktop user, I want the account/nav dropdown to open as a lightweight popover anchored to its trigger, so that it behaves like a standard desktop UI pattern without the overhead of a full-screen modal.

#### Acceptance Criteria

1. ON wide (desktop) layouts, THE DropdownMenu SHALL be implemented as a Popover component rendered using absolute positioning within the React component tree, NOT as a React Native `Modal`.
2. THE Popover SHALL be absolutely positioned below the account avatar trigger, aligned to the trailing (right) edge of the ActionCluster, with a vertical offset of 8 px from the bottom of the bar.
3. WHEN the Popover is open, THE TopBar SHALL render a transparent full-width/full-height scrim (press-to-close backdrop) beneath the Popover panel at the layout level, without covering the TopBar itself.
4. THE Popover panel SHALL use `rounded-2xl`, `border border-linen`, `bg-card`, `shadow-raised`, and a fixed width of 288 px (`w-72`).
5. WHEN the Popover trigger is pressed while the Popover is already open, THE TopBar SHALL close the Popover.
6. ON mobile layouts, THE DropdownMenu SHALL continue to use the existing `Modal`-based full-screen sheet — the Popover pattern applies to desktop only.
7. THE Popover SHALL inherit all existing menu items, icons, badge counts, and sign-out behaviour without regression.
