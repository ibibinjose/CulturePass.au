import { defineFunction } from "@aws-amplify/backend";

/**
 * dev-seed — one-off DEV helper (invoke manually with `aws lambda invoke`).
 * Creates a Profile for a given Cognito sub + a published paid Event with a
 * ticket type, so a test purchase can run end-to-end. Not used by the app.
 * Remove from amplify/backend.ts once real data is migrated.
 */
export const devSeed = defineFunction({
  name: "dev-seed",
  entry: "./handler.ts",
  timeoutSeconds: 60,
});
