# Supabase → AWS migration (additive cutover)

The app moves from Supabase to **AWS Amplify Gen 2** (Cognito + AppSync/DynamoDB +
S3) **without ever breaking**. It runs on Supabase until you deploy the AWS
backend and flip one flag. Nothing here deletes Supabase.

## Architecture mapping

| Supabase | AWS (Amplify Gen 2) |
| --- | --- |
| Auth (`supabase.auth`) | **Cognito** user pool — [`amplify/auth/resource.ts`](../amplify/auth/resource.ts) (+ `admin` group for `profiles.is_admin`) |
| Postgres + RLS | **DynamoDB via AppSync** — [`amplify/data/resource.ts`](../amplify/data/resource.ts); RLS → Amplify `allow.*` rules |
| Storage `media` bucket | **S3** — [`amplify/storage/resource.ts`](../amplify/storage/resource.ts); `<uid>/…` prefix → `entity('identity')` |
| Edge functions (Stripe) | **Lambda + API Gateway** (not yet ported — see below) |

## What's already in place

- **Deployable backend.** `@aws-amplify/backend` is installed; the Gen 2 backend
  ([`amplify/backend.ts`](../amplify/backend.ts)) defines Auth, Data (all 18
  domain models, ported from `lib/supabase/database.types.ts`) and Storage.
  `npx tsc -p amplify/tsconfig.json --noEmit` is green.
- **Client seam (additive):**
  - [`lib/backend.ts`](../lib/backend.ts) — `BACKEND` / `isAwsBackend` flag from
    `EXPO_PUBLIC_BACKEND` (defaults to `supabase`).
  - [`lib/aws/config.ts`](../lib/aws/config.ts) — `configureAmplify()`, built from
    `EXPO_PUBLIC_*` env vars (bundle-safe; no missing-file import). No-ops unless
    AWS is configured.
  - [`lib/aws/data.ts`](../lib/aws/data.ts) — `getAwsDataClient()`, the AppSync
    counterpart to `lib/supabase/client`.
  - [`app/_layout.tsx`](../app/_layout.tsx) calls `configureAmplify()` only when
    `isAwsBackend` — a no-op on the Supabase build.

## Deploy & cut over

1. **AWS credentials** (I can't do this from the repo): `aws configure` (or SSO).
2. **Deploy a sandbox:** `npx ampx sandbox` → writes `amplify_outputs.json`.
3. **Fill `.env`** from `amplify_outputs.json`:
   - `auth.user_pool_id` → `EXPO_PUBLIC_COGNITO_USER_POOL_ID`
   - `auth.user_pool_client_id` → `EXPO_PUBLIC_COGNITO_APP_CLIENT_ID`
   - `auth.identity_pool_id` → `EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID`
   - `data.url` → `EXPO_PUBLIC_APPSYNC_ENDPOINT`
4. **Flip the flag:** `EXPO_PUBLIC_BACKEND=aws`, restart Expo. Amplify now
   configures at startup.

## Remaining work (the data-layer port)

The seam is ready but the ~1,768 lines of `features/*/api.ts` still call Supabase.
Port them per domain, branching on `isAwsBackend` and using `getAwsDataClient()`
(type it `generateClient<Schema>()` — see the note in `lib/aws/data.ts`). Order:
`reference` → `auth` → `profiles` → `hubs` → `events` → `tickets`/social.

Still to design:
- **Stripe** — `tickets-checkout` + `stripe-webhook` (Deno edge functions) must be
  rebuilt as Amplify **functions** (Lambda); keep the webhook the source of truth.
- **Reference data** — seed `AustralianState` / `AustralianCouncil` (from
  `supabase/seed.sql`) into DynamoDB.
- **Data migration** — export existing Supabase rows → DynamoDB.
- **Realtime / RLS parity** — verify per-hub editor rules (approximated by
  `owner` + `admin` today) and AppSync subscriptions vs Supabase Realtime.
