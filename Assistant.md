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
  data/resource.ts         18 domain models (AppSync/DynamoDB schema)
  storage/resource.ts      S3 media bucket
  functions/               tickets-checkout · stripe-webhook · get-taken-seats (Lambda)
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
`ProfileSubscription`, `AustralianState`, `AustralianCouncil`.

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

- `npm run typecheck` clean, `npm run lint` clean.
- Schema changes reflected in `amplify/data/resource.ts` + sandbox redeploy + `amplify_outputs.json` refreshed.
- UI uses existing primitives + tokens; cultural surfaces respected.
- Outward/irreversible actions (pipeline-deploy, EAS build/submit, data migration) confirmed first.
