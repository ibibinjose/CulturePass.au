#!/usr/bin/env node
// =============================================================================
// migrate-supabase-to-dynamo.mjs
// One-shot data migration: Supabase (Postgres) → AWS DynamoDB (via AppSync).
//
// What it migrates (in dependency order):
//   1. AustralianState        (reference — no auth constraint)
//   2. AustralianCouncil      (reference)
//   3. Profile                (user profiles — written with IAM auth)
//   4. Hub                    (depends on Profile)
//   5. HubMember              (depends on Hub + Profile)
//   6. Event                  (depends on Hub)
//   7. EventCohost            (depends on Event + Hub/Profile)
//   8. EventTicketType        (depends on Event)
//   9. EventRsvp              (depends on Event + Profile)
//  10. EventLike              (depends on Event + Profile)
//  11. EventSave              (depends on Event + Profile)
//  12. HubLike                (depends on Hub + Profile)
//  13. HubFollow              (depends on Hub + Profile)
//  14. ProfileFollow          (depends on Profile × 2)
//  15. ProfileSubscription    (depends on Profile × 2)
//  16. Notification           (depends on Profile)
//  17. Conversation           (depends on Hub + Profile)
//  18. Message                (depends on Conversation)
//  19. TicketOrder            (depends on Event)
//
// Auth strategy:
//   • The AppSync endpoint is called with AWS IAM auth (Identity Pool) so the
//     migration script can write records regardless of the `owner` field in each
//     model's authorization rules. This matches how the Lambda functions access
//     data (allow.resource()).
//   • The script uses aws-amplify's generateClient with IAM auth, configured
//     from the amplify_outputs.json values via EXPO_PUBLIC_* env vars.
//
// Usage:
//   node scripts/migrate-supabase-to-dynamo.mjs
//
// Prerequisites:
//   • .env must have EXPO_PUBLIC_* AWS values (run aws-env-from-outputs.mjs first)
//   • .env must have EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
//   • AWS credentials configured: aws configure --profile culturepass-admin
//   • amplify_outputs.json must exist (npx ampx sandbox already run)
//
// Options (env vars):
//   TABLES=Profile,Hub,Event   Migrate only these tables (comma-separated)
//   DRY_RUN=1                  Print counts without writing to DynamoDB
//   BATCH_SIZE=25              Items per DynamoDB write batch (default: 25)
// =============================================================================

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";

const root = resolve(import.meta.dirname, "..");

// ---------------------------------------------------------------------------
// Load env (dotenv-lite: parse .env manually to avoid needing dotenv package)
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) throw new Error(".env not found. Run aws-env-from-outputs.mjs first.");
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

loadEnv();

// ---------------------------------------------------------------------------
// Validate required env vars
// ---------------------------------------------------------------------------
const required = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_COGNITO_USER_POOL_ID",
  "EXPO_PUBLIC_COGNITO_APP_CLIENT_ID",
  "EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID",
  "EXPO_PUBLIC_APPSYNC_ENDPOINT",
  "EXPO_PUBLIC_AWS_REGION",
];
const missing = required.filter((k) => !process.env[k] || process.env[k].startsWith("your_"));
if (missing.length > 0) {
  console.error("✗ Missing env vars:", missing.join(", "));
  console.error("  Run: node scripts/aws-env-from-outputs.mjs");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
const DRY_RUN = process.env.DRY_RUN === "1";
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? "25", 10);
const ONLY_TABLES = process.env.TABLES ? new Set(process.env.TABLES.split(",").map((t) => t.trim())) : null;

// ---------------------------------------------------------------------------
// Supabase client (service-role key preferred; anon key used as fallback)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Amplify + AppSync client (IAM auth via Identity Pool)
// ---------------------------------------------------------------------------
const region = process.env.EXPO_PUBLIC_AWS_REGION;
const userPoolId = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.EXPO_PUBLIC_COGNITO_APP_CLIENT_ID;
const identityPoolId = process.env.EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID;
const graphqlEndpoint = process.env.EXPO_PUBLIC_APPSYNC_ENDPOINT;

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      identityPoolId,
      allowGuestAccess: true,
    },
  },
  API: {
    GraphQL: {
      endpoint: graphqlEndpoint,
      region,
      defaultAuthMode: "iam",
    },
  },
});

// Use IAM auth so we can write all records regardless of owner field
const client = generateClient({ authMode: "iam" });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(msg) { console.log(msg); }
function warn(msg) { console.warn("  ⚠", msg); }

/** Fetch all rows from a Supabase table with pagination. */
async function fetchAll(table, select = "*", filter = null) {
  const PAGE = 1000;
  let offset = 0;
  const results = [];
  while (true) {
    let q = supabase.from(table).select(select).range(offset, offset + PAGE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase ${table}: ${error.message}`);
    results.push(...(data ?? []));
    if ((data ?? []).length < PAGE) break;
    offset += PAGE;
  }
  return results;
}

/** Write items to DynamoDB in batches, returning counts. */
async function batchWrite(modelName, items, mapper) {
  if (items.length === 0) { log(`  ${modelName}: 0 rows — skipped`); return { ok: 0, skip: 0, err: 0 }; }
  if (DRY_RUN) { log(`  ${modelName}: ${items.length} rows (dry run — not written)`); return { ok: 0, skip: items.length, err: 0 }; }

  let ok = 0, skip = 0, err = 0;
  const model = client.models[modelName];
  if (!model) { warn(`No AppSync model: ${modelName}`); return { ok, skip, err }; }

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (row) => {
        try {
          const input = mapper(row);
          if (!input) { skip++; return; }
          const { errors } = await model.create(input);
          if (errors && errors.length > 0) {
            // Duplicate key → already migrated; skip silently
            const msg = errors[0].message ?? "";
            if (msg.includes("ConditionalCheckFailed") || msg.includes("already exists")) {
              skip++;
            } else {
              warn(`${modelName} ${row.id ?? ""}: ${msg}`);
              err++;
            }
          } else {
            ok++;
          }
        } catch (e) {
          warn(`${modelName} ${row.id ?? ""}: ${e.message}`);
          err++;
        }
      }),
    );
    // Throttle slightly to avoid DynamoDB write-capacity bursts
    if (i + BATCH_SIZE < items.length) await sleep(150);
  }

  log(`  ${modelName}: ${ok} written, ${skip} skipped, ${err} errors`);
  return { ok, skip, err };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function shouldRun(name) { return !ONLY_TABLES || ONLY_TABLES.has(name); }

// ---------------------------------------------------------------------------
// Table mappers: Supabase snake_case → AppSync camelCase
// Each mapper returns the input object for model.create(), or null to skip.
// ---------------------------------------------------------------------------

const mapState = (r) => ({
  code: r.code,
  name: r.name,
  capitalCity: r.capital_city ?? null,
  timezone: r.timezone ?? null,
  sortOrder: r.sort_order ?? null,
});

const mapCouncil = (r) => ({
  id: r.id,
  absCode: r.abs_code ?? null,
  name: r.name,
  slug: r.slug,
  stateCode: r.state_code,
  traditionalCustodians: r.traditional_custodians ?? [],
  region: r.region ?? null,
  population: r.population ?? null,
  areaSqkm: r.area_sqkm ?? null,
  website: r.website ?? null,
  isMetro: r.is_metro ?? false,
  coordinates: r.coordinates ?? null,
  logoUrl: r.logo_url ?? null,
  metadata: r.metadata ? JSON.stringify(r.metadata) : null,
});

const mapProfile = (r) => ({
  id: r.id,
  userId: r.user_id,
  fullName: r.full_name ?? null,
  avatarUrl: r.avatar_url ?? null,
  bio: r.bio ?? null,
  location: r.location ?? null,
  coordinates: r.coordinates ?? null,
  interests: r.interests ?? [],
  culturalBackground: r.cultural_background ?? null,
  indigenousConnection: r.indigenous_connection ?? null,
  preferredLanguages: r.preferred_languages ?? [],
  isPublicProfessional: r.is_public_professional ?? false,
  isAdmin: r.is_admin ?? false,
  professionalCategory: r.professional_category ?? null,
  professionalTitle: r.professional_title ?? null,
  publicBio: r.public_bio ?? null,
  publicLinks: r.public_links ? JSON.stringify(r.public_links) : null,
  preferences: r.preferences ? JSON.stringify(r.preferences) : null,
});

const mapHub = (r) => ({
  id: r.id,
  ownerId: r.owner_id,
  type: r.type ?? "community_cultural_group",
  name: r.name,
  slug: r.slug,
  shortDescription: r.short_description ?? null,
  fullDescription: r.full_description ?? null,
  welcomeToCountry: r.welcome_to_country ?? null,
  traditionalCustodians: r.traditional_custodians ?? [],
  indigenousLed: r.indigenous_led ?? false,
  indigenousPartners: r.indigenous_partners ?? [],
  locationState: r.location_state ?? null,
  locationCouncilId: r.location_council_id ?? null,
  locationPostcode: r.location_postcode ?? null,
  locationCity: r.location_city ?? null,
  coordinates: r.coordinates ?? null,
  address: r.address ?? null,
  website: r.website ?? null,
  contactEmail: r.contact_email ?? null,
  phone: r.phone ?? null,
  images: r.images ? JSON.stringify(r.images) : null,
  categories: r.categories ?? [],
  tags: r.tags ?? [],
  verificationStatus: r.verification_status ?? "pending",
  status: r.status ?? "draft",
  metadata: r.metadata ? JSON.stringify(r.metadata) : null,
});

const mapHubMember = (r) => ({
  id: r.id,
  hubId: r.hub_id,
  profileId: r.profile_id,
  role: r.role ?? "member",
});

const mapEvent = (r) => ({
  id: r.id,
  hubId: r.hub_id,
  type: r.type ?? "event",
  title: r.title ?? "",
  description: r.description ?? null,
  startTime: r.start_time ?? null,
  endTime: r.end_time ?? null,
  isFree: r.is_free ?? true,
  price: r.price ?? null,
  ticketUrl: r.ticket_url ?? null,
  locationCity: r.location_city ?? null,
  locationState: r.location_state ?? null,
  locationCouncilId: r.location_council_id ?? null,
  coordinates: r.coordinates ?? null,
  capacity: r.capacity ?? null,
  rsvpCount: r.rsvp_count ?? 0,
  images: r.images ? JSON.stringify(r.images) : null,
  tags: r.tags ?? [],
  culturalFocus: r.cultural_focus ?? [],
  status: r.status ?? "draft",
  eventDates: r.event_dates ?? null,
  hasAssignedSeating: r.has_assigned_seating ?? null,
  seatingLayout: r.seating_layout ? JSON.stringify(r.seating_layout) : null,
  venueMapUrl: r.venue_map_url ?? null,
});

const mapEventCohost = (r) => ({
  id: r.id,
  eventId: r.event_id,
  hubId: r.hub_id ?? null,
  profileId: r.profile_id ?? null,
  role: r.role ?? "cohost",
  status: r.status ?? "pending",
  invitedBy: r.invited_by,
  message: r.message ?? null,
  respondedAt: r.responded_at ?? null,
});

const mapEventTicketType = (r) => ({
  id: r.id,
  eventId: r.event_id,
  name: r.name,
  priceCents: r.price_cents,
  capacity: r.capacity ?? null,
  soldCount: r.sold_count ?? 0,
  description: r.description ?? null,
});

const mapEventRsvp = (r) => ({
  id: r.id,
  eventId: r.event_id,
  profileId: r.profile_id,
  status: r.status ?? "going",
});

const mapEventLike = (r) => ({ id: r.id, eventId: r.event_id, profileId: r.profile_id });
const mapEventSave = (r) => ({ id: r.id, eventId: r.event_id, profileId: r.profile_id });
const mapHubLike = (r) => ({ id: r.id, hubId: r.hub_id, profileId: r.profile_id });
const mapHubFollow = (r) => ({ id: r.id, hubId: r.hub_id, profileId: r.profile_id });
const mapProfileFollow = (r) => ({ id: r.id, followerId: r.follower_id, followingId: r.following_id });
const mapProfileSub = (r) => ({ id: r.id, profileId: r.subscribed_to_id, subscriberId: r.subscriber_id });

const mapNotification = (r) => ({
  id: r.id,
  userId: r.user_id,
  type: r.type ?? "general",
  title: r.title,
  body: r.body ?? null,
  data: r.data ? JSON.stringify(r.data) : null,
  readAt: r.read_at ?? null,
});

const mapConversation = (r) => ({
  id: r.id,
  hubId: r.hub_id,
  memberId: r.member_id,
  lastMessageAt: r.last_message_at ?? r.created_at ?? null,
});

const mapMessage = (r) => ({
  id: r.id,
  conversationId: r.conversation_id,
  senderId: r.sender_id,
  body: r.body,
});

const mapTicketOrder = (r) => ({
  id: r.id,
  eventId: r.event_id ?? null,
  hubId: r.hub_id ?? null,
  buyerId: r.buyer_id ?? null,
  eventTitle: r.event_title ?? "",
  quantity: r.quantity ?? 0,
  unitAmount: r.unit_amount ?? 0,
  amountTotal: r.amount_total ?? null,
  currency: r.currency ?? "aud",
  status: r.status ?? "pending",
  customerEmail: r.customer_email ?? null,
  stripeCheckoutSessionId: r.stripe_checkout_session_id ?? null,
  stripePaymentIntentId: r.stripe_payment_intent_id ?? null,
  paidAt: r.paid_at ?? null,
  ticketTypeId: r.ticket_type_id ?? null,
  selectedDate: r.selected_date ?? null,
  seatNumbers: r.seat_numbers ?? null,
  lineItems: r.line_items ? JSON.stringify(r.line_items) : null,
});

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------
async function main() {
  log("\n🚀 CulturePass Supabase → DynamoDB migration");
  log(`   Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  log(`   Batch size: ${BATCH_SIZE}`);
  if (ONLY_TABLES) log(`   Tables: ${[...ONLY_TABLES].join(", ")}`);
  log("");

  const totals = { ok: 0, skip: 0, err: 0 };
  function tally(r) { totals.ok += r.ok; totals.skip += r.skip; totals.err += r.err; }

  // 1. AustralianState
  if (shouldRun("AustralianState")) {
    log("📍 AustralianState");
    const rows = await fetchAll("australian_states");
    tally(await batchWrite("AustralianState", rows, mapState));
  }

  // 2. AustralianCouncil
  if (shouldRun("AustralianCouncil")) {
    log("📍 AustralianCouncil");
    const rows = await fetchAll("australian_councils");
    tally(await batchWrite("AustralianCouncil", rows, mapCouncil));
  }

  // 3. Profile
  if (shouldRun("Profile")) {
    log("📍 Profile");
    const rows = await fetchAll("profiles");
    tally(await batchWrite("Profile", rows, mapProfile));
  }

  // 4. Hub
  if (shouldRun("Hub")) {
    log("📍 Hub");
    const rows = await fetchAll("hubs");
    tally(await batchWrite("Hub", rows, mapHub));
  }

  // 5. HubMember
  if (shouldRun("HubMember")) {
    log("📍 HubMember");
    const rows = await fetchAll("hub_members");
    tally(await batchWrite("HubMember", rows, mapHubMember));
  }

  // 6. Event
  if (shouldRun("Event")) {
    log("📍 Event");
    const rows = await fetchAll("events");
    tally(await batchWrite("Event", rows, mapEvent));
  }

  // 7. EventCohost
  if (shouldRun("EventCohost")) {
    log("📍 EventCohost");
    const rows = await fetchAll("event_cohosts");
    tally(await batchWrite("EventCohost", rows, mapEventCohost));
  }

  // 8. EventTicketType
  if (shouldRun("EventTicketType")) {
    log("📍 EventTicketType");
    const rows = await fetchAll("event_ticket_types");
    tally(await batchWrite("EventTicketType", rows, mapEventTicketType));
  }

  // 9. EventRsvp
  if (shouldRun("EventRsvp")) {
    log("📍 EventRsvp");
    const rows = await fetchAll("event_rsvps");
    tally(await batchWrite("EventRsvp", rows, mapEventRsvp));
  }

  // 10. EventLike
  if (shouldRun("EventLike")) {
    log("📍 EventLike");
    const rows = await fetchAll("event_likes");
    tally(await batchWrite("EventLike", rows, mapEventLike));
  }

  // 11. EventSave
  if (shouldRun("EventSave")) {
    log("📍 EventSave");
    const rows = await fetchAll("event_saves");
    tally(await batchWrite("EventSave", rows, mapEventSave));
  }

  // 12. HubLike
  if (shouldRun("HubLike")) {
    log("📍 HubLike");
    const rows = await fetchAll("hub_likes");
    tally(await batchWrite("HubLike", rows, mapHubLike));
  }

  // 13. HubFollow
  if (shouldRun("HubFollow")) {
    log("📍 HubFollow");
    const rows = await fetchAll("hub_follows");
    tally(await batchWrite("HubFollow", rows, mapHubFollow));
  }

  // 14. ProfileFollow
  if (shouldRun("ProfileFollow")) {
    log("📍 ProfileFollow");
    const rows = await fetchAll("profile_follows");
    tally(await batchWrite("ProfileFollow", rows, mapProfileFollow));
  }

  // 15. ProfileSubscription
  if (shouldRun("ProfileSubscription")) {
    log("📍 ProfileSubscription");
    const rows = await fetchAll("profile_subscriptions");
    tally(await batchWrite("ProfileSubscription", rows, mapProfileSub));
  }

  // 16. Notification
  if (shouldRun("Notification")) {
    log("📍 Notification");
    const rows = await fetchAll("notifications");
    tally(await batchWrite("Notification", rows, mapNotification));
  }

  // 17. Conversation
  if (shouldRun("Conversation")) {
    log("📍 Conversation");
    const rows = await fetchAll("conversations");
    tally(await batchWrite("Conversation", rows, mapConversation));
  }

  // 18. Message
  if (shouldRun("Message")) {
    log("📍 Message");
    const rows = await fetchAll("messages");
    tally(await batchWrite("Message", rows, mapMessage));
  }

  // 19. TicketOrder
  if (shouldRun("TicketOrder")) {
    log("📍 TicketOrder");
    const rows = await fetchAll("ticket_orders");
    tally(await batchWrite("TicketOrder", rows, mapTicketOrder));
  }

  log("\n✅ Migration complete");
  log(`   Written : ${totals.ok}`);
  log(`   Skipped : ${totals.skip}`);
  log(`   Errors  : ${totals.err}`);

  if (totals.err > 0) {
    log("\n   Some items failed. Re-run with TABLES=ModelName to retry specific tables.");
    log("   Or add SUPABASE_SERVICE_ROLE_KEY to .env for unrestricted Supabase access.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("✗ Migration failed:", e.message);
  process.exit(1);
});
