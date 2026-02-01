-- Messaging System Migration
-- Run this in your Supabase SQL Editor

-- Conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(participant_a, participant_b)
);

-- Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

-- Indexes
create index if not exists idx_conv_participants on public.conversations(participant_a, participant_b);
create index if not exists idx_messages_conv on public.messages(conversation_id, created_at desc);

-- RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Drop existing policies if they exist (for re-running)
drop policy if exists "Users see own conversations" on public.conversations;
drop policy if exists "Users see conversation messages" on public.messages;
drop policy if exists "Users send messages" on public.messages;

-- Conversations policies
create policy "Users see own conversations" on public.conversations
  for select using (auth.uid() in (participant_a, participant_b));

-- Messages policies
create policy "Users see conversation messages" on public.messages
  for select using (
    exists (select 1 from conversations c
            where c.id = conversation_id
            and auth.uid() in (c.participant_a, c.participant_b))
  );

create policy "Users send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (select 1 from conversations c
            where c.id = conversation_id
            and auth.uid() in (c.participant_a, c.participant_b))
  );

-- Function to get/create conversation (only between friends)
create or replace function get_or_create_conversation(p_other_user uuid)
returns uuid language plpgsql security definer as $$
declare
  v_conv_id uuid;
  v_a uuid := least(auth.uid(), p_other_user);
  v_b uuid := greatest(auth.uid(), p_other_user);
begin
  -- Verify friendship
  if not exists (select 1 from friendships where user_a = v_a and user_b = v_b) then
    raise exception 'Not friends';
  end if;

  -- Find or create
  select id into v_conv_id from conversations
  where (participant_a = v_a and participant_b = v_b)
     or (participant_a = v_b and participant_b = v_a);

  if v_conv_id is null then
    insert into conversations (participant_a, participant_b)
    values (v_a, v_b) returning id into v_conv_id;
  end if;

  return v_conv_id;
end; $$;

-- Grant execute to authenticated users
grant execute on function get_or_create_conversation(uuid) to authenticated;

-- Enable realtime for messages (this allows real-time subscriptions)
alter publication supabase_realtime add table messages;
