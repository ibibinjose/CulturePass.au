# Supabase → AWS migration (historical record)

**Status: Complete.** Production has been exclusively AWS Amplify Gen 2 since mid-2026.

This document is retained as a historical record of the additive cutover approach.

The app moved from Supabase to **AWS Amplify Gen 2** (Cognito + AppSync/DynamoDB + S3 + Lambda) without breaking users. `lib/backend.ts` now hard-pins the backend to AWS (`BACKEND = "aws"`). The dual seam and `EXPO_PUBLIC_BACKEND` flag are vestigial.

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
  domain models, ported from `lib/types/database.types.ts`) and Storage.
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

## What the cutover looked like (historical)

1. Deploy sandbox: `npx ampx sandbox`
2. Populate `.env` via `node scripts/aws-env-from-outputs.mjs`
3. `EXPO_PUBLIC_BACKEND=aws` (now hard-coded in `lib/backend.ts`)
4. Ported feature `api.ts` files to use `getAwsDataClient()` + mappers.
5. Stripe functions moved to `amplify/functions/`.
6. One-shot data migration via `scripts/migrate-supabase-to-dynamo.mjs`.
7. Reference data seeded via `dev-seed` Lambda + `post-confirmation` trigger.

All data-layer ports, auth, realtime (subscriptions), and Stripe fulfilment are now on the AWS side. The old Supabase client paths have been removed from normal execution.
