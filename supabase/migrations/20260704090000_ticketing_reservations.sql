-- =============================================================================
-- CulturePass Australia — Ticketing reservations, multi-type carts & seat holds
-- =============================================================================
-- Builds on 20260703090000_ticketing_upgrades.sql. Adds:
--   • ticket_orders.line_items  — the full per-type breakdown of one order
--   • create_pending_ticket_order() — atomic, server-side priced reservation
--     (the price source of truth; never trust client-sent amounts)
--   • get_taken_seats()         — privacy-safe occupancy for the seat chart
--   • a trigger that releases held capacity when an order is not fulfilled
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Per-order line-item breakdown. One ticket_orders row can now hold a mixed
-- cart, e.g. [{ ticket_type_id, name, unit_amount, quantity }].
-- Flat seat_numbers (added in the previous migration) stays the source for
-- occupancy queries; line_items carries the per-type pricing detail.
-- -----------------------------------------------------------------------------
alter table public.ticket_orders
  add column line_items jsonb not null default '[]'::jsonb;

-- -----------------------------------------------------------------------------
-- create_pending_ticket_order
-- Resolves prices from event_ticket_types, enforces per-type capacity and
-- (for assigned seating) seat availability, then inserts a `pending` order and
-- increments sold_count — all under one transaction serialised per event/date.
-- Returns the inserted row so the Edge Function can build trusted Stripe
-- line items from line_items.
-- -----------------------------------------------------------------------------
create function public.create_pending_ticket_order(
  p_event_id      uuid,
  p_buyer_id      uuid,
  p_selected_date date,
  p_items         jsonb,        -- [{ "ticket_type_id": uuid, "quantity": int }]
  p_seat_numbers  text[],
  p_customer_email text
)
returns public.ticket_orders
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_event      public.events;
  v_item       jsonb;
  v_type       public.event_ticket_types;
  v_qty        integer;
  v_total_qty  integer := 0;
  v_line_items jsonb := '[]'::jsonb;
  v_seat       text;
  v_taken      text[];
  v_order      public.ticket_orders;
begin
  -- Serialise concurrent reservations for the same event/date so capacity and
  -- seat checks below see a consistent view.
  perform pg_advisory_xact_lock(
    hashtextextended(p_event_id::text || coalesce(p_selected_date::text, ''), 0)
  );

  select * into v_event from public.events where id = p_event_id;
  if not found or v_event.status <> 'published' then
    raise exception 'EVENT_UNAVAILABLE';
  end if;

  -- When the event publishes a set of dates, the request must pick one of them.
  if array_length(v_event.event_dates, 1) is not null
     and (p_selected_date is null or not (p_selected_date = any (v_event.event_dates))) then
    raise exception 'INVALID_DATE';
  end if;

  -- Price and reserve each requested ticket type from the database.
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_qty := greatest(0, coalesce((v_item->>'quantity')::int, 0));
    if v_qty = 0 then
      continue;
    end if;

    select * into v_type
      from public.event_ticket_types
      where id = (v_item->>'ticket_type_id')::uuid
        and event_id = p_event_id
      for update;
    if not found then
      raise exception 'INVALID_TICKET_TYPE';
    end if;

    if v_type.capacity is not null and v_type.sold_count + v_qty > v_type.capacity then
      raise exception 'SOLD_OUT:%', v_type.name;
    end if;

    update public.event_ticket_types
      set sold_count = sold_count + v_qty
      where id = v_type.id;

    v_total_qty := v_total_qty + v_qty;
    v_line_items := v_line_items || jsonb_build_object(
      'ticket_type_id', v_type.id,
      'name',           v_type.name,
      'unit_amount',    v_type.price_cents,
      'quantity',       v_qty
    );
  end loop;

  if v_total_qty = 0 then
    raise exception 'NO_TICKETS';
  end if;

  -- Assigned seating: the chosen seats must match the ticket count and be free.
  if v_event.has_assigned_seating then
    if coalesce(array_length(p_seat_numbers, 1), 0) <> v_total_qty then
      raise exception 'SEAT_COUNT_MISMATCH';
    end if;

    select coalesce(array_agg(s), '{}') into v_taken
      from public.ticket_orders o, unnest(o.seat_numbers) as s
      where o.event_id = p_event_id
        and o.selected_date is not distinct from p_selected_date
        and o.status in ('pending', 'paid');

    foreach v_seat in array p_seat_numbers loop
      if v_seat = any (v_taken) then
        raise exception 'SEAT_TAKEN:%', v_seat;
      end if;
    end loop;
  end if;

  insert into public.ticket_orders (
    event_id, hub_id, buyer_id, event_title,
    quantity, unit_amount, currency, status, customer_email,
    selected_date, seat_numbers, line_items
  ) values (
    v_event.id, v_event.hub_id, p_buyer_id, coalesce(v_event.title, 'Event ticket'),
    v_total_qty,
    -- Convenience single-unit price only when the cart is one line item.
    case when jsonb_array_length(v_line_items) = 1
         then (v_line_items->0->>'unit_amount')::int
         else 0 end,
    'aud', 'pending', p_customer_email,
    p_selected_date,
    coalesce(p_seat_numbers, '{}'),
    v_line_items
  )
  returning * into v_order;

  return v_order;
end;
$$;

comment on function public.create_pending_ticket_order is
  'Atomically reserves capacity/seats and inserts a pending ticket_orders row with server-resolved prices. Called by the tickets-checkout Edge Function (service_role).';

-- -----------------------------------------------------------------------------
-- get_taken_seats — the union of seats already held/sold for an event + date.
-- security definer so buyers can render occupancy without read access to other
-- people's orders (it returns only seat labels, no buyer/PII).
-- -----------------------------------------------------------------------------
create function public.get_taken_seats(p_event_id uuid, p_selected_date date)
returns text[]
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(array_agg(distinct s), '{}')
  from public.ticket_orders o, unnest(o.seat_numbers) as s
  where o.event_id = p_event_id
    and o.selected_date is not distinct from p_selected_date
    and o.status in ('pending', 'paid');
$$;

comment on function public.get_taken_seats is
  'Privacy-safe seat occupancy for the booking UI: returns only the labels of seats already pending/paid for an event + date.';

grant execute on function public.get_taken_seats(uuid, date) to authenticated, anon;
-- create_pending_ticket_order is intentionally NOT granted to clients; only the
-- service_role (Edge Functions) calls it, so prices can never be forged.
revoke execute on function public.create_pending_ticket_order(uuid, uuid, date, jsonb, text[], text)
  from authenticated, anon, public;

-- -----------------------------------------------------------------------------
-- Release held capacity when an order fails to become paid (or is refunded).
-- create_pending_ticket_order increments sold_count up front (the hold); this
-- decrements it again when the order leaves the pending/paid path.
-- -----------------------------------------------------------------------------
create function private.release_ticket_holds()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_item jsonb;
begin
  if new.status in ('cancelled', 'failed', 'refunded')
     and old.status in ('pending', 'paid') then
    for v_item in select * from jsonb_array_elements(coalesce(new.line_items, '[]'::jsonb))
    loop
      update public.event_ticket_types
        set sold_count = greatest(0, sold_count - coalesce((v_item->>'quantity')::int, 0))
        where id = (v_item->>'ticket_type_id')::uuid;
    end loop;
  end if;
  return new;
end;
$$;

create trigger ticket_orders_release_holds
  after update of status on public.ticket_orders
  for each row execute function private.release_ticket_holds();
