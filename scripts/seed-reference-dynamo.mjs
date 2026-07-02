#!/usr/bin/env node
// =============================================================================
// seed-reference-dynamo.mjs
// HISTORICAL: Seed reference data (Australian states + councils) into DynamoDB.
//
// Previously parsed from legacy supabase/seed.sql. The Supabase directory has
// been removed as the project is now 100% AWS Amplify Gen 2.
//
// This script may need updating or the seed data can be maintained elsewhere.
// It writes directly to the AppSync DynamoDB tables.
// =============================================================================

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const DRY_RUN = process.env.DRY_RUN === "1";

function aws(args, parse = true) {
  const out = execFileSync("aws", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return parse ? JSON.parse(out) : out;
}

// ---------------------------------------------------------------------------
// Resolve region + table suffix from amplify_outputs.json
// ---------------------------------------------------------------------------
const outputs = JSON.parse(readFileSync(join(root, "amplify_outputs.json"), "utf8"));
const graphqlUrl = outputs.data?.url;
const region = process.env.AWS_REGION || outputs.data?.aws_region || outputs.auth?.aws_region;
if (!graphqlUrl || !region) throw new Error("amplify_outputs.json missing data.url / region");

const apis = aws(["appsync", "list-graphql-apis", "--region", region]).graphqlApis;
const api = apis.find((a) => a.uris?.GRAPHQL === graphqlUrl);
if (!api) throw new Error(`No AppSync API matches ${graphqlUrl}`);
const suffix = `${api.apiId}-NONE`;
console.log(`Target API ${api.apiId} (${region})`);

// ---------------------------------------------------------------------------
// Legacy Supabase seed parsing removed (supabase/ directory deleted).
// The project is now fully on AWS. Seed data logic needs to be maintained
// separately or this script updated with embedded reference data.
// ---------------------------------------------------------------------------
console.error("This script is historical. The supabase/ directory has been removed (full AWS migration).");
console.error("Reference data seeding should now be handled differently (e.g. via dev-seed Lambda or manual).");
process.exit(1);


/** Extract the `values ...;` tuple list that follows an INSERT for `table`. */
function tuplesFor(table) {
  const start = sql.indexOf(`insert into public.${table}`);
  if (start === -1) throw new Error(`No insert for ${table} in seed.sql`);
  const valuesAt = sql.indexOf("values", start);
  const tuples = [];
  let i = valuesAt + "values".length;
  let depth = 0;
  let inString = false;
  let current = "";
  for (; i < sql.length; i++) {
    const ch = sql[i];
    if (inString) {
      current += ch;
      if (ch === "'") {
        if (sql[i + 1] === "'") { current += "'"; i++; } // '' escape
        else inString = false;
      }
      continue;
    }
    if (ch === "'") { inString = true; current += ch; continue; }
    if (ch === "(") { depth++; if (depth === 1) { current = ""; continue; } }
    if (ch === ")") { depth--; if (depth === 0) { tuples.push(current); continue; } }
    // Between tuples only whitespace/commas are legal; a letter means the
    // statement moved on (e.g. `on conflict …`) — stop before capturing it.
    if (depth === 0 && (ch === ";" || /[a-z]/i.test(ch))) break;
    if (depth >= 1) current += ch;
  }
  return tuples;
}

/** Split one tuple body into raw SQL value tokens (top-level commas only). */
function splitValues(tuple) {
  const parts = [];
  let current = "";
  let inString = false;
  let depth = 0;
  for (let i = 0; i < tuple.length; i++) {
    const ch = tuple[i];
    if (inString) {
      current += ch;
      if (ch === "'") {
        if (tuple[i + 1] === "'") { current += "'"; i++; }
        else inString = false;
      }
      continue;
    }
    if (ch === "'") { inString = true; current += ch; continue; }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** SQL literal → JS value. Strips ::casts; parses '…'::jsonb as JSON. */
function toJs(raw) {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith("'")) {
    const closing = raw.lastIndexOf("'");
    const body = raw.slice(1, closing).replace(/''/g, "'");
    return raw.slice(closing + 1).includes("jsonb") ? JSON.parse(body) : body;
  }
  const n = Number(raw);
  if (!Number.isNaN(n)) return n;
  throw new Error(`Unparseable SQL value: ${raw.slice(0, 60)}`);
}

const states = tuplesFor("australian_states").map((t) => {
  const [code, name, capitalCity, timezone, sortOrder] = splitValues(t).map(toJs);
  return { code, name, capitalCity, timezone, sortOrder };
});

/** AppSync's AWSURL scalar refuses scheme-less values on read — normalize here. */
function toUrl(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

const councils = tuplesFor("australian_councils").map((t) => {
  const [absCode, name, slug, stateCode, region_, population, areaSqkm, website, logoUrl, _coordinates, isMetro, metadata] =
    splitValues(t).map(toJs);
  // coordinates is PostGIS-specific and unused by the app — dropped.
  return { absCode, name, slug, stateCode, region: region_, population, areaSqkm, website: toUrl(website), logoUrl: toUrl(logoUrl), isMetro, metadata };
});

console.log(`Parsed ${states.length} states, ${councils.length} councils from seed.sql`);
if (states.length < 8 || councils.length < 100) throw new Error("Parse looks incomplete — aborting.");

// ---------------------------------------------------------------------------
// Marshal to DynamoDB items
// ---------------------------------------------------------------------------
function ddb(value) {
  if (value === null || value === undefined) return { NULL: true };
  if (typeof value === "boolean") return { BOOL: value };
  if (typeof value === "number") return { N: String(value) };
  if (typeof value === "string") return { S: value };
  if (Array.isArray(value)) return { L: value.map(ddb) };
  return { M: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, ddb(v)])) };
}

/** Item with AppSync bookkeeping fields; null/undefined attributes omitted. */
function item(typename, fields) {
  const now = new Date().toISOString();
  const all = { ...fields, __typename: typename, createdAt: now, updatedAt: now };
  return Object.fromEntries(
    Object.entries(all)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => [k, ddb(v)]),
  );
}

const stateItems = states.map((s) => item("AustralianState", s));
const councilItems = councils.map((c) => item("AustralianCouncil", { id: randomUUID(), ...c }));

if (DRY_RUN) {
  console.log(`DRY RUN — would write ${stateItems.length} states + ${councilItems.length} councils to *-${suffix}`);
  process.exit(0);
}

// Councils get random ids, so re-seeding a populated table would duplicate rows.
const councilTable = `AustralianCouncil-${suffix}`;
const existing = aws(["dynamodb", "scan", "--region", region, "--table-name", councilTable, "--select", "COUNT"]).Count;
if (existing > 0) throw new Error(`${councilTable} already has ${existing} rows — wipe it first to re-seed.`);

// ---------------------------------------------------------------------------
// Batch write (25 per request, retrying unprocessed items)
// ---------------------------------------------------------------------------
const tmp = mkdtempSync(join(tmpdir(), "cp-seed-"));

function batchWrite(table, items) {
  let written = 0;
  for (let i = 0; i < items.length; i += 25) {
    let requests = items.slice(i, i + 25).map((it) => ({ PutRequest: { Item: it } }));
    for (let attempt = 0; requests.length > 0 && attempt < 5; attempt++) {
      const file = join(tmp, "batch.json");
      writeFileSync(file, JSON.stringify({ [table]: requests }));
      const res = aws(["dynamodb", "batch-write-item", "--region", region, "--request-items", `file://${file}`]);
      const unprocessed = res.UnprocessedItems?.[table] ?? [];
      written += requests.length - unprocessed.length;
      requests = unprocessed;
      if (requests.length > 0) execFileSync("sleep", [String(2 ** attempt)]);
    }
    if (requests.length > 0) throw new Error(`${table}: ${requests.length} items failed after retries`);
  }
  console.log(`  ${table}: ${written} written`);
}

batchWrite(`AustralianState-${suffix}`, stateItems);
batchWrite(councilTable, councilItems);
console.log("Done.");
