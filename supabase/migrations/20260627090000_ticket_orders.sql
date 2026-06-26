-- =============================================================================
-- CulturePass Australia — Ticket orders (Stripe Checkout)
-- =============================================================================
-- Paid event tickets are sold through Stripe Checkout. An order row is created
-- with status 'pending' by the `tickets-checkout` Edge Function when a buyer
-- starts checkout, then flipped to 'paid' by the `stripe-webhook` function on
-- `checkout.session.completed`.
--
-- Both Edge Functions use the service_role key and therefore BYPASS RLS, so the
-- policies below only grant READ access. There is deliberately no INSERT /
-- UPDATE / DELETE policy: a client must never be able to forge a 'paid' order.
-- =============================================================================

create type public.ticket_order_status as enum (
  'pending', 'paid', 'failed', 'refunded', 'cancelled'
);

create table public.ticket_orders (
  id                          uuid primary key default gen_random_uuid(),

  -- event/hub are nullable with ON DELETE SET NULL so the financial record
  -- survives the deletion of its event or hub.
  event_id                    uuid references public.events (id) on delete set null,
  hub_id                      uuid references public.hubs (id) on delete set null,
  buyer_id                    uuid references public.profiles (id) on delete set null,

  -- Snapshot kept for record-keeping if the event is later edited or removed.
  event_title                 text not null default '',

  quantity                    integer not null default 1 check (quantity > 0),
  unit_amount                 integer not null check (unit_amount >= 0),  -- minor units (cents)
  amount_total                integer check (amount_total >= 0),          -- minor units, set from Stripe
  currency                    text not null default 'aud',

  status                      public.ticket_order_status not null default 'pending',
  customer_email              text,

  stripe_checkout_session_id  text unique,
  stripe_payment_intent_id    text,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  paid_at                     timestamptz
);

comment on table public.ticket_orders is
  'Stripe ticket purchases. Written only by Edge Functions (service_role); clients read their own.';

create index ticket_orders_buyer_idx  on public.ticket_orders (buyer_id);
create index ticket_orders_event_idx  on public.ticket_orders (event_id);
create index ticket_orders_hub_idx    on public.ticket_orders (hub_id);
create index ticket_orders_status_idx on public.ticket_orders (status);

create trigger ticket_orders_set_updated_at
  before update on public.ticket_orders
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.ticket_orders enable row level security;

-- Buyers can read their own orders.
create policy "Buyers can view their own orders"
  on public.ticket_orders for select
  to authenticated
  using (buyer_id = private.current_profile_id());

-- Hub editors can read orders for their hub's events (a basic sales view).
create policy "Hub editors can view orders for their hub"
  on public.ticket_orders for select
  to authenticated
  using (hub_id is not null and private.is_hub_editor(hub_id));

-- No INSERT / UPDATE / DELETE policies on purpose: order writes happen only in
-- Edge Functions using the service_role key (which bypasses RLS).
