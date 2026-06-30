# CulturePass Australia

A minimalist, Swiss-design cultural platform for Australia — discover, create and
connect through cultural experiences across states, cities and councils, with
First Nations voices and Welcome to Country at the centre. **Unity in diversity.**

Built with **Expo (React Native + Web)**, **Supabase**, **TanStack Query**,
**Zustand**, **Zod** and **NativeWind**. Verified on **Expo SDK 53**
(`expo-doctor`: 18/18, `tsc --noEmit`: clean).

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # then fill in your Supabase URL + anon key

# 3. Start the Supabase stack (requires the Supabase CLI + Docker)
supabase start             # local Postgres, Auth, Storage, Studio
supabase db reset          # applies migrations + seed (states & NSW councils)

# 4. Run the app
npm run web                # or: npm run ios / npm run android
```

Regenerate DB types after schema changes:

```bash
npm run db:types           # supabase gen types typescript --local > lib/supabase/database.types.ts
```

---

## Project structure

```
app/                      # expo-router routes (file-based)
  _layout.tsx             # providers, fonts, root stack
  index.tsx               # personalized discovery home — search, filters, featured events + hubs
  explore/index.tsx       # hub/event discovery with filters
  calendar/index.tsx      # month view + upcoming event list
  state/[code].tsx        # hubs by state/territory
  hub/[slug].tsx          # hub profile page (prominent Welcome to Country)
  event/[id].tsx          # event detail + tickets/share/save
  messages/               # authenticated chat inbox + thread
  notifications/          # authenticated notification centre
  tickets/                # authenticated ticket wallet + checkout result routes
  settings/               # account, privacy, notifications, about
  onboarding/             # interest/location preference setup
  create/
    index.tsx             # chooser: Hub vs Professional Profile
    hub.tsx               # 5-step hub creation wizard (auto-saving draft)
    event.tsx             # event creation flow
    professional.tsx      # Professional Public Profile form

components/
  ui/                     # design-system primitives (Text, Button, Card, …)
  cultural/               # AcknowledgementBar, WelcomeToCountry, IndigenousLedBadge

features/
  auth/                   # session + current profile helpers
  reference/              # states & councils queries
  hubs/                   # hub queries, mutations, HubCard, draft store
  profiles/               # profile mutations

lib/
  constants.ts            # controlled vocabularies + labels (single source of truth)
  navigation.ts           # shared app map for top nav, mobile tabs and footer
  theme.ts                # raw JS design tokens (mirror of tailwind.config.js)
  query.ts                # TanStack Query client + query keys
  storage.ts              # cross-platform KV (wizard drafts)
  supabase/               # client + database.types.ts
  validation/             # Zod schemas (draft + publish per entity)

supabase/
  config.toml             # local stack config
  migrations/             # ordered SQL: extensions → reference → profiles → hubs → events
  seed.sql                # generated: 8 states + 128 NSW councils
  seed_sources/           # source CSV for the seed generator
```

## Design system

Tokens live in [tailwind.config.js](tailwind.config.js) (mirrored in
[lib/theme.ts](lib/theme.ts)). The palette is warm and restrained — cream paper,
ochre, eucalyptus green, soft terracotta — with a tight Swiss type scale set in
Inter (`font-sans` / `font-ui` / `font-heading` / `font-display` map to specific
static faces to avoid clashing with Tailwind's weight utilities). First Nations
flag colours (`country.*`) are reserved strictly for sanctioned cultural
surfaces, never decoration.

## Data model

Three core tables — `hubs` (organiser pages), `profiles` (users + Professional
Public Accounts) and `events` — plus reference tables (`australian_states`,
`australian_councils`) and supporting tables (`hub_members`, `event_rsvps`).
See [docs/SCHEMA.md](docs/SCHEMA.md) for the full model and security design.

## Payments

Paid event tickets are sold with Stripe Checkout, driven entirely from Supabase
Edge Functions so the secret key never reaches the app. Price is always read
from the database, and fulfilment is webhook-driven (not the success redirect).
See [docs/STRIPE_TICKETING.md](docs/STRIPE_TICKETING.md) for the architecture
and one-time setup (Stripe keys, Edge Function secrets, migration, deploy and
webhook registration).

## Cultural respect

- **Acknowledgement of Country** is shown app-wide.
- **Welcome to Country** is presented prominently on hub pages, and is only ever
  content a hub has supplied and is authorised to share.
- **Traditional Custodian** attributions are never auto-generated or guessed —
  the `traditional_custodians` columns ship empty, to be populated only from
  verified, properly-sourced First Nations data.

## Status

Backend schema + seed, design system, auth, discovery, calendar, hub/event
profiles, creation flows, messaging, notifications, tickets, onboarding and
settings are in place. The app shell shares one navigation map via
[lib/navigation.ts](lib/navigation.ts) so the top bar, mobile tabs and footer
stay aligned as routes evolve.
