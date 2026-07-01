# Design Document — app-overhaul

## Overview

This document covers the architecture and implementation design for four targeted improvement areas
in the CulturePass Australia Expo app:

1. **Auth correctness** — Hub event timing, Cognito error mapping, session persistence on reload
2. **AWS config hardening** — dual-source fallback, hot-reload fingerprinting, guest identity pool
3. **Cross-platform UI/UX polish** — keyboard avoidance, safe area, web breakpoints, touch targets, skeletons, error feedback, design tokens
4. **AI guidance documents** — `Assistant.md` and `CLAUDE.md` structural improvements

Stack: Expo SDK ~53 (React Native 0.79 + react-native-web), expo-router ~5, AWS Amplify Gen 2
(Cognito, AppSync/DynamoDB, S3, Lambda), TanStack Query 5, Zustand 5, Zod 3,
NativeWind 4 + Tailwind 3, TypeScript strict.

---

## Architecture

The existing layered architecture is unchanged. All changes are contained within:

```
features/auth/          AuthProvider.tsx, RequireAuth.tsx
app/(auth)/             sign-in.tsx (authMessage function)
lib/aws/                config.ts (configureAmplify, getDataAuthMode)
components/ui/          AuthShell.tsx, Screen.tsx, Button.tsx, Skeleton.tsx, BottomTabBar.tsx, TopBar.tsx
Assistant.md
CLAUDE.md
```

No new layers are introduced. No new external dependencies are required beyond what is already
bundled (react-native-reanimated is already present for Skeleton animation).

---

## Component Interfaces

### 1. Auth Hub Event Timing Fix

**Problem:** `signIn.mutateAsync()` resolves before the Amplify Hub `signedIn` event fires.
`router.replace("/")` executes while `isAuthenticated` is still `false`, causing RequireAuth to
immediately redirect back to `/sign-in`.

**Solution:** After `signIn.mutateAsync()` resolves, `SignInScreen` polls `isAuthenticated` from
the AuthContext rather than navigating immediately. A `waitForAuth()` helper encapsulates the poll
with a 3 000 ms safety cap.

```typescript
// app/(auth)/sign-in.tsx
import { useAuth } from "@/features/auth/AuthProvider";

/** Poll until isAuthenticated is true or the timeout elapses. */
async function waitForAuth(
  isAuthenticated: () => boolean,
  timeoutMs = 3000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const check = () => {
      if (isAuthenticated() || Date.now() >= deadline) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}
```

`SignInScreen` uses a ref to expose the latest `isAuthenticated` value inside the async closure:

```typescript
const { isAuthenticated } = useAuth();
const isAuthRef = useRef(isAuthenticated);
useEffect(() => { isAuthRef.current = isAuthenticated; }, [isAuthenticated]);

async function submit() {
  // ...
  await signIn.mutateAsync(parsed.data);
  await waitForAuth(() => isAuthRef.current);
  router.replace("/");
}
```

**AuthProvider Hub handler** already calls `getAwsAuthUser()` and sets `user` before clearing
`initializing`. The existing implementation is correct; the fix is entirely in `SignInScreen`.

**RequireAuth decision table:**

| `initializing` | `isAuthenticated` | Output |
|---|---|---|
| `true` | any | Full-screen skeleton placeholder |
| `false` | `false` | `<Redirect href="/sign-in" />` |
| `false` | `true` | `{children}` |


### 2. Cognito Error Code Mapping in `authMessage`

**Problem:** The current `authMessage` implementation uses `error.message` substring matching
(`/invalid login credentials/i`) which is fragile — Cognito `message` strings are undocumented and
can change. The `error.name` property is the stable, documented Cognito error code.

**Solution:** Replace substring matching with a `name`-keyed record lookup:

```typescript
// app/(auth)/sign-in.tsx
const COGNITO_MESSAGES: Record<string, string> = {
  NotAuthorizedException: "That email or password isn't right.",
  UserNotConfirmedException: "Please confirm your email first — check your inbox.",
  UsernameExistsException: "An account with that email already exists.",
  CodeMismatchException: "That code isn't right — please check and try again.",
  ExpiredCodeException: "That code has expired — please request a new one.",
  LimitExceededException: "Too many attempts — please wait a few minutes and try again.",
  InvalidPasswordException: "Password does not meet the requirements.",
};

export function authMessage(err: unknown): string {
  if (err instanceof Error) {
    return COGNITO_MESSAGES[err.name] ?? err.message;
  }
  return "Something went wrong.";
}
```

Key properties:
- Matching uses `error.name`, never `error.message`.
- Unmapped `Error` instances fall through to `err.message`.
- Non-`Error` throws return `"Something went wrong."`.
- The `COGNITO_MESSAGES` record is the single source of truth; new codes are added in one place.

### 3. Session Persistence on Reload

**Problem:** If `getAwsAuthUser()` resolves before the Hub listener is attached there is a risk
of missing the initial session; additionally the current code sets `initializing = false` inside
the same `.then()` callback as `setUser`, which is correct but the ordering must be explicit.

The existing `AuthProvider` implementation is already largely correct. The design formalises the
required ordering and the error-boundary contract:

```typescript
// features/auth/AuthProvider.tsx  (revised mount effect)
getAwsAuthUser()
  .then((u) => {
    if (!active) return;
    setUser(u);              // 1. set user first
    setDataSignedIn(!!u);   // 2. update data auth mode
    setInitializing(false); // 3. clear loading gate last
  })
  .catch((e) => {
    console.error("[AuthProvider] mount session check failed:", e);
    if (!active) return;
    setDataSignedIn(false);
    setInitializing(false); // still clear loading gate so app renders
  });
```

Children are always rendered (the `AuthProvider` never suspends its own render). The loading gate
lives in `RequireAuth` only.


### 4. AWS Config Dual-Source Fallback

**Problem:** `configureAmplify()` only reads `EXPO_PUBLIC_*` env vars. If a developer has not
populated `.env` after running `npx ampx sandbox`, all values are empty strings and `isAwsConfigured`
is `false`, preventing any Amplify call. The `amplify_outputs.json` file is already imported for
`modelIntrospection` but its other fields are ignored.

**Solution:** A `resolve(envVar, outputPath)` helper reads the env var first; if empty, it reads
the corresponding path from `amplify_outputs.json`. All field reads go through this helper.

```typescript
// lib/aws/config.ts — dual-source resolution

import amplifyOutputs from "@/amplify_outputs.json";

type AmplifyOutputs = typeof amplifyOutputs;

/**
 * Resolve a config value: prefer the EXPO_PUBLIC_* env var; fall back to
 * the corresponding field in amplify_outputs.json.
 */
function resolve<K extends keyof AmplifyOutputs["auth"]>(
  envValue: string,
  section: "auth" | "data",
  field: string,
): string {
  if (envValue) return envValue;
  try {
    const outputs = amplifyOutputs as Record<string, Record<string, string>>;
    return outputs[section]?.[field] ?? "";
  } catch {
    return "";
  }
}

const region        = resolve(process.env.EXPO_PUBLIC_AWS_REGION ?? "", "auth", "aws_region")
                      || "ap-southeast-2";
const userPoolId    = resolve(process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? "", "auth", "user_pool_id");
const userPoolClientId = resolve(process.env.EXPO_PUBLIC_COGNITO_APP_CLIENT_ID ?? "", "auth", "user_pool_client_id");
const identityPoolId   = resolve(process.env.EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID ?? "", "auth", "identity_pool_id");
const graphqlEndpoint  = resolve(process.env.EXPO_PUBLIC_APPSYNC_ENDPOINT ?? "", "data", "url");
```

If both sources are empty for the required fields (`userPoolId`, `userPoolClientId`),
`configureAmplify()` returns `false` and logs a descriptive error without calling `Amplify.configure()`.

### 5. Hot-Reload Reconfiguration

**Problem:** The module-level `let configured = false` flag survives fast-refresh in Metro. When
`lib/aws/config.ts` is hot-reloaded (e.g. after editing the file), `configured` is reset to `false`
by the module boundary crossing — so `configureAmplify()` is called again but may call
`Amplify.configure()` with stale values if env vars changed.

**Solution:** Store a JSON fingerprint of the resolved config values. `configureAmplify()` compares
the current fingerprint against the stored one and only calls `Amplify.configure()` when the
fingerprint changes. In `__DEV__` mode, the comparison is always performed. In production, the
initial `configured` guard still short-circuits for performance.

```typescript
// lib/aws/config.ts

let configured = false;
let configFingerprint: string | null = null;

function buildFingerprint(cfg: { userPoolId: string; userPoolClientId: string; identityPoolId: string; graphqlEndpoint: string; region: string }): string {
  return JSON.stringify(cfg);
}

export function configureAmplify(): boolean {
  const fingerprint = buildFingerprint({ userPoolId, userPoolClientId, identityPoolId, graphqlEndpoint, region });

  // In dev, re-run configure when the resolved values have changed (hot-reload).
  // In production, the initial guard is sufficient.
  if (__DEV__) {
    if (configured && configFingerprint === fingerprint) return true;
  } else {
    if (configured) return true;
  }

  if (!userPoolId || !userPoolClientId) {
    console.error("[configureAmplify] Missing required Cognito values. Check EXPO_PUBLIC_* vars or amplify_outputs.json.");
    return false;
  }

  // ... Amplify.configure() call ...

  configured = true;
  configFingerprint = fingerprint;
  return true;
}
```


### 6. AppSync Guest Identity Pool Auth Mode

**Problem:** `getDataAuthMode()` returns `"identityPool"` for guests, but if `identityPoolId` was
not provided to `Amplify.configure()`, AppSync requests fail with "No federated jwt". The existing
code already conditionally includes `allowGuestAccess: true` when `identityPoolId` is truthy — the
dual-source fallback in Requirement 4 ensures `identityPoolId` is populated from `amplify_outputs.json`
when the env var is absent.

**Design:**

`getDataAuthMode()` remains a simple two-branch pure function:

```typescript
export function getDataAuthMode(): "userPool" | "identityPool" {
  return dataSignedIn ? "userPool" : "identityPool";
}
```

`configureAmplify()` includes the guest block whenever `identityPoolId` resolves (from either source):

```typescript
if (identityPoolId) {
  Amplify.configure({
    Auth: { Cognito: { userPoolId, userPoolClientId, identityPoolId, allowGuestAccess: true } },
    ...api,
  });
} else {
  console.warn("[configureAmplify] No identityPoolId — guest reads will fail with 'No federated jwt'.");
  Amplify.configure({
    Auth: { Cognito: { userPoolId, userPoolClientId } },
    ...api,
  });
}
```

This is the same conditional as the current code; the only change is the fallback that now
populates `identityPoolId` from `amplify_outputs.json` when the env var is absent.

### 7. Keyboard-Avoiding Behaviour on Auth Forms (`AuthShell`)

**Problem:** `AuthShell` currently wraps `Screen`, which already contains a `KeyboardAvoidingView`
with `behavior="padding"` on iOS only. The auth-specific content (a single `Card` child) is nested
inside `Screen`'s scroll view, so the existing implementation should suffice — but the requirement
calls for explicit `AuthShell`-level control.

**Design:** Keep the `KeyboardAvoidingView` inside `Screen`. `AuthShell` passes
`scroll={true}` (default) and relies on `Screen`'s existing KAV:

- iOS: `behavior="padding"` (Screen default — correct)
- Android: `behavior={undefined}` in Screen, which relies on `android:windowSoftInputMode="adjustResize"` in `app.json` — update the Android manifest entry.
- Web: `KeyboardAvoidingView` renders as a no-op passthrough on web (React Native Web ignores the behavior).

If `android:windowSoftInputMode` is not set, add `behavior="height"` for Android in Screen:

```typescript
behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
```

The `AuthShell` component itself does not add another `KeyboardAvoidingView` — double-wrapping
causes layout artifacts on iOS.

### 8. Safe Area Handling

**Current state analysis:**
- `Screen` already wraps content in `SafeAreaView` from `react-native-safe-area-context`.
- The `edges` prop defaults to `[]` on mobile (TopBar owns the top inset via `useSafeAreaInsets().top` in `TopBar.tsx`) and `["bottom"]` on desktop web.
- `BottomTabBar` already applies `paddingBottom: insets.bottom` via `useSafeAreaInsets()`.
- `TopBar` applies `paddingTop: insets.top`.

**Design:** The existing implementation is correct for the described requirements. No structural
changes are needed. The tasks will verify:

1. `Screen`'s `SafeAreaView` edges are `[]` on mobile (TopBar + BottomTabBar own their respective insets) and `["bottom"]` on desktop web — this matches the current code.
2. `TopBar` uses `insets.top` for paddingTop — already present.
3. `BottomTabBar` uses `insets.bottom` for paddingBottom — already present.
4. Web renders standard layout without native safe area insets — handled by the `useMobileLayout()` branch.

The only actionable change is adding `edges={["left", "right"]}` to `Screen`'s `SafeAreaView` to
protect against side notches (iPad split view, some Android form factors):

```typescript
// Screen.tsx — extend edges to include left/right
const resolvedEdges = edges ?? (mobile
  ? (["left", "right"] as Edge[])
  : (["bottom", "left", "right"] as Edge[]));
```


### 9. Web Breakpoints on `AuthShell` and Cards

**Current state:** `Screen` already supports `maxWidth` with values `"content" | "prose" | "form" | "none"`. The `tailwind.config.js` defines `max-w-form: 540px` and `max-w-content: 1180px`.

**Required additions:**

The requirement asks for a `"wide"` breakpoint (1 200 px). The existing `max-w-content: 1180px` is close; rename or add `max-w-wide: 1200px` in `tailwind.config.js`:

```javascript
// tailwind.config.js
maxWidth: {
  content: "1180px",
  prose: "660px",
  form: "540px",
  wide: "1200px",   // new
},
```

Update `Screen`'s `MAX` record and `ScreenProps` type:

```typescript
type MaxWidth = "content" | "prose" | "form" | "wide" | "none";

const MAX: Record<MaxWidth, string> = {
  content: "max-w-content",
  prose:   "max-w-prose",
  form:    "max-w-form",
  wide:    "max-w-wide",
  none:    "",
};
```

`AuthShell` already passes `maxWidth="form"` to `Screen`, which constrains the auth column to
540 px on wide viewports. No change needed for Requirement 9.1.

For Requirement 9.3 (minimum 16 px horizontal padding on narrow web viewports), `Screen` already
applies `px-gutter` (20 px) which satisfies the ≥ 16 px constraint.

For Requirement 9.2 (`Card` max-width 600 px within `AuthShell`), the `Card` is already constrained
by `AuthShell`'s `Screen maxWidth="form"` (540 px), which is narrower than 600 px — requirement
is already satisfied structurally.

### 10. Minimum Touch Target Size

**Current state:**
- `Button` uses `SIZE.md = "h-10 px-4 rounded-xl"` (40 px on web, ~40 pt on native).
- `Pressable` links in `sign-in.tsx` use `hitSlop={8}` (flat value, expands all four sides by 8 pt).

**Changes:**

**Button:** Update `SIZE` to ensure 44 pt on iOS/Android and 40 px on web:

```typescript
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 rounded-lg",
  md: "h-11 px-4 rounded-xl",  // 44pt on native; was h-10 (40pt)
  lg: "h-12 px-5.5 rounded-xl",
};
```

For web, apply `web:h-10` override so web gets 40 px while native gets 44 pt:

```typescript
md: "h-11 web:h-10 px-4 rounded-xl",
```

**Pressable link hitSlop:** Replace flat `hitSlop={8}` with an object that ensures 44×44 pt hit
target. Given the `Text` label is ~20 pt tall, an `8` pt inset is insufficient. Use:

```typescript
hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
```

**BottomTabBar items:** The tab items are already inside an `h-16` (64 pt) container. The
`Pressable` spans the full height via `flex-1 items-center justify-center`. No change needed.

### 11. Loading and Skeleton States

**Current `Skeleton` component:** Uses `react-native-reanimated`'s `Animated` API (note: the
current implementation uses the legacy `Animated` from `react-native`, not `react-native-reanimated`).

**Requirement 11.5** asks for a shimmer using `react-native-reanimated`. The design upgrades the
animation to `useSharedValue` + `withRepeat`/`withTiming` for improved performance on the UI thread:

```typescript
// components/ui/Skeleton.tsx — reanimated shimmer
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import { colors } from "@/lib/theme";

// Base color: linen (#E6DAC6), highlight: sand (#F1E9DA)
// 1200ms cycle = 600ms fade in + 600ms fade out
const opacity = useSharedValue(0);
useEffect(() => {
  opacity.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 600 }),
    ),
    -1, // infinite
    false,
  );
}, [opacity]);
```

Wait — note that the **base** is `linen` and the **highlight** is `sand` per Requirement 11.5
(`linen` base, `sand` highlight). This is slightly brighter than the current implementation
(which uses `sand` base and `linen` overlay). Update colors accordingly:

```typescript
// Base: bg-linen; highlight pulse: sand
<View className="overflow-hidden rounded-lg bg-linen" ...>
  <Animated.View style={[absoluteFill, { backgroundColor: colors.sand, opacity: animatedOpacity }]} />
</View>
```

**RequireAuth skeleton:** Replace the text-only loading state with a `FullScreenSkeleton` sub-component:

```typescript
// features/auth/RequireAuth.tsx
if (initializing) {
  return (
    <Screen contentClassName="pt-section gap-5" scroll={false}>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
      <View className="mt-4 gap-3">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </View>
    </Screen>
  );
}
```

**Button loading:** Already implemented — `loading={true}` renders `<ActivityIndicator>` and sets
`disabled`. No change needed for Requirement 11.4.


### 12. Error Feedback UI

**Error banner clearing on input edit:**

`SignInScreen` (and all auth screens) should clear `banner` when the user starts typing. Add
`onChangeText` wrappers:

```typescript
const clearBanner = () => setBanner(null);

<Input
  value={email}
  onChangeText={(t) => { clearBanner(); setEmail(t); }}
  ...
/>
<PasswordInput
  value={password}
  onChangeText={(t) => { clearBanner(); setPassword(t); }}
  ...
/>
```

**Network/AppSync error mapping for list/detail screens:**

Add a `mapFetchError(err: unknown): string` utility in `lib/utils/errorMessage.ts`:

```typescript
export function mapFetchError(err: unknown): string {
  if (err instanceof Error) {
    if (/network|failed to fetch|no internet/i.test(err.message)) {
      return "Couldn't load content — check your connection.";
    }
    return "Something went wrong. Tap to retry.";
  }
  return "Something went wrong. Tap to retry.";
}
```

List/detail screens use TanStack Query's `isError` + `error` + `refetch()` to render an inline
error state:

```typescript
if (isError) {
  return (
    <Screen>
      <Banner
        variant="error"
        message={mapFetchError(error)}
        action={{ label: "Retry", onPress: refetch }}
      />
    </Screen>
  );
}
```

**`AuthShell` banner styling (already implemented):**
- Error banner: `bg-terracotta-50 border-danger/30` ✓
- Notice banner: `bg-eucalyptus-50 border-eucalyptus-100` ✓

No changes needed to `AuthShell` styling.

### 13. Design Token Consistency

**`cn()` enforcement:** New components in `components/ui/` must use `cn()` from `lib/utils/cn.ts`
for any conditional class composition. This is a code-review and lint convention, not a runtime
change. The existing components already follow this convention.

**`country.*` restriction:** The `tailwind.config.js` `country.*` tokens are structurally isolated
— they do not appear in any `components/ui/` file currently. The design adds an ESLint rule
(or lint comment) to flag any `country-` class usage outside `components/cultural/`:

```javascript
// eslint.config.js — add pattern rule
// Flag 'country-' Tailwind classes in files outside components/cultural/
```

This is a static analysis change only.

**No hardcoded colors:** The `authMessage` refactor and all component changes in this overhaul
use only `colors.*` from `lib/theme.ts` or NativeWind className strings. No `#hex` literals
are introduced.

### 14. `Assistant.md` and `CLAUDE.md` Improvements

**`Assistant.md` additions:**

1. **"Amplify Gen 2 / Cognito gotchas" section** — documents: Hub event timing race, `authMessage`
   code mapping via `error.name`, dual-source config ambiguity, guest identity pool gap.

2. **"Testing" section** — documents the now-configured Vitest setup (jsdom, `react-native` →
   `react-native-web` alias, the `Module._resolveFilename` patch for externalized CJS deps,
   `react-test-renderer` for component tests), and CI configuration (`vitest run --reporter=dot`).

3. **"Property-based testing" subsection** — documents: what PBT is, when to use it, recommended
   library (`fast-check`), two concrete examples:
   - Testing `authMessage` with generated Cognito error names (message text never affects mapping)
   - Testing a total pure function over a small domain — `getDataAuthMode()` / the `RequireAuth`
     decision table via `fc.record({ initializing, isAuthenticated })`

4. **Updated "Definition of done"** — adds: no raw Cognito error code in UI, keyboard/safe area
   verified on iOS simulator and Android emulator, 44 pt / 48 dp minimum touch targets, skeleton
   for new async data fetches.

5. **Cognito error code reference table** — lists all 7 mapped codes with their human-readable
   strings and the `error.name` matching note.

**`CLAUDE.md` additions:**

1. Reference to the new "Amplify Gen 2 / Cognito gotchas" section in `Assistant.md`.

2. **"Definition of done" section** with per-change-type checklists:
   - Schema changes: `amplify/data/resource.ts` updated, sandbox redeployed, `amplify_outputs.json` refreshed, TypeScript clean.
   - Auth changes: Hub timing race considered, `authMessage` uses `error.name`, `RequireAuth` decision table respected, no Cognito code exposed raw.
   - UI-only changes: NativeWind className only, `cn()` used, tokens only (no hex), safe area verified.
   - Data-fetch changes: skeleton/loading state added, error state with retry added, `collectAll()` used for lists.
   - Documentation-only: `CLAUDE.md` and `Assistant.md` both updated if conventions change.

3. **Amplify Gen 2 deployment workflow clarification** — documents the relationship between
   `npx ampx sandbox`, `amplify_outputs.json`, and `.env`; explains when env vars vs. outputs
   file should be the authoritative source; shows how to verify `configureAmplify()` is using
   the expected source (add `console.debug` in dev mode).


---

## Data Models

No new data models are introduced. The overhaul touches runtime configuration shapes:

### Config Fingerprint Shape

```typescript
interface ConfigFingerprint {
  userPoolId: string;
  userPoolClientId: string;
  identityPoolId: string;
  graphqlEndpoint: string;
  region: string;
}
```

Stored as a JSON string in a module-level variable. Compared on each `configureAmplify()` call
in `__DEV__` mode.

### Cognito Error Map Shape

```typescript
const COGNITO_MESSAGES: Record<string, string>
```

A plain object keyed by `error.name` string. Lookup is O(1). Fallback is `err.message` for
unmapped `Error` instances, and `"Something went wrong."` for non-`Error` throws.

---

## Error Handling

| Layer | Error source | Handling strategy |
|---|---|---|
| `configureAmplify` | Missing required config | Return `false`, `console.error`, no `Amplify.configure()` |
| `configureAmplify` | Missing `identityPoolId` | Configure without `allowGuestAccess`, `console.warn` |
| `AuthProvider` mount | `getAwsAuthUser()` throws | Treat as `null` (signed out), `console.error`, `setInitializing(false)` |
| `SignInScreen` | Cognito auth errors | `authMessage(err)` → banner string via `error.name` map |
| List/detail screens | TanStack Query fetch errors | `mapFetchError(err)` → inline error state with retry button |
| `waitForAuth` | Timeout reached (3 000 ms) | Proceed with `router.replace("/")` regardless — avoids infinite hang |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Before writing properties, redundancies in the prework are resolved:

- Req 1.3 (user set before initializing=false on Hub event) and Req 3.1 (user set before initializing=false on mount) describe the same ordering invariant from two trigger paths — consolidated into **Property 1**.
- Req 1.4, 1.5, 1.6 (RequireAuth three-way decision table) together form a single complete decision-table property — consolidated into **Property 2**.
- Req 4.1–4.6 (env var vs. amplify_outputs.json resolution for each field) are all instances of the same fallback pattern — consolidated into **Property 3**.
- Req 5.2–5.3 (fingerprint no-op and re-configure) are two sides of the same fingerprint comparison property — consolidated into **Property 4**.
- Req 6.1–6.2 (getDataAuthMode decision table) are two branches of a single boolean function — consolidated into **Property 5**.
- Req 9.1–9.4 and the `maxWidth` prop on Screen are instances of the same named-breakpoint mapping — **Property 6**.
- Req 2.1–2.9 (authMessage name-based dispatch) are all instances of the same mapping property — **Property 7** (mapped codes) + **Property 8** (fallback).
- Req 12.3 (network error mapping) is a separate function — **Property 9**.

---

### Property 1: AuthProvider sets user state before clearing the loading gate

*For any* `AwsAuthUser` value returned by `getAwsAuthUser()` — whether called on mount or in
response to a Hub `signedIn` event — the `user` state in `AuthContext` SHALL be non-null and equal
to that value at the moment `initializing` transitions from `true` to `false`.

**Validates: Requirements 1.3, 3.1**

---

### Property 2: RequireAuth renders deterministically from auth state

*For any* combination of `(initializing: boolean, isAuthenticated: boolean)`, the output of
`RequireAuth` is fully determined:
- `initializing = true` → renders loading skeleton, no `<Redirect>` present
- `initializing = false, isAuthenticated = false` → renders `<Redirect href="/sign-in" />`
- `initializing = false, isAuthenticated = true` → renders `children`, no redirect

No other output is possible.

**Validates: Requirements 1.4, 1.5, 1.6**

---

### Property 3: configureAmplify resolves each field from the correct source

*For any* combination of `EXPO_PUBLIC_*` environment variables being empty or non-empty, each
config field (`userPoolId`, `userPoolClientId`, `identityPoolId`, `graphqlEndpoint`, `region`)
resolved by `configureAmplify()` SHALL equal the `EXPO_PUBLIC_*` value when it is non-empty, and
SHALL equal the corresponding `amplify_outputs.json` value when the `EXPO_PUBLIC_*` value is empty.
When both are empty, the field resolves to the empty string.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

---

### Property 4: Config fingerprint controls reconfigure frequency

*For any* two calls to `configureAmplify()` in `__DEV__` mode:
- If the resolved config values are identical between calls, `Amplify.configure()` is called at
  most once.
- If the resolved config values differ between calls, `Amplify.configure()` is called again with
  the new values.

**Validates: Requirements 5.2, 5.3**

---

### Property 5: getDataAuthMode is a pure function of the dataSignedIn flag

*For any* boolean value `s` passed to `setDataSignedIn(s)`, the immediately subsequent call to
`getDataAuthMode()` SHALL return `"userPool"` when `s` is `true` and `"identityPool"` when `s`
is `false`.

**Validates: Requirements 6.1, 6.2**

---

### Property 6: Screen maxWidth prop maps to the correct Tailwind class

*For any* value in the set `{"form", "content", "prose", "wide", "none"}` passed as the `maxWidth`
prop to `Screen`, the rendered outermost content container SHALL include exactly the corresponding
`max-w-*` Tailwind class (`max-w-form`, `max-w-content`, `max-w-prose`, `max-w-wide`, or no max-width
class respectively).

**Validates: Requirements 9.4**

---

### Property 7: authMessage maps Cognito error names to exact strings

*For any* `Error` instance whose `name` property is one of
`{"NotAuthorizedException", "UserNotConfirmedException", "UsernameExistsException",
"CodeMismatchException", "ExpiredCodeException", "LimitExceededException", "InvalidPasswordException"}`,
`authMessage(error)` SHALL return exactly the string defined in `COGNITO_MESSAGES` for that name,
regardless of what `error.message` contains.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9**

---

### Property 8: authMessage fallback for unmapped and non-Error values

*For any* `Error` instance whose `name` is not one of the 7 mapped Cognito codes, `authMessage`
SHALL return `error.message`. *For any* non-`Error` thrown value, `authMessage` SHALL return
`"Something went wrong."`.

**Validates: Requirements 2.8, 2.9**

---

### Property 9: mapFetchError maps all network errors to user-safe strings

*For any* error thrown by a TanStack Query `queryFn`, `mapFetchError(err)` SHALL return a string
that is one of the approved user-facing messages
(`"Couldn't load content — check your connection."` or `"Something went wrong. Tap to retry."`)
and SHALL NOT return a raw JavaScript error message string.

**Validates: Requirements 12.3**


---

## Testing Strategy

### Unit Tests (Example-Based)

These tests verify specific states and render outputs with `vitest` (jsdom). Component tests
render via `react-test-renderer` directly and query the tree by the `testID` prop —
`@testing-library/react-native`'s `getByTestId` does not work under the `react-native-web` alias
(RNW maps `testID` onto DOM `data-testid`, which RNTL's host-node lookup never matches):

| Test | File | Scenario |
|---|---|---|
| `RequireAuth initializing` | `RequireAuth.test.tsx` | Renders skeleton, no Redirect when `initializing=true` |
| `RequireAuth signed out` | `RequireAuth.test.tsx` | Renders Redirect href="/sign-in" when `isAuthenticated=false` |
| `RequireAuth signed in` | `RequireAuth.test.tsx` | Renders children, no redirect when `isAuthenticated=true` |
| `AuthProvider mount: user found` | `AuthProvider.test.tsx` | `setDataSignedIn(true)` called, `initializing` becomes false |
| `AuthProvider mount: no session` | `AuthProvider.test.tsx` | `setDataSignedIn(false)`, `initializing` false |
| `AuthProvider mount: throws` | `AuthProvider.test.tsx` | Treats as null, no crash, `initializing` false |
| `AuthShell KAV iOS` | `AuthShell.test.tsx` | `behavior="padding"` on iOS |
| `AuthShell KAV Android` | `AuthShell.test.tsx` | `behavior="height"` on Android |
| `AuthShell KAV web` | `AuthShell.test.tsx` | No KAV on web |
| `Banner cleared on edit` | `sign-in.test.tsx` | Typing in email clears error banner |
| `waitForAuth resolves fast` | `sign-in.test.tsx` | Router.replace fires when flag becomes true within 3s |
| `waitForAuth timeout` | `sign-in.test.tsx` | Router.replace fires after 3000ms if flag never resolves |
| `configureAmplify: missing identity pool` | `config.test.ts` | `console.warn` called, no `allowGuestAccess` |
| `configureAmplify: all empty` | `config.test.ts` | Returns `false`, `console.error` called |

### Property-Based Tests (`fast-check`)

Install: `npm install -D fast-check`

Each property test is tagged for traceability: **Feature: app-overhaul, Property N: {title}**

```typescript
// Property 7 example — authMessage Cognito name dispatch
import fc from "fast-check";
import { authMessage, COGNITO_MESSAGES } from "@/app/(auth)/sign-in";

it("maps any known Cognito error name to its defined string (Property 7)", () => {
  const knownNames = Object.keys(COGNITO_MESSAGES);
  fc.assert(
    fc.property(
      fc.constantFrom(...knownNames),
      fc.string(), // arbitrary message — must NOT affect output
      (name, msg) => {
        const err = Object.assign(new Error(msg), { name });
        expect(authMessage(err)).toBe(COGNITO_MESSAGES[name]);
      },
    ),
    { numRuns: 200 },
  );
});
```

```typescript
// Property 3 example — dual-source fallback for userPoolId
import fc from "fast-check";
import { resolveConfigField } from "@/lib/aws/config";

it("prefers env var over outputs.json when env var is non-empty (Property 3)", () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1 }), // non-empty env var
      fc.string(),                  // any outputs value
      (envVal, outputVal) => {
        expect(resolveConfigField(envVal, outputVal)).toBe(envVal);
      },
    ),
  );
});

it("falls back to outputs.json when env var is empty (Property 3)", () => {
  fc.assert(
    fc.property(
      fc.string(), // any outputs value
      (outputVal) => {
        expect(resolveConfigField("", outputVal)).toBe(outputVal);
      },
    ),
  );
});
```

```typescript
// Property 5 example — getDataAuthMode
import fc from "fast-check";
import { setDataSignedIn, getDataAuthMode } from "@/lib/aws/config";

it("getDataAuthMode returns correct mode for any boolean (Property 5)", () => {
  fc.assert(
    fc.property(fc.boolean(), (signedIn) => {
      setDataSignedIn(signedIn);
      expect(getDataAuthMode()).toBe(signedIn ? "userPool" : "identityPool");
    }),
  );
});
```

### Test Setup (as built)

Dev dependencies (installed):

```bash
npm install -D vitest @vitest/coverage-v8 react-test-renderer fast-check jsdom
```

The key detail: React Native ships Flow-typed source that jsdom/esbuild can't parse, so
`react-native` is aliased to `react-native-web`. The vite alias only reaches modules inside vite's
transform graph, so `vitest.setup.ts` additionally patches Node's `Module._resolveFilename` to
redirect the native `require("react-native")` used by externalized CJS deps. `esbuild.jsx` is set
to `"automatic"` to match the app (no `import React` in source). See `Assistant.md` → "Testing".

```typescript
// vitest.config.ts (abridged)
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
  },
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "react-native": "react-native-web",
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Component tests use `react-test-renderer` directly (query by `props.testID`), not
`@testing-library/react-native`, for the reason noted above.

---

## Files Changed

| File | Change type | Description |
|---|---|---|
| `app/(auth)/sign-in.tsx` | Modify | Replace `authMessage` with `name`-based dispatch; add `waitForAuth`; clear banner on input edit |
| `app/(auth)/sign-up.tsx`, `reset-password.tsx`, `update-password.tsx` | Modify | Clear banner on input edit; `hitSlop` bumped to 44×44 on link Pressables |
| `lib/aws/config.ts` | Modify | Dual-source fallback, fingerprint-based hot-reload, guest identity pool warning |
| `features/auth/AuthProvider.tsx` | Modify | Add `.catch` error boundary on mount `getAwsAuthUser()` call |
| `features/auth/RequireAuth.tsx` | Modify | Replace text loading state with Skeleton placeholder |
| `components/ui/Screen.tsx` | Modify | Add `"wide"` maxWidth option; add `left`/`right` to SafeAreaView edges |
| `components/ui/Button.tsx` | Modify | Increase `md` height to `h-11` (44pt) with `web:h-10` override |
| `components/ui/Skeleton.tsx` | Modify | Migrate animation to `react-native-reanimated`; swap base/highlight colors per spec |
| `tailwind.config.js` | Modify | Add `wide: "1200px"` maxWidth token |
| `lib/utils/errorMessage.ts` | New | `mapFetchError()` utility function |
| `Assistant.md` | Modify | Add Amplify Gen 2 gotchas, Testing, PBT, updated DoD, Cognito error table |
| `CLAUDE.md` | Modify | Reference gotchas section, per-type DoD checklist, deployment workflow clarification |
| `vitest.config.ts` | New | Vitest config: jsdom, `react-native`→`react-native-web` alias, automatic JSX |
| `vitest.setup.ts` | New | Test setup: `Module._resolveFilename` RN→RNW patch, reanimated mock, act env, noise filter |
| `types/react-test-renderer.d.ts` | New | Minimal ambient types for `react-test-renderer` (ships none) |
| `features/auth/RequireAuth.test.tsx` | New | Decision-table + property tests via `react-test-renderer` |
