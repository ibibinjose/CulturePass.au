import { generateClient } from "aws-amplify/data";

import { configureAmplify } from "./config";

/**
 * Amplify Data (AppSync) client — the AWS counterpart to `lib/supabase/client`.
 *
 * Kept generic (untyped models) for now so the app tsconfig stays decoupled from
 * the backend package (`amplify/` is excluded from the app program). During the
 * per-feature port, type it end-to-end by switching to:
 *
 *   import type { Schema } from "@/amplify/data/resource";
 *   return generateClient<Schema>();
 *
 * and adding "amplify/data/resource.ts" to tsconfig "include". That gives full
 * typings on `client.models.Hub`, `client.models.Event`, etc.
 *
 * (No module-level caching: the fully-instantiated client type is too large to
 * compare for a cached `let`, and a typed `generateClient<Schema>()` will replace
 * this during the port anyway. Amplify dedupes the underlying client internally.)
 */
export function getAwsDataClient() {
  configureAmplify();
  return generateClient();
}
