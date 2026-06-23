-- Fix: record "v_row" has no field "verified" (partial schema / missing v5 columns)
-- Run in Supabase SQL Editor after migration_v11.

alter table public.profiles add column if not exists is_admin boolean default false;
alter table public.profiles add column if not exists taste_tags text[] default '{}';
alter table public.profiles add column if not exists trust_score int default 0;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
alter table public.profiles add column if not exists verified boolean default false;
alter table public.profiles add column if not exists totp_secret text;
alter table public.profiles add column if not exists totp_enabled boolean default false;
alter table public.profiles add column if not exists daily_upload_count int default 0;
alter table public.profiles add column if not exists upload_count_date date;
alter table public.profiles add column if not exists settings jsonb not null default '{}'::jsonb;

create unique index if not exists profiles_referral_code_key on public.profiles (referral_code) where referral_code is not null;

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
        display_name = excluded.display_name;

  insert into public.studios (owner_id, name, description)
  values (v_uid, v_name || '''s Studio', '')
  on conflict (owner_id) do nothing;

  return (
    select to_jsonb(p)
      - 'totp_secret'
      - 'daily_upload_count'
      - 'upload_count_date'
    from public.profiles p
    where p.id = v_uid
  );
end;
$$;

revoke all on function public.upsert_own_profile(text, text) from public;
grant execute on function public.upsert_own_profile(text, text) to authenticated;
