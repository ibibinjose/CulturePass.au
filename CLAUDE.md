# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CulturePass Australia is a Swiss-design cultural platform (discover/create/connect across states,
councils and First Nations communities) built as one Expo codebase targeting **web, iOS and Android**.

> **`Assistant.md` is the detailed working brief** — read it for the full conventions list and the
> hard-won gotchas. This file is the orientation layer; `Assistant.md` and `docs/SCHEMA.md` are the
> depth. Keep all in sync when conventions change.

## Commands

```bash
npm run web              # Expo web (http://localhost:8081) — primary dev target
npm run ios | android    # native
npm run typecheck        # tsc --noEmit  — must stay clean
npm run lint             # eslint . (flat config: eslint.config.js)
npm run test             # vitest run (jsdom) — unit + property tests
npm run test:coverage    # vitest run --coverage
npm run migrate:dynamo:dry  # preview Supabase → DynamoDB migration row counts
npm run migrate:dynamo      # run the full data migration
```

The verification gates are `npm run typecheck`, `npm run lint`, and `npm run test` (Vitest);
all three must stay green before a change is considered done. Tests run under jsdom with
`react-native` aliased to `react-native-web` — see the "Testing" section of `Assistant.md` for
the setup and its gotchas (`vitest.config.ts`, `vitest.setup.ts`). `passWithNoTests` is on, so an
empty suite is green.

## Architecture

**Stack:** Expo SDK ~53 (React Native 0.79 + react-native-web, React 19), expo-router ~5 (file-based,
`typedRoutes` on), **AWS Amplify Gen 2** (Cognito Auth, AppSync/DynamoDB Data, S3 Storage, Lambda),
TanStack Query 5 (server state), Zustand 5 (local/persisted UI state), Zod 3 (validation),
NativeWind 4 + Tailwind 3 (styling via `className`).
TypeScript strict, `noUncheckedIndexedAccess: true`, path alias `@/*` → repo root.

**Backend is exclusively AWS — no Supabase in production:**
- Auth → Cognito (`aws-amplify/auth`)
- Data → AppSync + DynamoDB (`lib/aws/data.ts` → `generateClient<Schema>()`)
- Storage → S3 (`aws-amplify/storage` `uploadData` / `getUrl`)
- Functions → Lambda (Stripe checkout, webhook, taken-seats)
- Schema defined in `amplify/data/resource.ts`
- Deployed with `npx ampx sandbox` (dev) or `npx ampx pipeline-deploy` (prod)

**Layering — three layers, one direction of dependency:**

- `app/` — expo-router routes only (screens, layouts). `app/_layout.tsx` mounts the provider stack:
  `GestureHandlerRootView → SafeAreaProvider → QueryClientProvider → AuthProvider`, a global `TopBar`,
  and the root `Stack`. Routes compose features + UI; they don't talk to AppSync directly.
- `features/<domain>/` — the data layer, one folder per domain (`auth`, `hubs`, `events`, `profiles`,
  `reference`, `tickets`, `weather`, `chat`, `notifications`). `api.ts` holds the TanStack Query hooks
  and AppSync calls via `getAwsDataClient()`. This is where data access belongs.
- `lib/` — cross-cutting infra: `lib/aws/` (config, data client, auth helpers, list pagination),
  `query.ts` (client + query keys), `constants.ts` (enums/labels — single source of truth mirroring
  the AppSync schema enums), `theme.ts` (JS tokens mirroring `tailwind.config.js`), `validation/*`
  (Zod schemas), `storage.ts`, `share.ts`/`vcard.ts`/`social.ts`.
- `components/ui/` — design-system primitives; `components/cultural/` — `AcknowledgementBar`,
  `WelcomeToCountry`, `IndigenousLedBadge`.

**Backend (`amplify/`):** `auth/resource.ts`, `data/resource.ts` (18 domain models), `storage/resource.ts`,
`functions/` (tickets-checkout, stripe-webhook, get-taken-seats). `amplify_outputs.json` is generated
by `npx ampx sandbox` and provides all runtime config values. `lib/supabase/database.types.ts` is
kept for TypeScript row-shape types but Supabase itself is not used.

**Payments:** Stripe Checkout is fully server-side (secret key never reaches the app). The
`ticketsCheckout` AppSync mutation calls a Lambda that creates a `pending` TicketOrder + Checkout
Session; the `stripeWebhook` Lambda Function URL is the **source of truth** that flips orders to
`paid`. The browser success redirect is never trusted. See `docs/STRIPE_TICKETING.md`.

## High-value gotchas

1. **`lib/supabase/database.types.ts` is kept for TypeScript types only** — Supabase itself is gone.
   The snake_case row types (`HubRow`, `EventRow`, etc.) are used as the public return types of
   the AppSync mapper functions. Do not delete this file.

2. **AppSync lists are paginated** — always use `collectAll()` from `lib/aws/list.ts` rather than
   calling `.list()` once. DynamoDB returns at most 100 items per page.

3. **AppSync uses camelCase; the rest of the app uses snake_case.** The mapper functions in each
   `features/*/api.ts` translate between them. Always go through the mapper; never spread AppSync
   model objects directly into UI components.

4. **Empty form strings vs typed columns.** Fields init to `""`. Use the empty-as-undefined
   transforms in `lib/validation/*` (`optionalIsoDateTime`, `requiredIsoDateTime`, `optionalText`).

5. **JSON fields** (`images`, `metadata`, `publicLinks`, etc.) are stored as `AWSJSON` in AppSync.
   Pass them as `JSON.stringify(value)` on write; parse with `JSON.parse()` on read in mappers.

6. **Platform-specific files.** `DatePicker.tsx` (native modal) vs `DatePicker.web.tsx` (HTML input).
   Metro resolves `.web.tsx` on web automatically.

7. **Edge functions / Lambda** (`amplify/functions/**`) are Node.js and excluded from the app tsconfig.

8. **`metro.config.js` aliases `ws`** to its browser shim so Amplify Realtime bundles in RN — don't
   remove it.

9. **Cultural priority.** Acknowledgement of Country is app-wide; Welcome to Country stays prominent
   on hub pages. `country.*` colors and `components/cultural/*` are reserved strictly for sanctioned
   First Nations surfaces, never decoration.

10. **Navigation map.** TopBar, BottomTabBar and Footer all read from `lib/navigation.ts`. Add routes
    there when a new primary surface should appear in the shell.

11. **Hub branding images.** Hub logo and cover both live in the `images` JSON field. Use
    `lib/hubImages.ts` to read/write typed entries: `type: "logo"` for the square icon, `type:
    "cover"` for the wide top image.

12. **Amplify Gen 2 / Cognito traps** — see the **"Amplify Gen 2 / Cognito gotchas"** section of
    `Assistant.md` before touching auth or `lib/aws/config.ts`. It covers the `signedIn` Hub
    event timing race (use `waitForAuth` after `signIn`), `authMessage` code mapping via
    `error.name` (never `error.message`, never raw codes in UI), the dual-source config ambiguity
    (`EXPO_PUBLIC_*` wins, else `amplify_outputs.json`), and the guest identity-pool fallback gap
    (missing `identityPoolId` → guest reads fail with "No federated jwt").

## AWS deployment workflow

```bash
# Deploy backend (dev sandbox — torn down when you stop it)
AWS_PROFILE=culturepass-admin npx ampx sandbox

# Populate .env from the deployed outputs
node scripts/aws-env-from-outputs.mjs

# Deploy backend to a permanent production branch
AWS_PROFILE=culturepass-admin npx ampx pipeline-deploy --branch main --app-id YOUR_APP_ID

# Migrate data from Supabase to DynamoDB (one-time)
npm run migrate:dynamo

# Build mobile apps
eas build --platform all --profile production
```

**EAS env vars** (set once via `eas env:create --environment production`):
`EXPO_PUBLIC_BACKEND`, `EXPO_PUBLIC_AWS_REGION`, `EXPO_PUBLIC_COGNITO_USER_POOL_ID`,
`EXPO_PUBLIC_COGNITO_APP_CLIENT_ID`, `EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID`,
`EXPO_PUBLIC_APPSYNC_ENDPOINT`, `EXPO_PUBLIC_S3_BUCKET`.

**Config source of truth (`sandbox` → `amplify_outputs.json` → `.env`).** `npx ampx sandbox`
(and the Amplify CI backend phase) regenerate **`amplify_outputs.json`**, the canonical runtime
config. `node scripts/aws-env-from-outputs.mjs` copies those values into `.env` as
`EXPO_PUBLIC_*` vars. At runtime `lib/aws/config.ts` prefers the `EXPO_PUBLIC_*` var and falls
back to `amplify_outputs.json` per field:

- **Rely on `amplify_outputs.json`** for local dev right after a sandbox deploy — no `.env`
  needed (`model_introspection` is only sourced from here regardless).
- **Set `EXPO_PUBLIC_*` vars** for EAS builds and any deploy that must pin a specific backend
  independent of whatever outputs file is bundled (they take precedence).
- **Verify which source `configureAmplify()` used:** an empty env var silently defers to the
  outputs file, so check both. `configureAmplify()` `console.error`s and returns `false` when
  `userPoolId`/`userPoolClientId` are empty after *both* sources; it `console.warn`s when
  `identityPoolId` is missing (guest reads will fail). Log/inspect the resolved `userPoolId` to
  confirm you're pointed at the intended pool.

## Definition of done

Always: `npm run typecheck` clean, `npm run lint` clean, `npx vitest run` green; UI uses existing
primitives + tokens; cultural surfaces respected; outward/irreversible actions (pipeline-deploy,
EAS build/submit, data migration) confirmed first. Then, per change type:

- **Schema change** — updated in `amplify/data/resource.ts`; `npx ampx sandbox` redeployed and
  `amplify_outputs.json` refreshed; mapper functions in the affected `features/*/api.ts` updated
  for any camelCase↔snake_case field changes; `collectAll()` still used for lists.
- **Auth change** — no Cognito code appears raw in UI (goes through `authMessage`, mapped by
  `error.name`); `signedIn` timing handled (`waitForAuth` after sign-in); guest vs userPool data
  auth mode still correct; see the Amplify Gen 2 / Cognito gotchas in `Assistant.md`.
- **UI-only change** — keyboard-avoiding + safe-area verified on iOS simulator and Android
  emulator; all interactive elements meet the 44 pt / 48 dp touch target (size tokens or
  `hitSlop`); reduced-motion respected for animation.
- **Data-fetch change** — a `Skeleton`/loading state added for the async fetch (no bare spinners
  or "Loading…" text); errors mapped to user-safe copy via `lib/utils/errorMessage.ts`, never a
  raw `Error.message`.
- **Documentation-only change** — `Assistant.md` and `CLAUDE.md` kept in sync; no code or config
  touched; `docs/SCHEMA.md` updated if the data model was described.
