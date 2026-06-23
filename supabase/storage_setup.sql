-- Run after full_setup.sql — Storage buckets + policies for Sonova

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('songs', 'songs', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "songs public read" on storage.objects;
drop policy if exists "avatars auth upload" on storage.objects;
drop policy if exists "avatars auth update" on storage.objects;
drop policy if exists "songs auth upload" on storage.objects;
drop policy if exists "songs auth update" on storage.objects;
drop policy if exists "avatars auth delete" on storage.objects;
drop policy if exists "songs auth delete" on storage.objects;

create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "songs public read" on storage.objects
  for select using (bucket_id = 'songs');

create policy "avatars auth upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "avatars auth update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "avatars auth delete" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "songs auth upload" on storage.objects
  for insert with check (bucket_id = 'songs' and auth.role() = 'authenticated');

create policy "songs auth update" on storage.objects
  for update using (bucket_id = 'songs' and auth.role() = 'authenticated');

create policy "songs auth delete" on storage.objects
  for delete using (bucket_id = 'songs' and auth.role() = 'authenticated');
