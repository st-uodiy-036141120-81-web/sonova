-- Storage buckets for song/avatar uploads (run once in Supabase SQL Editor if uploads fail)

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('songs', 'songs', true)
on conflict (id) do update set public = true;

-- Policies: see supabase/storage_setup.sql (run that file in SQL Editor after this)
