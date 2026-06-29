import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";

/**
 * CulturePass AWS backend (Amplify Gen 2).
 * Auth → Cognito · Data → RDS/Aurora Postgres (via SQL data source) · Storage → S3.
 *
 * Deploy a personal cloud sandbox with:   npx ampx sandbox
 * Generates `amplify_outputs.json` at the repo root for the client to consume.
 */
defineBackend({
  auth,
  data,
  storage,
});
