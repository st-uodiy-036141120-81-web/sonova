-- Complete fix for "permission denied for table profiles"
-- Run this entire file in Supabase SQL Editor.

-- 1) Reset table + column grants (v9 column REVOKE breaks PostgREST)
revoke all on table public.profiles from anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant insert, update, delete on table public.profiles to authenticated;

grant select on table public.studios to anon, authenticated;
grant insert, update, delete on table public.studios to authenticated;

-- 2) RLS policies
alter table public.profiles enable row level security;
alter table public.studios enable row level security;

drop policy if exists "profiles read all" on public.profiles;
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles read admin" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;

create policy "profiles read all" on public.profiles for select using (true);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "studios read all" on public.studios;
drop policy if exists "studios insert own" on public.studios;
drop policy if exists "studios update own" on public.studios;

create policy "studios read all" on public.studios for select using (true);
create policy "studios insert own" on public.studios for insert with check (auth.uid() = owner_id);
create policy "studios update own" on public.studios for update using (auth.uid() = owner_id);

-- 3) Onboarding RPC — works even if client grants regress again
create or replace function public.upsert_own_profile(
  p_username text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := coalesce(nullif(trim(p_display_name), ''), trim(p_username));
  v_row public.profiles;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if trim(p_username) !~ '^[a-zA-Z0-9]{1,7}$' then
    raise exception 'Invalid username';
  end if;
  if exists (
    select 1 from public.profiles
    where username = trim(p_username) and id <> v_uid
  ) then
    raise exception 'USERNAME_TAKEN';
  end if;

  insert into public.profiles (id, username, display_name)
  values (v_uid, trim(p_username), v_name)
  on conflict (id) do update
    set username = excluded.username,
        display_name = excluded.display_name
  returning * into v_row;

  insert into public.studios (owner_id, name, description)
  values (v_uid, v_name || '''s Studio', '')
  on conflict (owner_id) do nothing;

  return jsonb_build_object(
    'id', v_row.id,
    'username', v_row.username,
    'display_name', v_row.display_name,
    'bio', v_row.bio,
    'avatar_url', v_row.avatar_url,
    'created_at', v_row.created_at,
    'taste_tags', coalesce(v_row.taste_tags, '{}'::text[]),
    'trust_score', coalesce(v_row.trust_score, 0),
    'referral_code', v_row.referral_code,
    'verified', coalesce(v_row.verified, false),
    'is_admin', coalesce(v_row.is_admin, false),
    'totp_enabled', coalesce(v_row.totp_enabled, false),
    'settings', coalesce(v_row.settings, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.upsert_own_profile(text, text) from public;
grant execute on function public.upsert_own_profile(text, text) to authenticated;
