-- =============================================================================
-- CulturePass Australia — Multi-Date, Multi-Type Ticketing & Seating Charts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- event_ticket_types
-- -----------------------------------------------------------------------------
create table public.event_ticket_types (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  name         text not null,                -- e.g., 'VIP Circle', 'General Admission'
  price_cents  integer not null check (price_cents >= 0),
  capacity     integer check (capacity > 0), -- null means unlimited
  sold_count   integer not null default 0 check (sold_count >= 0),
  description  text,
  created_at   timestamptz not null default now()
);

-- RLS & Policies
alter table public.event_ticket_types enable row level security;

create policy "Allow public read on event_ticket_types"
  on public.event_ticket_types for select
  using (true);

create policy "Allow hosts insert on event_ticket_types"
  on public.event_ticket_types for insert
  with check (private.is_hub_editor(private.event_hub_id(event_id)));

create policy "Allow hosts update on event_ticket_types"
  on public.event_ticket_types for update
  using (private.is_hub_editor(private.event_hub_id(event_id)))
  with check (private.is_hub_editor(private.event_hub_id(event_id)));

create policy "Allow hosts delete on event_ticket_types"
  on public.event_ticket_types for delete
  using (private.is_hub_editor(private.event_hub_id(event_id)));

-- Indexes
create index event_ticket_types_event_idx on public.event_ticket_types (event_id);

-- -----------------------------------------------------------------------------
-- Upgrade public.events
-- -----------------------------------------------------------------------------
alter table public.events
  add column event_dates date[] default '{}',
  add column has_assigned_seating boolean default false,
  add column seating_layout jsonb,
  add column venue_map_url text;

-- -----------------------------------------------------------------------------
-- Upgrade public.ticket_orders
-- -----------------------------------------------------------------------------
alter table public.ticket_orders
  add column ticket_type_id uuid references public.event_ticket_types (id) on delete set null,
  add column selected_date date,
  add column seat_numbers text[] default '{}';

create index ticket_orders_type_idx on public.ticket_orders (ticket_type_id);
