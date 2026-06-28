-- =============================================================================
-- CulturePass Australia — Chat (member ↔ hub organiser)
-- =============================================================================
-- A conversation is between a member (the person reaching out) and a hub. Either
-- side — the member, or any editor/owner of the hub — can read it and post
-- messages. A member starts the conversation; the hub answers from its editors.
-- A new message bumps the conversation and notifies the other party.
-- =============================================================================

create table public.conversations (
  id               uuid primary key default gen_random_uuid(),
  hub_id           uuid not null references public.hubs (id) on delete cascade,
  member_id        uuid not null references public.profiles (id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  unique (hub_id, member_id)
);

comment on table public.conversations is
  'A 1:1 thread between a member and a hub. Participants: the member, or any editor of the hub.';

create index conversations_member_idx on public.conversations (member_id, last_message_at desc);
create index conversations_hub_idx    on public.conversations (hub_id, last_message_at desc);

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null check (char_length(body) between 1 and 4000),
  created_at       timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- -----------------------------------------------------------------------------
-- Helper: is the caller a participant of a conversation?
-- (the member, or an editor of the hub). SECURITY DEFINER so it can read the
-- conversation row regardless of the messages-table RLS context.
-- -----------------------------------------------------------------------------
create or replace function private.is_conversation_participant(conv uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = conv
      and (c.member_id = private.current_profile_id() or private.is_hub_editor(c.hub_id))
  );
$$;
grant execute on function private.is_conversation_participant(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- conversations
create policy "Participants read conversations"
  on public.conversations for select
  to authenticated
  using (member_id = private.current_profile_id() or private.is_hub_editor(hub_id));

create policy "Members start conversations"
  on public.conversations for insert
  to authenticated
  with check (member_id = private.current_profile_id());

create policy "Participants touch conversations"
  on public.conversations for update
  to authenticated
  using (member_id = private.current_profile_id() or private.is_hub_editor(hub_id))
  with check (member_id = private.current_profile_id() or private.is_hub_editor(hub_id));

-- messages
create policy "Participants read messages"
  on public.messages for select
  to authenticated
  using (private.is_conversation_participant(conversation_id));

create policy "Participants send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = private.current_profile_id()
    and private.is_conversation_participant(conversation_id)
  );

-- -----------------------------------------------------------------------------
-- Trigger: on a new message, bump the conversation and notify the other party.
-- -----------------------------------------------------------------------------
create or replace function private.on_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conv         public.conversations;
  hub_name     text;
  hub_owner    uuid;
  recipient    uuid;
  sender_name  text;
begin
  select * into conv from public.conversations where id = NEW.conversation_id;

  update public.conversations
    set last_message_at = NEW.created_at
    where id = NEW.conversation_id;

  select name, owner_id into hub_name, hub_owner from public.hubs where id = conv.hub_id;
  select coalesce(nullif(full_name, ''), 'Someone') into sender_name
    from public.profiles where id = NEW.sender_id;

  -- The recipient is the other side of the thread.
  if NEW.sender_id = conv.member_id then
    recipient := hub_owner;          -- member → notify the hub owner
  else
    recipient := conv.member_id;     -- hub → notify the member
  end if;

  if recipient is not null and recipient <> NEW.sender_id then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      recipient,
      'message',
      sender_name || ' sent you a message',
      left(NEW.body, 140),
      jsonb_build_object('conversation_id', conv.id, 'hub_id', conv.hub_id, 'hub_name', hub_name)
    );
  end if;

  return NEW;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function private.on_new_message();

-- -----------------------------------------------------------------------------
-- Realtime — live message threads + inbox ordering.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
