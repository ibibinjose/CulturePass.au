-- =============================================================================
-- CulturePass Australia — Secure Notifications for Encrypted Messages
-- =============================================================================

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
      case 
        when left(NEW.body, 4) = 'enc:' then 'Tap to view conversation.'
        else left(NEW.body, 140)
      end,
      jsonb_build_object('conversation_id', conv.id, 'hub_id', conv.hub_id, 'hub_name', hub_name)
    );
  end if;

  return NEW;
end;
$$;
