#!/usr/bin/env node
// =============================================================================
// aws-env-from-outputs — fill the EXPO_PUBLIC_* AWS vars in .env from
// amplify_outputs.json (written by `npx ampx sandbox` / `ampx pipeline-deploy`).
// =============================================================================
// Idempotent: updates existing keys in place, appends missing ones under an
// "AWS / Amplify" block, and never touches the Supabase vars. Does NOT flip
// EXPO_PUBLIC_BACKEND — do that yourself when you're ready to cut over.
//
//   node scripts/aws-env-from-outputs.mjs
//
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputsPath = resolve(root, "amplify_outputs.json");
const envPath = resolve(root, ".env");

if (!existsSync(outputsPath)) {
  console.error(
    "✗ amplify_outputs.json not found. Deploy first:\n" +
      "    AWS_PROFILE=culturepass-admin npx ampx sandbox\n" +
      "  (it writes amplify_outputs.json once the stack is up), then re-run this.",
  );
  process.exit(1);
}

const out = JSON.parse(readFileSync(outputsPath, "utf8"));
const auth = out.auth ?? {};
const data = out.data ?? {};
const storage = out.storage ?? {};

// amplify_outputs.json (Gen 2) → our EXPO_PUBLIC_* names (see .env.example).
const mapping = {
  EXPO_PUBLIC_AWS_REGION: auth.aws_region ?? data.aws_region ?? storage.aws_region,
  EXPO_PUBLIC_COGNITO_USER_POOL_ID: auth.user_pool_id,
  EXPO_PUBLIC_COGNITO_APP_CLIENT_ID: auth.user_pool_client_id,
  EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID: auth.identity_pool_id,
  EXPO_PUBLIC_APPSYNC_ENDPOINT: data.url,
  EXPO_PUBLIC_S3_BUCKET: storage.bucket_name,
};
// Only set the API key var if the API actually exposes an apiKey auth mode.
if (data.api_key) mapping.EXPO_PUBLIC_APPSYNC_API_KEY = data.api_key;

const updates = Object.fromEntries(
  Object.entries(mapping).filter(([, v]) => v != null && v !== ""),
);

let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const applied = [];
const appended = [];

for (const [key, value] of Object.entries(updates)) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(env)) {
    env = env.replace(re, line);
    applied.push(key);
  } else {
    appended.push(line);
  }
}

if (appended.length > 0) {
  env = env.replace(/\n*$/, "\n");
  env += `\n# AWS / Amplify — added by scripts/aws-env-from-outputs.mjs\n${appended.join("\n")}\n`;
}

writeFileSync(envPath, env);

console.log("✓ .env updated from amplify_outputs.json");
if (applied.length) console.log("  updated: " + applied.join(", "));
if (appended.length) console.log("  added:   " + appended.map((l) => l.split("=")[0]).join(", "));
const backend = (env.match(/^EXPO_PUBLIC_BACKEND=(.*)$/m) ?? [])[1];
console.log(
  `\n  EXPO_PUBLIC_BACKEND is currently "${backend ?? "supabase (default)"}". ` +
    'Set it to "aws" and restart Expo to cut over.',
);
