# Implementation Plan: app-overhaul

## Overview

Four targeted improvement areas implemented incrementally: auth correctness (Hub timing, error mapping, session persistence), AWS config hardening (dual-source fallback, hot-reload fingerprinting, guest identity pool), cross-platform UI/UX polish (keyboard avoidance, safe area, web breakpoints, touch targets, skeletons, error feedback, design tokens), and AI guidance document updates. Each area builds on the previous so that the auth layer is stable before UI components reference it.

## Tasks

- [x] 1. Set up test infrastructure
  - Install `vitest`, `@vitest/coverage-v8`, `@testing-library/react-native`, `@testing-library/jest-native`, `react-test-renderer`, and `fast-check` as dev dependencies
  - Create `vitest.config.ts` with `jsdom` environment, globals, and `@` path alias pointing to workspace root
  - Create `vitest.setup.ts` with any required global mocks (e.g. `react-native-reanimated` mock)
  - Verify `npx vitest run` exits cleanly with no tests found (not an error)
  - _Requirements: 14.3_

- [x] 2. Implement Cognito error code mapping (`authMessage`)
  - [x] 2.1 Refactor `authMessage` in `app/(auth)/sign-in.tsx`
    - Extract `COGNITO_MESSAGES` record keyed by `error.name` with all 7 mapped codes and their exact human-readable strings
    - Replace any substring-matching logic with `COGNITO_MESSAGES[err.name]` lookup
    - Ensure unmapped `Error` instances fall through to `err.message`; non-`Error` throws return `"Something went wrong."`
    - Export `COGNITO_MESSAGES` so property tests can reference it
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 2.2 Write property test for `authMessage` Cognito name dispatch (Property 7)
    - **Property 7: authMessage maps Cognito error names to exact strings**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9**
    - Use `fc.constantFrom(...Object.keys(COGNITO_MESSAGES))` and `fc.string()` for arbitrary message to confirm `error.message` does not affect output
    - Run 200 iterations

  - [ ]* 2.3 Write property test for `authMessage` fallback behaviour (Property 8)
    - **Property 8: authMessage fallback for unmapped and non-Error values**
    - **Validates: Requirements 2.8, 2.9**
    - Generate arbitrary `Error` instances with names not in `COGNITO_MESSAGES`; assert return equals `error.message`
    - Generate arbitrary non-`Error` values; assert return is `"Something went wrong."`

- [x] 3. Harden AWS Amplify config (`lib/aws/config.ts`)
  - [x] 3.1 Implement dual-source `resolve()` helper and field resolution
    - Add `resolve(envValue, section, field)` helper that returns the env var value when non-empty, otherwise reads from `amplify_outputs.json` via the given section/field path
    - Thread all five config fields (`userPoolId`, `userPoolClientId`, `identityPoolId`, `graphqlEndpoint`, `region`) through the helper
    - Export `resolveConfigField` (or the helper) for unit testing
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 3.2 Write property test for dual-source resolution (Property 3)
    - **Property 3: configureAmplify resolves each field from the correct source**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
    - Use `fc.string({ minLength: 1 })` for non-empty env var + `fc.string()` for outputs value → assert env var wins
    - Use `fc.string()` for outputs value with `""` env var → assert outputs value is returned

  - [x] 3.3 Implement config fingerprint and hot-reload reconfiguration
    - Add `buildFingerprint(cfg)` that JSON-serialises the five resolved fields
    - Store `configFingerprint` module-level variable alongside `configured` flag
    - In `__DEV__` mode: skip `Amplify.configure()` only when both `configured` is `true` and the fingerprint is unchanged; reconfigure when fingerprint differs
    - In production: existing `if (configured) return true` guard is sufficient
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 3.4 Write property test for fingerprint reconfigure logic (Property 4)
    - **Property 4: Config fingerprint controls reconfigure frequency**
    - **Validates: Requirements 5.2, 5.3**
    - Mock `Amplify.configure` and assert it is called exactly once for identical repeated calls, and called again when any field value changes

  - [x] 3.5 Implement guest identity pool logic and missing-config error handling
    - Conditionally include `identityPoolId` and `allowGuestAccess: true` in `Amplify.configure()` when `identityPoolId` is truthy
    - Log `console.warn` when `identityPoolId` is unavailable from both sources
    - Return `false` and log `console.error` when `userPoolId` or `userPoolClientId` are empty after resolution
    - _Requirements: 4.7, 6.3, 6.4, 6.5_

  - [ ]* 3.6 Write unit tests for `configureAmplify` error paths
    - Test: missing `identityPoolId` → `console.warn` called, `allowGuestAccess` absent
    - Test: all required fields empty → returns `false`, `console.error` called
    - _Requirements: 4.7, 6.5_

- [x] 4. Implement `getDataAuthMode` pure function (Property 5)
  - Ensure `getDataAuthMode()` returns `"userPool"` when `dataSignedIn` is `true` and `"identityPool"` when `false`
  - Export `setDataSignedIn` and `getDataAuthMode` so tests can call them directly
  - _Requirements: 6.1, 6.2_

  - [ ]* 4.1 Write property test for `getDataAuthMode` (Property 5)
    - **Property 5: getDataAuthMode is a pure function of the dataSignedIn flag**
    - **Validates: Requirements 6.1, 6.2**
    - Use `fc.boolean()` to generate arbitrary signed-in state; assert return matches expected auth mode

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Fix auth Hub event timing (`AuthProvider` and `SignInScreen`)
  - [x] 6.1 Add error boundary to `AuthProvider` mount session check
    - Wrap `getAwsAuthUser()` call in `.catch(e => ...)` that logs the error, calls `setDataSignedIn(false)`, and sets `initializing` to `false`
    - Ensure `setUser`, `setDataSignedIn`, and `setInitializing(false)` are called in that explicit order in the `.then()` callback
    - _Requirements: 1.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write unit tests for `AuthProvider` mount behaviour
    - Test: `getAwsAuthUser()` returns user → `setDataSignedIn(true)` called, `initializing` becomes `false`
    - Test: `getAwsAuthUser()` returns null → `setDataSignedIn(false)`, `initializing` false
    - Test: `getAwsAuthUser()` throws → treated as null, no crash, `initializing` false
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 6.3 Add `waitForAuth` helper and update `SignInScreen` submit handler
    - Implement `waitForAuth(isAuthenticated: () => boolean, timeoutMs = 3000)` polling helper in `app/(auth)/sign-in.tsx`
    - Add `isAuthRef` ref and sync it with `isAuthenticated` via `useEffect`
    - After `signIn.mutateAsync()` resolves, call `await waitForAuth(() => isAuthRef.current)` before `router.replace("/")`
    - _Requirements: 1.1, 1.2_

  - [ ]* 6.4 Write unit tests for `waitForAuth`
    - Test: resolves immediately when `isAuthenticated` starts `true`
    - Test: resolves after flag becomes `true` within the timeout window
    - Test: resolves after 3 000 ms even if flag never becomes `true`
    - _Requirements: 1.2_

- [x] 7. Replace `RequireAuth` loading state with Skeleton placeholder
  - Replace any text-based "Loading…" string with a `FullScreenSkeleton` layout using `Screen` + multiple `Skeleton` components matching the expected content shape
  - Confirm `RequireAuth` still renders `<Redirect href="/sign-in" />` when `initializing=false` and `isAuthenticated=false`, and renders `children` when `isAuthenticated=true`
  - _Requirements: 1.4, 1.5, 1.6, 11.3_

  - [x]* 7.1 Write unit tests for `RequireAuth` decision table (Property 2)
    - **Property 2: RequireAuth renders deterministically from auth state**
    - **Validates: Requirements 1.4, 1.5, 1.6**
    - Test all three states: `initializing=true` → skeleton no redirect; `false/false` → Redirect to `/sign-in`; `false/true` → children rendered
    - Use `fc.record({ initializing: fc.boolean(), isAuthenticated: fc.boolean() })` to exhaustively verify the 4-combination space

- [x] 8. Upgrade `Skeleton` component animation to `react-native-reanimated`
  - Replace any legacy `Animated` API usage with `useSharedValue`, `useAnimatedStyle`, `withRepeat`, `withSequence`, `withTiming`
  - Set shimmer cycle to 1 200 ms (600 ms fade-in + 600 ms fade-out, infinite repeat)
  - Update base color to `bg-linen` and highlight pulse overlay to `colors.sand` from `lib/theme.ts`
  - _Requirements: 11.1, 11.5_

- [x] 9. Polish `AuthShell` keyboard avoidance and UI
  - [x] 9.1 Update `Screen` `KeyboardAvoidingView` behavior
    - Set `behavior` to `"padding"` on iOS, `"height"` on Android, `undefined` on web
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 9.2 Write unit tests for `AuthShell` KAV behavior
    - Test: iOS → `behavior="padding"`; Android → `behavior="height"`; web → no KAV wrapper
    - _Requirements: 7.1, 7.2, 7.4_

  - [x] 9.3 Update `Screen` SafeAreaView edges to include left and right
    - Extend `resolvedEdges` to include `"left"` and `"right"` on mobile; `["bottom", "left", "right"]` on web
    - _Requirements: 8.1, 8.4_

- [x] 10. Apply web breakpoints and `Screen` maxWidth improvements
  - [x] 10.1 Add `"wide"` max-width token to `tailwind.config.js`
    - Add `wide: "1200px"` to the `maxWidth` extension block
    - _Requirements: 9.4_

  - [x] 10.2 Update `Screen` to support `"wide"` maxWidth prop value
    - Add `"wide"` to the `MaxWidth` type union and the `MAX` record mapping it to `"max-w-wide"`
    - _Requirements: 9.4_

  - [ ]* 10.3 Write property test for Screen maxWidth mapping (Property 6)
    - **Property 6: Screen maxWidth prop maps to the correct Tailwind class**
    - **Validates: Requirements 9.4**
    - Use `fc.constantFrom("form", "content", "prose", "wide", "none")` and assert the rendered container includes the exact corresponding `max-w-*` class (or no class for `"none"`)

- [x] 11. Increase `Button` minimum touch target size
  - Update `SIZE.md` from `"h-10 ..."` to `"h-11 web:h-10 ..."` to achieve 44 pt on native and 40 px on web
  - _Requirements: 10.1, 10.4_

- [x] 12. Fix Pressable link hitSlop in auth screens
  - Replace flat `hitSlop={8}` values on link `Pressable` elements in auth screens with `hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}` to meet the 44×44 pt minimum
  - _Requirements: 10.2_

- [x] 13. Add `mapFetchError` utility and inline error states
  - [x] 13.1 Create `lib/utils/errorMessage.ts` with `mapFetchError` function
    - Implement `mapFetchError(err: unknown): string` that maps network-related errors to `"Couldn't load content — check your connection."` and all others to `"Something went wrong. Tap to retry."`
    - Ensure the function never returns a raw JavaScript `Error.message` string
    - _Requirements: 12.2, 12.3_

  - [ ]* 13.2 Write property test for `mapFetchError` (Property 9)
    - **Property 9: mapFetchError maps all network errors to user-safe strings**
    - **Validates: Requirements 12.3**
    - Generate arbitrary `Error` and non-`Error` values; assert all returns are one of the two approved strings and never a raw error message

  - [x] 13.3 Add error banner clearing on input edit in auth screens
    - Wrap `onChangeText` handlers in `sign-in.tsx` (and any other auth screens) to call `setBanner(null)` / `clearBanner()` before updating field state
    - _Requirements: 12.1, 12.4_

  - [ ]* 13.4 Write unit test for error banner clearing
    - Test: typing in email input after a mutation error clears the error banner
    - _Requirements: 12.4_

- [x] 14. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Update `Assistant.md` and `CLAUDE.md`
  - [x] 15.1 Update `Assistant.md` with Amplify Gen 2 and testing content
    - Add "Amplify Gen 2 / Cognito gotchas" section covering: Hub event timing race, `authMessage` code mapping via `error.name`, dual-source config ambiguity, guest identity pool gap
    - Add "Testing" section documenting the configured Vitest setup (jsdom, `react-native` → `react-native-web` alias, `Module._resolveFilename` patch, `react-test-renderer` for component tests) and CI configuration (`vitest run --reporter=dot`)
    - Add "Property-based testing" subsection with PBT definition, when to apply it, `fast-check` recommendation, and two concrete codebase examples
    - Update "Definition of done" to include: no raw Cognito code in UI, keyboard/safe area verified on simulators, 44 pt / 48 dp touch targets, skeleton for new async fetches
    - Add Cognito error code reference table listing all 7 mapped codes, their human-readable strings, and the `error.name` matching note
    - _Requirements: 14.1, 14.3, 14.4, 14.6, 14.8_

  - [x] 15.2 Update `CLAUDE.md` with gotchas reference, DoD, and deployment workflow
    - Reference the "Amplify Gen 2 / Cognito gotchas" section of `Assistant.md` in the high-value gotchas list
    - Add per-change-type "Definition of done" checklists covering schema, auth, UI-only, data-fetch, and documentation-only changes
    - Add Amplify Gen 2 deployment workflow section documenting the `npx ampx sandbox` → `amplify_outputs.json` → `.env` relationship, when to use `EXPO_PUBLIC_*` vars vs the outputs file, and how to verify `configureAmplify()` is using the correct source
    - _Requirements: 14.2, 14.5, 14.7_

- [x] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at natural seams (config layer stable before auth layer, auth layer stable before UI layer)
- Property tests validate universal correctness properties across generated input spaces
- Unit tests validate specific scenarios and edge cases
- The design uses TypeScript strict throughout — all new files must satisfy `tsc --noEmit`
- `fast-check` must be installed (step 1) before property test tasks can run

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.3", "3.5", "4"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.4", "3.6", "4.1", "6.1", "8", "10.1", "13.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "7", "9.1", "10.2", "11", "12", "13.3"] },
    { "id": 4, "tasks": ["6.4", "7.1", "9.2", "9.3", "10.3", "13.2", "13.4"] },
    { "id": 5, "tasks": ["15.1", "15.2"] }
  ]
}
```
