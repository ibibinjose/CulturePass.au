# CulturePass Australia

A minimalist, Swiss-design cultural platform for Australia — discover, create and
connect through cultural experiences across states, cities and councils, with
First Nations voices and Welcome to Country at the centre. **Unity in diversity.**

Built with **Expo (React Native + Web, SDK ~53)**, **AWS Amplify Gen 2** (Cognito + AppSync/DynamoDB + S3 + Lambda), **TanStack Query 5**, **Zustand 5**, **Zod 3** and **NativeWind 4**. One codebase for web, iOS and Android.

The production backend is **exclusively AWS** — Supabase has been fully removed (only `lib/types/database.types.ts` is kept for TypeScript row shapes used by the mappers).

---

## Getting started (AWS Amplify Gen 2)

```bash
# 1. Install dependencies
npm install

# 2. Deploy a personal Amplify sandbox (Cognito, AppSync, DynamoDB, S3, Lambdas)
AWS_PROFILE=your-profile npx ampx sandbox

# 3. Wire .env from the generated outputs
cp .env.example .env
node scripts/aws-env-from-outputs.mjs

# 4. Run the app
npm run web                # primary dev target (or npm run ios / npm run android)
```

The sandbox writes `amplify_outputs.json`. The script above copies the needed `EXPO_PUBLIC_*` values. Leave `ampx sandbox` running for hot-reload of backend changes.

---

## Project structure (high level)

```
app/           # expo-router file-based routes (screens + layouts)
amplify/       # AWS Amplify Gen 2 backend (auth, data schema, storage, functions)
components/    # ui/ primitives + cultural/ (Acknowledgement, WelcomeToCountry, badges)
features/      # domain data layers (hubs/, events/, auth/, chat/, weather/, tickets/ ...)
lib/           # aws/, backend.ts (pinned "aws"), constants, navigation, theme, validation, query
scripts/       # aws-env-from-outputs, migrate-*, data extraction, backup
assets/
```

See [project-structure.mdx](project-structure.mdx) and [Assistant.md](Assistant.md) for the detailed tour. The entire backend is defined in TypeScript under `amplify/`. `npx ampx sandbox` (dev) or pipeline-deploy (prod) provisions it.

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

Paid event tickets use **Stripe Checkout** entirely server-side via AWS Lambda
(`amplify/functions/tickets-checkout` and `stripe-webhook`). The secret never reaches the client. Fulfilment is driven by the webhook (not the browser redirect). See [docs/STRIPE_TICKETING.md](docs/STRIPE_TICKETING.md) (and the duplicate in `payments/`) for details. Secrets are set with `npx ampx sandbox secret set`.

## Cultural respect

- **Acknowledgement of Country** is app-wide.
- **Welcome to Country** is prominent on hub pages (only hub-supplied, authorised content).
- Traditional Custodian data is never auto-generated.

## Recent / notable surfaces

- Hub covers show local time + free Open-Meteo weather/wind/pollution/surf (drives the logo pinwheel spin on home).
- Glassmorphic name + data overlays on covers.
- Rebuilt settings (pre/post auth, nudges), messages (realtime + soft auth), homepage stats and search.

## Verification gates

Before considering any change done:

```bash
npm run typecheck
npm run lint
npm run test
```

See [CLAUDE.md](CLAUDE.md) and [Assistant.md](Assistant.md) for the full contributor brief, gotchas, and "definition of done".
