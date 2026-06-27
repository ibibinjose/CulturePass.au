# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CulturePass Australia is a Swiss-design cultural platform (discover/create/connect across states,
councils and First Nations communities) built as one Expo codebase targeting **web, iOS and Android**.

> **`Assistant.md` is the detailed working brief** — read it for the full conventions list and the
> hard-won gotchas. This file is the orientation layer; `Assistant.md`, `docs/SCHEMA.md` and
> `docs/STRIPE_TICKETING.md` are the depth. Keep all four in sync when conventions change.

## Commands

```bash
npm run web              # Expo web (http://localhost:8081) — primary dev target
npm run ios | android    # native
npm run typecheck        # tsc --noEmit  — must stay clean
npm run lint             # eslint . (flat config: eslint.config.js)
npm run db:start         # supabase start (local stack; needs Docker)
npm run db:reset         # apply migrations + seed locally
npm run db:types         # regenerate lib/supabase/database.types.ts (see gotcha #1 below)
npm run functions:deploy # supabase functions deploy
npm run supabase:check   # scripts/check-supabase-config.mjs — verify env/config
```

There is **no test runner** (no jest/vitest). The verification gates are `npm run typecheck` and
`npm run lint`; both are green and must stay green before a change is considered done.

## Architecture

**Stack:** Expo SDK ~53 (React Native 0.79 + react-native-web, React 19), expo-router ~5 (file-based,
`typedRoutes` on), Supabase (Postgres/Auth/Storage/RLS), TanStack Query 5 (server state), Zustand 5
(local/persisted UI state), Zod 3 (validation), NativeWind 4 + Tailwind 3 (styling via `className`).
TypeScript strict, `noUncheckedIndexedAccess: true`, path alias `@/*` → repo root.

**Layering — three layers, one direction of dependency:**

- `app/` — expo-router routes only (screens, layouts). `app/_layout.tsx` mounts the provider stack:
  `GestureHandlerRootView → SafeAreaProvider → QueryClientProvider → AuthProvider`, a global `TopBar`,
  and the root `Stack`. Routes compose features + UI; they don't talk to Supabase directly.
- `features/<domain>/` — the data layer, one folder per domain (`auth`, `hubs`, `events`, `profiles`,
  `reference`, `tickets`, `weather`). `api.ts` holds the TanStack Query hooks and Supabase calls;
  domain components (`HubCard`, `EventForm`, …) live alongside. This is where DB access belongs.
- `lib/` — cross-cutting infra: `supabase/client.ts`, `query.ts` (client + query keys),
  `constants.ts` (enums/labels — single source of truth mirroring SQL enums), `theme.ts` (JS tokens
  mirroring `tailwind.config.js`), `validation/*` (Zod schemas), `storage.ts`, `share.ts`/`vcard.ts`/
  `social.ts` (sharing), `utils/cn.ts`.
- `components/ui/` — design-system primitives; `components/cultural/` — `AcknowledgementBar`,
  `WelcomeToCountry`, `IndigenousLedBadge`.

**Backend (`supabase/`):** `migrations/` are ordered SQL (extensions → reference → profiles → hubs →
events → …); `docs/SCHEMA.md` is the human-readable model. Core tables: `profiles` (1:1 auth user,
also serves as a public Professional Account), `hubs`, `hub_members`, `events`, `event_rsvps`,
`ticket_orders`, plus reference data (`australian_states`, `australian_councils`, `localities`).
`functions/` are **Deno** edge functions (excluded from app tsconfig + ESLint).

**Notable route groups:** `(auth)/` sign-in/up flows; `create/` (hub wizard, event, professional);
`l/` = public "link-in-bio" share pages; `card/` = shareable business-card pages; `tickets/` =
purchases + post-Stripe-checkout return screens.

**Payments:** Stripe Checkout is fully server-side (secret key never reaches the app). `tickets-checkout`
edge function validates the event and creates a `pending` order + Checkout Session; the `stripe-webhook`
function is the **source of truth** that flips orders to `paid`. The browser success redirect is never
trusted, and price is always read from the DB server-side. See `docs/STRIPE_TICKETING.md`.

## High-value gotchas (these have bitten before — full list in `Assistant.md`)

1. **`lib/supabase/database.types.ts` is hand-edited.** `npm run db:types` regenerates it but types
   every `jsonb` as `Json`; the `images` columns on `hubs`/`events` must be re-typed as `HubImage[]`
   after every regeneration (there's a comment marking it).
2. **Never `JSON.stringify` a jsonb value before insert/update** — supabase-js serializes the whole
   body; pass the array/object directly (`images: draft.images ?? []`). Stringifying double-encodes.
3. **Empty form strings vs typed columns.** Fields init to `""`, which fails `z.string().datetime()`/
   regex even with `.optional()`. Use the empty-as-undefined transforms in `lib/validation/*`
   (`optionalIsoDateTime`, `requiredIsoDateTime`, `optionalText` + `.pipe`).
4. **RLS lets any authenticated user read all `profiles`.** Never `.single()` an unfiltered `profiles`
   query — scope "my own" lookups via `getCurrentProfileId()` (`features/auth/api.ts`).
5. **Storage `media` bucket is public** (`getPublicUrl`). Upload paths must start with the user's id:
   `<auth.uid()>/<folder>/<file>` — the storage RLS write policy requires it.
6. **Platform-specific files:** `DatePicker.tsx` (native modal) vs `DatePicker.web.tsx` (HTML input);
   Metro resolves `.web.tsx` on web. `react-native-date-picker` is native-only.
7. **Edge functions are Deno** — don't try to fix "Deno is not defined" in app tsc; they're excluded.
8. **`metro.config.js` aliases `ws` to its browser shim** so Supabase Realtime bundles in RN — don't
   remove it (Realtime never calls `ws` at runtime; RN provides global `WebSocket`).

## Supabase workflow

- **`.env` points at the linked *remote* project**, so the running app uses the remote DB even with a
  local stack up. Only `EXPO_PUBLIC_*` vars reach the client; the service_role / Stripe secrets are
  server-side only (set via `supabase secrets set`).
- **Migrations are immutable once applied** — editing an applied migration won't re-run on the remote.
  Add a **new forward migration** instead.
- **Confirm with the maintainer before `supabase db push` / `functions deploy`** — these write to the
  hosted database / live functions.

## Cultural respect (non-negotiable)

Acknowledgement of Country is app-wide; Welcome to Country stays prominent on hub pages (never buried
behind a tab for layout). `country.*` colors and `components/cultural/*` are reserved strictly for
sanctioned First Nations surfaces, never decoration. Traditional Custodian attributions are never
auto-generated or guessed — `traditional_custodians` columns ship empty, populated only from verified,
properly-sourced data.
