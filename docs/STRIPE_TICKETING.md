# Stripe ticketing

Paid event tickets are sold with **Stripe Checkout**, driven entirely server‑side
so the secret key never reaches the app. It works the same on web, iOS and
Android (no native Stripe module / dev build required).

## Pieces

| Piece | Where | Role |
| --- | --- | --- |
| `ticket_orders` table | `supabase/migrations/20260627090000_ticket_orders.sql` | One row per purchase. Written **only** by Edge Functions (service role); clients can read their own. |
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

## Multi‑type carts, dates & assigned seating

Events can define tiered tickets in `event_ticket_types` and (optionally)
multiple show dates (`events.event_dates`) and assigned seating
(`events.has_assigned_seating` + `seating_layout`). The buyer picks a date, a
mix of ticket types, and — for seated events — specific seats in
`TicketBookingModal`.

When a cart has ticket types, `tickets-checkout` calls the
`create_pending_ticket_order` RPC, which (under a per‑event/date advisory lock):
resolves each line's price from `event_ticket_types`, enforces per‑type
capacity, rejects already‑held/sold seats, inserts the `pending` order with the
full `line_items` breakdown, and increments `sold_count` (the **hold**). Stripe
then gets one session with **one line item per ticket type**. Sessions are
created with `expires_at` = +30 min; on `checkout.session.expired` (or refund)
the `ticket_orders_release_holds` trigger gives the held `sold_count` back.
Events with no ticket types still use the legacy single‑price path
(`events.price`). The seat chart reads occupancy via the privacy‑safe
`get_taken_seats` RPC (seat labels only, no buyer data).

## Notes & next steps

- Tiered events now reserve capacity/seats atomically (see above). The legacy
  single‑price path remains best‑effort (counts paid quantities at checkout).
- Native return UX: after paying in the browser the user taps back to the app.
  For a seamless return, add `expo-web-browser` + a deep‑link `SITE_URL`.
- Refunds: issue from the Stripe dashboard; the `charge.refunded` handler marks
  the order `refunded`.
