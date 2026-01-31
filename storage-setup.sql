-- MSU Friend Finder Storage Setup
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/serzynsvkvzmrxesrcnl/sql)

-- 1) Create the 'avatars' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2) Set up policies
-- Enable RLS on storage.objects (if not already enabled)
alter table storage.objects enable row level security;

-- 2.1) Public read access
create policy "avatars_select_public"
on storage.objects for select
to public
using (bucket_id = 'avatars');

-- 2.2) Authenticated upload (own folder)
-- Allows users to upload to a folder named with their own ID
create policy "avatars_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 2.3) Authenticated update own folder
create policy "avatars_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 2.4) Authenticated delete own folder
create policy "avatars_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
