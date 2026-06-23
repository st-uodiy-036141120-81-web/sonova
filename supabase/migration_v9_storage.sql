-- Scoped storage policies (run after storage_setup.sql)

drop policy if exists "avatars auth upload" on storage.objects;
drop policy if exists "avatars auth update" on storage.objects;
drop policy if exists "avatars auth delete" on storage.objects;
drop policy if exists "songs auth upload" on storage.objects;
drop policy if exists "songs auth update" on storage.objects;
drop policy if exists "songs auth delete" on storage.objects;

create policy "avatars auth upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars auth update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars auth delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "songs auth upload" on storage.objects
  for insert with check (
    bucket_id = 'songs'
    and auth.role() = 'authenticated'
    and (
      exists (
        select 1 from public.studios s
        where s.id::text = (storage.foldername(name))[1]
          and s.owner_id = auth.uid()
      )
      or (
        (storage.foldername(name))[1] = 'comments'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      or (
        (storage.foldername(name))[1] = 'voice'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "songs auth update" on storage.objects
  for update using (
    bucket_id = 'songs'
    and auth.role() = 'authenticated'
    and (
      exists (
        select 1 from public.studios s
        where s.id::text = (storage.foldername(name))[1]
          and s.owner_id = auth.uid()
      )
      or (
        (storage.foldername(name))[1] = 'comments'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      or (
        (storage.foldername(name))[1] = 'voice'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "songs auth delete" on storage.objects
  for delete using (
    bucket_id = 'songs'
    and auth.role() = 'authenticated'
    and (
      exists (
        select 1 from public.studios s
        where s.id::text = (storage.foldername(name))[1]
          and s.owner_id = auth.uid()
      )
      or (
        (storage.foldername(name))[1] = 'comments'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      or (
        (storage.foldername(name))[1] = 'voice'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );
