# Stripe ticketing

Paid event tickets are sold with **Stripe Checkout**, driven entirely server‑side
so the secret key never reaches the app. It works the same on web, iOS and
Android (no native Stripe module / dev build required).

## Pieces

| Piece | Where | Role |
| --- | --- | --- |
| `ticket_orders` table | `supabase/migrations/20260626044154_ticket_orders.sql` | One row per purchase. Written **only** by Edge Functions (service role); clients can read their own. |
| `tickets-checkout` | `supabase/functions/tickets-checkout/` | Auth’d buyer → validates the event server‑side, creates a `pending` order + a Stripe Checkout Session, returns its URL. |
| `stripe-webhook` | `supabase/functions/stripe-webhook/` | **Source of truth.** Verifies the Stripe signature and flips the order to `paid` on `checkout.session.completed`. |
| `features/tickets/api.ts` | client | `useBuyTicket()` (invokes the function + opens the URL), `useMyTickets()`, `useTicketBySession()`. |
| `/event/[id]` | client | Shows **Buy ticket · $X** when the event is paid and has no external `ticket_url`. |
| `/tickets`, `/tickets/success`, `/tickets/cancel` | client | My tickets list + post‑checkout return screens. |

The price is **always** read from the database in the function — the client only
sends `eventId` + `quantity`, so a tampered price can’t be charged. Fulfilment is
driven by the webhook, never the browser success redirect.

## One‑time setup

1. **Get keys** from the [Stripe dashboard](https://dashboard.stripe.com/apikeys)
   (use **test mode** first): the secret key `sk_test_…`.

2. **Set Edge Function secrets** (do *not* put these in `.env` / `EXPO_PUBLIC_`):

   ```bash
   supabase secrets set \
     STRIPE_SECRET_KEY=sk_test_xxx \
     SITE_URL=http://localhost:8081
   # STRIPE_WEBHOOK_SECRET is added in step 4
   ```

   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected
   automatically. `SITE_URL` is the base Stripe redirects back to — set it to
   your deployed web URL in production.

3. **Apply the migration & deploy the functions:**

   ```bash
   supabase db push                       # or `supabase db reset` locally
   supabase functions deploy tickets-checkout
   supabase functions deploy stripe-webhook
   ```

4. **Create the webhook endpoint** in Stripe → Developers → Webhooks, pointing at:

   ```
   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
   ```

   Subscribe to `checkout.session.completed`, `checkout.session.expired`,
   `charge.refunded`. Copy the signing secret (`whsec_…`) and set it:

   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

## Local testing

```bash
supabase start
supabase functions serve            # serves both functions
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
# use the whsec_ it prints as STRIPE_WEBHOOK_SECRET for local runs
```

Use Stripe test card `4242 4242 4242 4242`, any future expiry/CVC.

## Notes & next steps

- Capacity is enforced best‑effort (counts paid quantities at checkout). For
  high‑contention sales add a DB reservation/locking step.
- Native return UX: after paying in the browser the user taps back to the app.
  For a seamless return, add `expo-web-browser` + a deep‑link `SITE_URL`.
- Refunds: issue from the Stripe dashboard; the `charge.refunded` handler marks
  the order `refunded`.
