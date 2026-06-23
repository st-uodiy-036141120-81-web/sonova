-- Stories: allow studio owners to post and delete their stories
-- Run in Supabase SQL Editor after migration_v5

drop policy if exists "stories insert own studio" on public.studio_stories;
create policy "stories insert own studio" on public.studio_stories
  for insert to authenticated
  with check (
    studio_id in (select id from public.studios where owner_id = auth.uid())
  );

drop policy if exists "stories delete own studio" on public.studio_stories;
create policy "stories delete own studio" on public.studio_stories
  for delete to authenticated
  using (
    studio_id in (select id from public.studios where owner_id = auth.uid())
  );

grant insert, delete on public.studio_stories to authenticated;
