#!/usr/bin/env node
// scripts/backup.mjs
// Timestamped source backup for CulturePass Australia. Zips the working tree
// (including .git history, .env and credentials so a restore is complete) but
// excludes the heavy, rebuildable directories — node_modules, the native
// ios/android folders, build output and previous *.zip backups.
//
// Run via:  npm run backup   (or the `backup` zsh shortcut)
// Override the destination with the CULTUREPASS_BACKUP_DIR env var.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { mkdirSync, statSync } from "node:fs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const destDir =
  process.env.CULTUREPASS_BACKUP_DIR ?? "/Users/cultureos/Dev230526/Backup";
mkdirSync(destDir, { recursive: true });

// 2026-06-29T23-40-00  → filesystem-safe, sortable
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const archive = join(destDir, `culturepass-australia-${stamp}.zip`);

// Patterns are matched against paths as stored (relative, no leading "./").
const excludes = [
  "node_modules/*",
  "*/node_modules/*",
  "ios/*",
  "android/*",
  "dist/*",
  "web-build/*",
  ".expo/*",
  "*.zip",
  ".DS_Store",
  "*/.DS_Store",
];

console.log("📦 Backing up CulturePass Australia");
console.log(`   from: ${projectRoot}`);
console.log(`   to:   ${archive}`);

const result = spawnSync("zip", ["-r", "-q", archive, ".", "-x", ...excludes], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error(`❌ Backup failed: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`❌ zip exited with code ${result.status}`);
  process.exit(result.status ?? 1);
}

const mb = (statSync(archive).size / 1024 / 1024).toFixed(1);
console.log(`✅ Backup complete — ${mb} MB`);
console.log(`   ${archive}`);
