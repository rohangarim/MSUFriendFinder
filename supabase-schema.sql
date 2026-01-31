-- MSU Friend Finder Database Schema
-- Run this in your Supabase SQL Editor

-- 1) Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text not null,
  username text unique,
  pronouns text,
  major text,
  year text check (year in ('Freshman','Sophomore','Junior','Senior','Grad','Other')),
  bio text,
  interests text[] default '{}',
  looking_for text[] default '{}',
  campus_area text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index profiles_interests_gin on public.profiles using gin (interests);
create index profiles_looking_for_gin on public.profiles using gin (looking_for);

-- 2) Friend request status enum
create type friend_request_status as enum ('pending','accepted','declined','canceled');

-- 3) Friend requests table
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  status friend_request_status not null default 'pending',
  note text,
  created_at timestamptz default now(),
  responded_at timestamptz,
  unique(from_user, to_user)
);

create index fr_to_user_status on public.friend_requests(to_user, status);
create index fr_from_user_status on public.friend_requests(from_user, status);

-- 4) Friendships table (materialized relationship)
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_a, user_b)
);

-- 5) Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

-- 6) Profiles policies
create policy "profiles_select_all_authed"
on public.profiles for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 7) Friend requests policies
create policy "fr_insert_own"
on public.friend_requests for insert
to authenticated
with check (auth.uid() = from_user);

create policy "fr_select_involving_me"
on public.friend_requests for select
to authenticated
using (auth.uid() = from_user or auth.uid() = to_user);

create policy "fr_update_recipient_or_sender"
on public.friend_requests for update
to authenticated
using (auth.uid() = to_user or auth.uid() = from_user)
with check (auth.uid() = to_user or auth.uid() = from_user);

-- 8) Friendships policies
create policy "friends_select_involving_me"
on public.friendships for select
to authenticated
using (auth.uid() = user_a or auth.uid() = user_b);

-- 9) RPC function to accept friend request
create or replace function public.accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_from uuid;
  v_to uuid;
  a uuid;
  b uuid;
begin
  select from_user, to_user into v_from, v_to
  from public.friend_requests
  where id = p_request_id and status = 'pending';

  if v_to is null then
    raise exception 'Request not found or not pending';
  end if;

  if auth.uid() <> v_to then
    raise exception 'Not authorized';
  end if;

  update public.friend_requests
  set status = 'accepted', responded_at = now()
  where id = p_request_id;

  a := least(v_from, v_to);
  b := greatest(v_from, v_to);

  insert into public.friendships(user_a, user_b)
  values (a, b)
  on conflict do nothing;
end;
$$;

revoke all on function public.accept_friend_request(uuid) from public;
grant execute on function public.accept_friend_request(uuid) to authenticated;

-- 10) Function to decline friend request
create or replace function public.decline_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.friend_requests
  set status = 'declined', responded_at = now()
  where id = p_request_id
    and to_user = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Request not found or not authorized';
  end if;
end;
$$;

revoke all on function public.decline_friend_request(uuid) from public;
grant execute on function public.decline_friend_request(uuid) to authenticated;

-- 11) Function to update profile updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_update
  before update on public.profiles
  for each row
  execute procedure public.handle_updated_at();

-- 12) Storage bucket for avatars (run this separately in Storage section or via API)
-- Create a bucket named 'avatars' with public access

-- Storage policies (add these in the Supabase dashboard under Storage > Policies):
-- Policy 1: Allow authenticated users to upload their own avatar
--   bucket_id = 'avatars'
--   operation = INSERT
--   policy: (auth.uid()::text = (storage.foldername(name))[1])

-- Policy 2: Allow public read access to avatars
--   bucket_id = 'avatars'
--   operation = SELECT
--   policy: true

-- Policy 3: Allow users to update/delete their own avatar
--   bucket_id = 'avatars'
--   operation = UPDATE, DELETE
--   policy: (auth.uid()::text = (storage.foldername(name))[1])

-- Optional: SQL you can run to create the storage policies directly
-- (Requires that the 'avatars' bucket already exists)
-- 1) Insert (upload) own avatar
create policy "avatars_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 2) Public read
create policy "avatars_select_public"
on storage.objects for select
to public
using (bucket_id = 'avatars');

-- 3) Update own avatar
create policy "avatars_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 4) Delete own avatar
create policy "avatars_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
