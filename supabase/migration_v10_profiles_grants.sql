-- Fix "permission denied for table profiles" after migration_v9 column REVOKE.
-- Restores table-level SELECT; app uses explicit column list (PROFILE_SELECT).

grant select on table public.profiles to anon, authenticated;
grant insert, update on table public.profiles to authenticated;

-- Re-apply if policies were accidentally dropped
drop policy if exists "profiles read all" on public.profiles;
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles read admin" on public.profiles;

create policy "profiles read all" on public.profiles for select using (true);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

grant insert, update on table public.studios to authenticated;
drop policy if exists "studios insert own" on public.studios;
create policy "studios insert own" on public.studios for insert with check (auth.uid() = owner_id);
