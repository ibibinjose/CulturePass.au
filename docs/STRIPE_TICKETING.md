# Stripe ticketing

Paid event tickets are sold with **Stripe Checkout**, driven entirely server‑side
so the secret key never reaches the app. It works the same on web, iOS and
Android (no native Stripe module / dev build required).

## Pieces (AWS Amplify Gen 2)

| Piece | Where | Role |
| --- | --- | --- |
| `TicketOrder` model | `amplify/data/resource.ts` | One row per purchase (DynamoDB via AppSync). Written only by Lambdas. |
| `tickets-checkout` | `amplify/functions/tickets-checkout/` | AppSync mutation handler. Auth’d buyer calls `ticketsCheckout`; Lambda validates, creates `pending` order + Stripe Checkout Session. |
| `stripe-webhook` | `amplify/functions/stripe-webhook/` (public Function URL) | **Source of truth.** Verifies signature, marks orders `paid` / `cancelled` / `refunded`. |
| `features/tickets/api.ts` | client | `useBuyTicket()` etc. (calls the AppSync mutation). |
| `/event/[id]`, `/tickets/*` | client | Buy button + wallet + success/cancel return screens. |

The price is **always** read from the database in the function — the client only
sends `eventId` + `quantity`, so a tampered price can’t be charged. Fulfilment is
driven by the webhook, never the browser success redirect.

## One-time setup (AWS)

1. Get Stripe test keys (`sk_test_…` and later the webhook signing secret).

2. In a running `npx ampx sandbox` (or via Amplify Console for branches):

   ```bash
   npx ampx sandbox secret set STRIPE_SECRET_KEY
   npx ampx sandbox secret set STRIPE_WEBHOOK_SECRET
   ```

3. The `tickets-checkout` and `stripe-webhook` Lambdas are part of the Amplify backend and deploy automatically.

4. For the webhook, Amplify exposes it via a public Function URL (see `amplify_outputs.json` or the sandbox output). Configure that URL in the Stripe dashboard for the `checkout.session.completed` (and related) events.

`SITE_URL` (for redirect URLs) is typically configured inside the Lambda or via environment in the function definition. See the handler code for current values.

## Local testing

```bash
# (historical reference removed — see current Amplify Lambda setup above)
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
