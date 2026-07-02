# Assistant guide — CulturePass Australia

A working brief for an AI assistant (or any new contributor) on this codebase.
Read this before making changes. Keep it updated when conventions shift.

> **One-line:** a minimalist, Swiss-design cultural platform for Australia —
> discover, create and connect through cultural experiences across states,
> cities and councils, with First Nations voices and Welcome to Country at the
> centre. **Unity in diversity.**

---

## Stack

- **Expo** SDK ~53 (React Native **0.79.6** + **react-native-web**), **React 19**
- **expo-router** ~5 — file-based routing under `app/`
- **AWS Amplify Gen 2** — Cognito (Auth), AppSync + DynamoDB (Data), S3 (Storage), Lambda (Functions)
- **TanStack Query** 5 — server state / caching (`features/*/api.ts`)
- **Zustand** 5 — local/persisted UI state
- **Zod** 3 — validation schemas in `lib/validation/*`
- **NativeWind** 4 + **Tailwind** 3 — styling via `className`
- **TypeScript** strict, `noUncheckedIndexedAccess: true`

**Supabase has been fully removed.** `lib/supabase/database.types.ts` is kept only for
TypeScript row-shape types (`HubRow`, `EventRow`, etc.) used by the AppSync mappers.

## Commands

```bash
npm run web            # Expo web (http://localhost:8081) — primary dev target
npm run ios | android  # native
npm run typecheck      # tsc --noEmit   (must stay clean)
npm run lint           # eslint .       (flat config: eslint.config.js)
npm run migrate:dynamo:dry   # preview data migration row counts (safe)
npm run migrate:dynamo        # run Supabase → DynamoDB data migration
```

Always run `npm run typecheck` **and** `npm run lint` before considering a change
done — both are currently green and must stay that way.

---

## Project structure

```
app/                       expo-router routes (file-based)
  _layout.tsx              providers, fonts, root stack
  index.tsx                home — search + explore by state + featured hubs
  explore/index.tsx        discovery with filters
  state/[code].tsx         hubs by state/territory
  hub/[slug].tsx           hub profile
  hub/edit/[slug].tsx      hub edit wizard
  my-hubs/index.tsx        manage hubs you own
  my-council/index.tsx     local discovery board by council
  event/[id].tsx           event detail
  create/                  hub.tsx · event.tsx · professional.tsx · index.tsx
  profile/                 [id].tsx (public) · edit.tsx
  settings/                index · account · privacy · notifications · about
  admin/index.tsx          admin dashboard (is_admin gated)
  (auth)/                  sign-in · sign-up · reset-password · update-password
components/
  ui/                      design-system primitives (Text, Button, Card, Badge,
                           Avatar, Input, Field, ImagePicker, LocationPicker, …)
  cultural/                AcknowledgementBar, WelcomeToCountry, IndigenousLedBadge
features/
  auth/                    AuthProvider (Cognito), api.ts (getCurrentProfileId, hooks)
  hubs/ events/ profiles/  queries/mutations via AppSync + cards/forms
  reference/               states, councils (AppSync), useSavedLocation (Zustand)
  notifications/           AppSync + realtime subscriptions
  chat/                    conversations + messages (AppSync + subscriptions)
  tickets/                 Stripe checkout via AppSync mutation → Lambda
  weather/                 BOM weather widget
lib/
  aws/                     config.ts (configureAmplify), data.ts (getAwsDataClient),
                           auth.ts (getAwsCurrentUserId, getAwsAuthUser), list.ts (collectAll)
  supabase/                database.types.ts (TypeScript types only — no runtime use)
  navigation.ts            shared nav map for TopBar, BottomTabBar, Footer
  validation/              Zod schemas (auth, hub, event, profile)
  constants.ts             enums/labels (mirrors AppSync schema enums)
  theme.ts, query.ts, storage.ts, utils/cn.ts
amplify/
  auth/resource.ts         Cognito user pool + admin group
  data/resource.ts         20 domain models (AppSync/DynamoDB schema)
  storage/resource.ts      S3 media bucket
  functions/               tickets-checkout · stripe-webhook · get-taken-seats ·
                           post-confirmation · rewards-join · rewards-tier-recompute ·
                           dev-seed (Lambda)
  backend.ts               assembles the backend + wires Function URLs
scripts/
  aws-env-from-outputs.mjs   populate .env from amplify_outputs.json
  migrate-supabase-to-dynamo.mjs  one-shot data migration (19 tables)
```

---

## Data model

Defined in `amplify/data/resource.ts`. Core models:

`Profile` (1:1 Cognito user), `Hub` (owned by Profile), `HubMember`, `Event` (belongs to Hub),
`EventRsvp`, `EventCohost`, `EventTicketType`, `TicketOrder`, `Notification`, `Conversation`,
`Message`, `EventLike`, `EventSave`, `HubLike`, `HubFollow`, `ProfileFollow`,
`ProfileSubscription`, `Membership` (CulturePass Plus), `AustralianState`, `AustralianCouncil`.

Authorization guardrails worth knowing before you touch a model (full detail in
the "AWS (AppSync/DynamoDB) authorization model" section of `docs/SCHEMA.md`):

- `TicketOrder` and `Membership` are **owner read-only** — they are written
  exclusively by Lambdas over IAM (`tickets-checkout`/`stripe-webhook`,
  `rewardsJoin`). Lambdas must set `owner` to the buyer's/member's Cognito sub
  on create or the user can't read their own row.
- `Conversation`/`Message` use `allow.ownersDefinedIn("participants")` (Cognito
  subs); `features/chat/api.ts` populates `participants` on every create.
- `Profile.isAdmin` has field-level auth (admin-group write only); the real
  admin gate is the Cognito `admin` group, the flag only drives UI.

Reference: `docs/SCHEMA.md` is the human-readable model.

---

## Design system

Swiss minimalism + a warm Australian palette (cream `paper`, `sand`, `linen`;
warm-black `ink`; accents `ochre`, `eucalyptus`, `terracotta`). Tokens live in
`tailwind.config.js` and `lib/theme.ts`. Rules of thumb:

- All text through `components/ui/Text` (`variant` + `tone`). Don't hand-roll sizes/colors.
- Restraint over decoration — accents are sparing; default is ink on cream.
- `country.*` colors and `cultural/` components are **reserved** for Welcome to Country /
  Acknowledgement / Indigenous-led surfaces only. Never decorative.
- `Screen` applies `px-gutter` (20px) to its children. Full-bleed elements: offset with
  `marginHorizontal: -20`; never add `px-gutter` again inside.

---

## Conventions & gotchas

1. **`lib/supabase/database.types.ts` is for TypeScript types only.** Supabase is gone at
   runtime. The snake_case row types are still used as return types of the AppSync mapper
   functions. Do not delete this file; do not add any Supabase runtime imports.

2. **AppSync lists are paginated.** Always use `collectAll()` from `lib/aws/list.ts`.
   DynamoDB returns at most ~100 items per page. A single `.list()` call will silently
   miss rows in large tables.

3. **camelCase ↔ snake_case.** AppSync model fields are camelCase (`hubId`, `startTime`).
   The rest of the app (UI, forms, query keys) uses the Supabase-era snake_case shapes.
   Every `features/*/api.ts` has mapper functions that translate between them. Never
   spread raw AppSync objects into UI components.

4. **JSON fields** (`images`, `metadata`, `publicLinks`, `lineItems`, etc.) are `AWSJSON`
   in AppSync. Write with `JSON.stringify(value)`; read with `JSON.parse()` in mappers.

5. **Empty form strings vs typed columns.** Fields init to `""`. Use the empty-as-undefined
   transforms in `lib/validation/*` (`optionalIsoDateTime`, `requiredIsoDateTime`,
   `optionalText` + `.pipe`).

6. **Platform-specific files.** `DatePicker.tsx` (native) vs `DatePicker.web.tsx` (HTML
   input). Metro resolves `.web.tsx` on web automatically.

7. **Hooks.** Strict rules-of-hooks — never call a hook after an early `return`.

8. **Lambda functions** (`amplify/functions/**`) are Node.js and excluded from the app
   tsconfig and ESLint.

9. **`metro.config.js` aliases `ws`** to its browser shim so Amplify Realtime bundles in
   React Native — don't remove it.

10. **Cultural priority.** Acknowledgement of Country is app-wide; Welcome to Country stays
    prominent on hub pages. `country.*` colors and `cultural/` components are reserved
    strictly for sanctioned First Nations surfaces, never decoration. Traditional Custodian
    attributions are never auto-generated — populated only from verified, properly-sourced data.

11. **Navigation map.** TopBar, BottomTabBar and Footer all read from `lib/navigation.ts`.
    Add routes there when a new primary surface should appear in the shell.

12. **Hub branding images.** Logo and cover both live in the `images` JSON field. Use
    `lib/hubImages.ts`: `type: "logo"` for the square icon, `type: "cover"` for the wide
    top image. Don't replace the whole array manually.

13. **Password reset on Cognito is code-based** (not link-based). The flow is:
    reset-password screen → sends 6-digit code via email → update-password screen collects
    email + code + new password → `confirmResetPassword()` from `aws-amplify/auth`.

---

## Amplify Gen 2 / Cognito gotchas

These are the auth/config traps that are easy to trip on and expensive to debug.

1. **`signedIn` Hub event timing race.** After `signIn.mutateAsync()` resolves, the
   Amplify Auth **Hub `signedIn` event** has not necessarily fired yet, so
   `AuthProvider`'s `isAuthenticated` can still be `false` for a tick. Navigating with
   `router.replace("/")` immediately can bounce the user straight back to `/sign-in` via
   `RequireAuth`. The fix in `app/(auth)/sign-in.tsx` is the `waitForAuth()` polling helper:
   after the mutation resolves, `await waitForAuth(() => isAuthRef.current)` (3 s cap) before
   navigating. `isAuthRef` mirrors `isAuthenticated` through a `useEffect` so the poll reads a
   live value, not a stale closure. On mount, `AuthProvider` calls `setUser` →
   `setDataSignedIn` → `setInitializing(false)` in that order, and its `getAwsAuthUser()`
   is `.catch()`-guarded so a thrown session check is treated as signed-out, never a crash.

2. **`authMessage` maps Cognito codes via `error.name`, never `error.message`.** Cognito
   throws `Error` subclasses whose **`name`** is the stable, locale-independent code
   (`NotAuthorizedException`, …). `error.message` is human/English prose that changes between
   SDK versions — matching on it is fragile and leaks raw SDK text into the UI. `authMessage`
   (exported from `app/(auth)/sign-in.tsx`) looks up `COGNITO_MESSAGES[err.name]`, falls back
   to `err.message` for unmapped `Error`s, and returns `"Something went wrong."` for non-`Error`
   throws. See the Cognito error code table below. **No Cognito code should ever appear raw in
   the UI.**

3. **Dual-source config ambiguity (`EXPO_PUBLIC_*` vs `amplify_outputs.json`).**
   `lib/aws/config.ts` resolves each field via `resolve(envValue, section, field)`:
   the `EXPO_PUBLIC_*` env var wins when non-empty, otherwise it falls back to the matching
   field in `amplify_outputs.json`. This means a stale/empty `.env` silently changes which
   backend the app talks to. When something points at the wrong pool, check **both** sources —
   an empty env var does not error, it just defers to the outputs file. `configureAmplify()`
   returns `false` and `console.error`s when `userPoolId`/`userPoolClientId` are empty after
   *both* sources are consulted. In `__DEV__` it re-runs `Amplify.configure()` whenever the
   resolved-field fingerprint changes (hot-reload safe); in production the `configured` guard
   makes it a one-shot.

4. **Guest identity pool fallback gap.** Public/signed-out screens read AppSync through the
   Identity Pool **unauthenticated (IAM) role** so `allow.guest().to(["read"])` applies.
   `getDataAuthMode()` returns `"identityPool"` when signed-out and `"userPool"` when signed-in;
   `AuthProvider` keeps the `dataSignedIn` flag current via `setDataSignedIn`. If
   `identityPoolId` is missing from *both* config sources, `configureAmplify()` logs a warning
   and omits `allowGuestAccess` — guest reads then fail with **"No federated jwt"** and public
   pages render zeros. If public content is empty but authenticated content works, suspect a
   missing `identityPoolId`.

### Cognito error codes handled by `authMessage`

Matching is on **`error.name`** (the code), **not** `error.message`. All seven live in
`COGNITO_MESSAGES` in `app/(auth)/sign-in.tsx`:

| `error.name` (code)          | User-facing message                                            |
| ---------------------------- | -------------------------------------------------------------- |
| `NotAuthorizedException`     | That email or password isn't right.                            |
| `UserNotConfirmedException`  | Please confirm your email first — check your inbox.            |
| `UsernameExistsException`    | An account with that email already exists.                     |
| `CodeMismatchException`      | That code isn't right — please check and try again.            |
| `ExpiredCodeException`       | That code has expired — please request a new one.              |
| `LimitExceededException`     | Too many attempts — please wait a few minutes and try again.   |
| `InvalidPasswordException`   | Password does not meet the requirements.                       |

Unmapped `Error` → `error.message`. Non-`Error` throw → `"Something went wrong."`

---

## Testing

There was historically **no test runner** in this repo (typecheck + lint were the only
gates). Unit/property tests now run on **Vitest** (jsdom). The wiring lives in three files:

- `vitest.config.ts` — `jsdom` environment, `globals: true`, `@` path alias, and the key
  piece: **`resolve.alias` maps `react-native` → `react-native-web`** so RN components import
  under jsdom (React Native ships Flow-typed source that esbuild/jsdom can't parse). `esbuild.jsx`
  is set to `"automatic"` to match the app's runtime (no `import React` in source).
- `vitest.setup.ts` — patches Node's `Module._resolveFilename` to redirect `react-native` →
  `react-native-web` for **externalized CJS deps** (e.g. `@testing-library/react-native`), since
  the vite alias only reaches modules inside vite's transform graph. Also mocks
  `react-native-reanimated`, sets `IS_REACT_ACT_ENVIRONMENT`, and silences known jsdom-only noise.
- `types/react-test-renderer.d.ts` — minimal ambient types (the package ships none).

**Component tests** render with `react-test-renderer` directly and query the tree by the
`testID` prop (`root.findAll(n => n.props.testID === id)`). Note: `@testing-library/react-native`'s
`getByTestId` does **not** work under the RNW alias — RNW maps `testID` onto DOM `data-testid`,
so RNTL's host-node `testID` lookup finds nothing. See `features/auth/RequireAuth.test.tsx`.

```bash
npm run test            # vitest run
npm run test:coverage   # vitest run --coverage
npx vitest run --reporter=dot   # terse output for CI
```

CI: run `npx vitest run --reporter=dot` alongside `npm run typecheck` and `npm run lint`.
`passWithNoTests: true` means an empty suite is green, not an error.

### Property-based testing

**PBT** asserts a *property* that must hold across a large space of generated inputs, instead
of hand-picking examples. The runner (`fast-check`) generates hundreds of cases, and on failure
*shrinks* to the smallest reproducing input. Apply PBT to **pure functions, validation schemas,
data mappers, and auth-message mapping** — anywhere correctness is a rule over an input space
rather than one example. Keep effectful/UI-heavy code in example-based tests.

Recommended library: **`fast-check`** (already a dev dependency). Two patterns that fit this codebase:

1. **Exhaustive/parametric dispatch — `authMessage`.** Feed
   `fc.constantFrom(...Object.keys(COGNITO_MESSAGES))` as the `error.name` plus an arbitrary
   `fc.string()` as `error.message`, and assert the output equals the mapped string regardless of
   message — proving the message text never influences the mapping. A second property covers the
   fallbacks: arbitrary unmapped `Error` → `error.message`; arbitrary non-`Error` → `"Something
   went wrong."`

2. **Total pure function over a small domain — `getDataAuthMode` / decision tables.** Use
   `fc.boolean()` for `dataSignedIn` and assert `getDataAuthMode()` returns `"userPool"` when
   `true`, `"identityPool"` when `false`. The same shape covers `RequireAuth`'s
   `fc.record({ initializing, isAuthenticated })` decision table and `Screen`'s `maxWidth` →
   Tailwind-class mapping.

---

## AWS deployment workflow

```bash
# 1. Deploy backend sandbox (dev/test — auto-tears-down when stopped)
AWS_PROFILE=culturepass-admin npx ampx sandbox

# 2. Populate .env from deployed outputs
node scripts/aws-env-from-outputs.mjs

# 3. Deploy to permanent production branch
AWS_PROFILE=culturepass-admin npx ampx pipeline-deploy \
  --branch main --app-id YOUR_AMPLIFY_APP_ID

# 4. Set Stripe secrets on production
npx ampx secret set STRIPE_SECRET_KEY --branch main --app-id YOUR_APP_ID --profile culturepass-admin
npx ampx secret set STRIPE_WEBHOOK_SECRET --branch main --app-id YOUR_APP_ID --profile culturepass-admin

# 5. Migrate data (one-time)
npm run migrate:dynamo:dry   # preview
npm run migrate:dynamo        # run

# 6. Build mobile apps
eas build --platform all --profile production

# 7. Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

**EAS environment variables** (set once, apply to all builds):
```bash
eas env:list --environment production          # verify
eas env:create --environment production ...    # add missing vars
```
Required vars: `EXPO_PUBLIC_BACKEND=aws`, `EXPO_PUBLIC_AWS_REGION`,
`EXPO_PUBLIC_COGNITO_USER_POOL_ID`, `EXPO_PUBLIC_COGNITO_APP_CLIENT_ID`,
`EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID`, `EXPO_PUBLIC_APPSYNC_ENDPOINT`, `EXPO_PUBLIC_S3_BUCKET`.

---

## Definition of done

- `npm run typecheck` clean, `npm run lint` clean, `npx vitest run` green.
- Schema changes reflected in `amplify/data/resource.ts` + sandbox redeploy + `amplify_outputs.json` refreshed.
- UI uses existing primitives + tokens; cultural surfaces respected.
- Outward/irreversible actions (pipeline-deploy, EAS build/submit, data migration) confirmed first.
- **No Cognito error code appears raw in the UI** — everything user-facing goes through `authMessage`.
- **Keyboard-avoiding and safe-area handling verified on iOS simulator and Android emulator** for any new screen.
- **All new interactive elements meet the 44 pt / 48 dp minimum touch target** (size tokens or `hitSlop`).
- **Skeleton or loading state added for any new async data fetch** — no bare spinners or "Loading…" text.
