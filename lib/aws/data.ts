import { generateClient } from "aws-amplify/data";

import type { Schema } from "@/amplify/data/resource";
import { configureAmplify, getDataAuthMode } from "./config";

/**
 * Amplify Data (AppSync) client. (Previously mirrored a lib/supabase/client.)
 *
 * Typed end-to-end with the Gen 2 `Schema`, so callers get full typings on
 * `client.models.Hub`, `client.models.Event`, etc. The `Schema` type is imported
 * as `import type` from the (otherwise tsconfig-excluded) `amplify/` backend; with
 * `skipLibCheck` this stays cheap and keeps the Supabase build untouched.
 *
 * (No module-level caching: the fully-instantiated client type is too large to
 * compare for a cached `let`, and Amplify dedupes the underlying client
 * internally, so a fresh `generateClient` per call is cheap.)
 */
export function getAwsDataClient() {
  configureAmplify();
  // authMode follows the session: guests read via the Identity Pool (IAM) role
  // so `allow.guest()` rules apply; signed-in users use User Pools.
  return generateClient<Schema>({ authMode: getDataAuthMode() });
}

/** A typed Amplify Data client (return type of {@link getAwsDataClient}). */
export type AwsDataClient = ReturnType<typeof getAwsDataClient>;

/**
 * The resolved TS type of a single record for model `K` (e.g. `AwsItem<"Hub">`).
 * Use it to type the mappers that translate AppSync records back into the
 * snake_case row shapes the existing Supabase-era consumers expect.
 */
export type AwsItem<K extends keyof Schema & string> = Schema[K]["type"];
