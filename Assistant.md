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
- **Supabase** (`@supabase/supabase-js` 2.45) — Postgres, Auth, Storage, RLS
- **TanStack Query** 5 — server state / caching (`features/*/api.ts`)
- **Zustand** 5 — local/persisted UI state (e.g. the hub-creation draft)
- **Zod** 3 — validation schemas in `lib/validation/*`
- **NativeWind** 4 + **Tailwind** 3 — styling via `className`
- **TypeScript** strict, `noUncheckedIndexedAccess: true`

## Commands

```bash
npm run web            # Expo web (http://localhost:8081) — primary dev target
npm run ios | android  # native
npm run typecheck      # tsc --noEmit   (must stay clean)
npm run lint           # eslint .       (flat config: eslint.config.js)
npm run db:start       # supabase start  (local stack; needs Docker)
npm run db:reset       # apply migrations + seed locally
npm run db:types       # regenerate lib/supabase/database.types.ts (see gotcha below)
```

Always run `npm run typecheck` **and** `npm run lint` before considering a change
done — both are currently green and should stay that way.

---

## Project structure

```
app/                       expo-router routes (file-based)
  _layout.tsx              providers, fonts, root stack
  index.tsx                home — search + explore by state + featured hubs
  explore/index.tsx        discovery with filters
  state/[code].tsx         hubs by state/territory
  hub/[slug].tsx           hub profile (social-style: cover, avatar, tabs)
  hub/edit/[slug].tsx      hub edit wizard
  my-hubs/index.tsx        manage hubs you own
  event/[id].tsx           event detail
  create/                  hub.tsx (wizard) · event.tsx · professional.tsx · index.tsx
  profile/                 [id].tsx (public) · edit.tsx
  settings/                index · account · privacy · notifications · about
  (auth)/                  sign-in · sign-up · reset-password · update-password
components/
  ui/                      design-system primitives (Text, Button, Card, Badge,
                           Avatar, Input, Field, ListRow, Chip, DatePicker, …)
  cultural/                AcknowledgementBar, WelcomeToCountry, IndigenousLedBadge
features/
  auth/                    AuthProvider, RequireAuth, api.ts (getCurrentProfileId)
  hubs/ events/ profiles/ reference/   queries/mutations + cards
lib/
  supabase/                client.ts, database.types.ts (hand-authored)
  validation/              zod schemas (auth, hub, event, profile)
  constants.ts             enums/labels (single source of truth, mirrors SQL enums)
  theme.ts, query.ts, storage.ts, utils/cn.ts
supabase/
  migrations/              ordered SQL; docs/SCHEMA.md describes the schema
  functions/               Deno edge functions (excluded from app tsconfig)
```

`docs/SCHEMA.md` is the human-readable schema reference. `lib/constants.ts` must
stay in sync with the SQL enums.

---

## Data model (tables)

`profiles` (1:1 auth user; doubles as a public Professional Account),
`hubs` (owned by a profile), `hub_members`, `events` (belong to a hub),
`event_rsvps`, plus reference data `australian_states`, `australian_councils`,
`localities`. `delete_my_account()` RPC hard-deletes the caller's account.

---

## Design system

Swiss minimalism + a warm Australian palette (cream `paper`, `sand`, `linen`;
warm-black `ink`; accents `ochre`, `eucalyptus`, `terracotta`). Tokens live in
`tailwind.config.js`. Rules of thumb:

- All text goes through `components/ui/Text` (`variant` + `tone`). Don't hand-roll
  font sizes/colors.
- Restraint over decoration — accents are sparing; default is ink on cream.
- `country.*` colors and the `cultural/` components are **reserved** for Welcome
  to Country / Acknowledgement / Indigenous-led surfaces only. Never decorative.
- `Screen` already applies `px-gutter` (20px) to its children. To make something
  full-bleed (e.g. a cover banner), offset with `marginHorizontal: -20`; don't
  add `px-gutter` again inside it.

---

## Conventions & gotchas (high-value — these have bitten before)

1. **`database.types.ts` is hand-authored.** `npm run db:types` regenerates it and
   types every `jsonb` column as `Json`. We intentionally type the `images`
   columns on `hubs`/`events` as `HubImage[]`. **Re-apply that after regenerating**
   (there's a comment in the file).

2. **Never `JSON.stringify` jsonb values before insert/update.** supabase-js
   serializes the whole body. Pass the array/object directly (e.g.
   `images: draft.images ?? []`). Stringifying double-encodes the column.

3. **Empty form strings vs typed columns.** Form fields initialise to `""`. A
   present `""` fails `z.string().datetime()` / regex even with `.optional()`.
   Use the empty-as-undefined transforms in `lib/validation/*`
   (`optionalIsoDateTime`, `requiredIsoDateTime`, `optionalText` + `.pipe`).

4. **RLS lets authenticated users read all `profiles`.** Never `.single()` an
   unfiltered `profiles` query — scope "my own" lookups via
   `getCurrentProfileId()` (`features/auth/api.ts`).

5. **Storage.** The `media` bucket is **public** (served via `getPublicUrl`).
   Upload paths must start with the user's id: `<auth.uid()>/<folder>/<file>` —
   the storage RLS write policy requires it. See `components/ui/ImagePicker.tsx`.

6. **Platform-specific files.** `react-native-date-picker` is native-only and
   needs the `modal` + `open` props for `onConfirm`/`onCancel` to fire. We split:
   `DatePicker.tsx` (native modal) and `DatePicker.web.tsx` (HTML `<input>`).
   Metro resolves `.web.tsx` on web automatically.

7. **Hooks.** Strict rules-of-hooks — never call a hook after an early `return`.
   Prefer a plain computed value over `useMemo` when it's cheap.

8. **Edge functions** (`supabase/functions/**`) are Deno and are excluded from the
   app `tsconfig` and ESLint. Don't try to fix "Deno is not defined" in app tsc.

9. **Cultural priority.** Keep Welcome to Country / custodian acknowledgement
   prominent on hub pages. Don't bury it behind a tab or remove it for layout.

---

## Supabase workflow

- **Local:** start Docker, `supabase start`, then `supabase db reset` to apply
  migrations + seed. Only one local Supabase project can run at the default ports
  at a time.
- **`.env` points at the linked *remote* project.** The running app uses the
  remote DB even when a local stack is up. Schema/storage fixes only affect the
  app once they reach the remote.
- **Migrations are immutable once applied.** Editing an applied migration won't
  re-run on the remote (`db push` skips known versions). Add a **new forward
  migration** instead (see `20260626120000_media_bucket_public.sql` for the
  pattern). Confirm with the maintainer before `supabase db push` — it writes to
  the hosted database.

---

## Definition of done

- `npm run typecheck` clean, `npm run lint` clean.
- New DB behaviour covered by a forward migration; types updated to match.
- UI uses existing primitives + tokens; cultural surfaces respected.
- Outward/irreversible actions (remote `db push`, deploys) confirmed first.
