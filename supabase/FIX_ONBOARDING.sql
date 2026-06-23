-- ═══════════════════════════════════════════════════════════════
-- Sonova: FIX onboarding — "record v_row has no field verified"
-- Paste ALL of this in Supabase → SQL Editor → Run (once)
-- Do NOT re-run migration_v11 — use THIS file only
-- ═══════════════════════════════════════════════════════════════

-- Step 1: add missing profile columns
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
alter table public.profiles add column if not exists settings jsonb default '{}'::jsonb;
update public.profiles set settings = '{}'::jsonb where settings is null;
alter table public.profiles alter column settings set default '{}'::jsonb;

-- Step 2: permissions
grant select on table public.profiles to anon, authenticated;
grant insert, update, delete on table public.profiles to authenticated;
grant select on table public.studios to anon, authenticated;
grant insert, update, delete on table public.studios to authenticated;

-- Step 3: onboarding RPC (no v_row — safe on any schema)
drop function if exists public.upsert_own_profile(text, text);

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

grant execute on function public.upsert_own_profile(text, text) to authenticated;

-- Step 4: profile update guard (after columns exist)
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin, false)
  ) then
    NEW.is_admin := OLD.is_admin;
    NEW.totp_secret := OLD.totp_secret;
    NEW.totp_enabled := OLD.totp_enabled;
    NEW.verified := OLD.verified;
    NEW.trust_score := OLD.trust_score;
    NEW.daily_upload_count := OLD.daily_upload_count;
    NEW.upload_count_date := OLD.upload_count_date;
    if OLD.referral_code is not null then
      NEW.referral_code := OLD.referral_code;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();
