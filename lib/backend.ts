/**
 * Backend selector for the Supabase → AWS migration (additive cutover).
 *
 * The app runs on Supabase until BOTH:
 *   1. the Amplify backend is deployed (`npx ampx sandbox`), and
 *   2. EXPO_PUBLIC_BACKEND=aws (plus the AWS env vars) is set.
 *
 * See docs/AWS_MIGRATION.md. Keeping this a single source of truth means the
 * per-feature data layer can branch on `isAwsBackend` as each domain is ported,
 * without a big-bang switch.
 */
export type BackendKind = "supabase" | "aws";

export const BACKEND: BackendKind =
  process.env.EXPO_PUBLIC_BACKEND === "aws" ? "aws" : "supabase";

export const isAwsBackend = BACKEND === "aws";
export const isSupabaseBackend = BACKEND === "supabase";
