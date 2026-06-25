# Database schema & security

PostgreSQL (Supabase) with PostGIS. Migrations live in `supabase/migrations/`
and run in order:

| Order | File | Contents |
|------|------|----------|
| 01 | `…_extensions_and_helpers.sql` | postgis, citext, pg_trgm; `private` schema; `set_updated_at`, `slugify`, `unaccent_fallback` |
| 02 | `…_reference_tables.sql` | `australian_states`, `australian_councils` + public-read RLS |
| 03 | `…_profiles.sql` | `profiles`, `current_profile_id()`, `handle_new_user` trigger, RLS |
| 04 | `…_hubs.sql` | `hubs`, `hub_members`, membership helpers, slug/owner triggers, RLS |
| 05 | `…_events.sql` | `events`, `event_rsvps`, rsvp-count trigger, RLS |

`supabase/seed.sql` (generated from `seed_sources/nsw_councils.csv`) loads the 8
states/territories and 128 NSW councils.

## Core tables

### `hubs` — organiser pages
The central entity: communities, councils, organisations, clubs, venues,
businesses, wellness. Key fields: `type` (enum), `name`, `slug` (auto-generated,
unique), `short_description`, `welcome_to_country`, `traditional_custodians[]`,
`indigenous_led`, `location_state` → `australian_states`, `location_council_id`
→ `australian_councils`, `coordinates` (geography), `verification_status`,
`status`. A DB CHECK requires a location + description before `status` can be
`published`, while drafts may be incomplete (so the wizard can auto-save).

### `profiles` — users + Professional Public Accounts
One row per `auth.users` (auto-created by the `handle_new_user` trigger). Becomes
a Professional Public Account when `is_public_professional = true`; a CHECK then
requires `professional_category`.

### `events`
Belong to a hub; write access mirrors hub-editor rights. `rsvp_count` is kept in
sync by a trigger over `event_rsvps`. A CHECK requires a title + start time
before publishing.

## Security model (RLS)

Every table in `public` has RLS enabled. The model is membership-driven:

- **Reference tables** — public `SELECT`, no client writes.
- **profiles** — public can read Professional Public Accounts; authenticated can
  read profiles; users can only insert/update their own (`user_id = auth.uid()`).
- **hubs / events** — published rows are world-readable; hub members see their
  drafts; only hub **editors** (owner/admin/editor) can write.
- **hub_members / event_rsvps** — scoped to membership / the acting user.

### Avoiding RLS recursion
Membership checks (`is_hub_member`, `is_hub_editor`, `current_profile_id`,
`event_hub_id`) live in the **`private`** schema as `SECURITY DEFINER` functions:

- `private` is **not** exposed via the Data API (not in `config.toml` schemas),
  so these are not callable REST endpoints — but they *are* usable inside RLS.
- DEFINER lets them read `hub_members` without re-triggering RLS (no recursion).
- Each is scoped to the **current user** (`auth.uid()`), so bypassing RLS can
  never leak another user's data.

### Other security choices
- All functions set `search_path = ''` and fully-qualify references.
- `UPDATE` policies include both `USING` and `WITH CHECK` to prevent row
  hand-off (e.g. reassigning `owner_id`).
- Policies target roles via `TO anon` / `TO authenticated` (not the deprecated
  `auth.role()`), combined with an ownership/membership predicate.
- `handle_new_user` has `EXECUTE` revoked from all client roles (trigger-only).
- Anonymous sign-ins are disabled; re-enabling them means re-auditing every
  `TO authenticated` policy.

## Cultural-data policy

`traditional_custodians` (on `australian_councils` and `hubs`) ships **empty by
design**. First Nations Country attributions must come from verified, properly
sourced data — they are never auto-generated, inferred from postcode, or guessed.
`welcome_to_country` is only ever content a hub has supplied and is authorised to
share.

## Applying & verifying

```bash
supabase start && supabase db reset      # apply migrations + seed
supabase db advisors                     # security/perf lints — fix before committing
npm run db:types                         # regenerate lib/supabase/database.types.ts
```

> Note: the hand-authored `lib/supabase/database.types.ts` mirrors these
> migrations so the app typechecks before a database exists. Replace it with the
> generated output once a project is linked.
