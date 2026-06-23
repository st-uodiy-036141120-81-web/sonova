-- Sonova v9: security hardening (RLS, RPC counters, profile guards, storage scope)

-- ── Remove permissive song update policy ──
drop policy if exists "songs increment stats" on public.songs;

-- ── Atomic play/download counters ──
create or replace function public.increment_song_play_count(p_song_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.songs
  set play_count = coalesce(play_count, 0) + 1
  where id = p_song_id;
end;
$$;

create or replace function public.increment_song_download_count(p_song_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.songs
  set download_count = coalesce(download_count, 0) + 1
  where id = p_song_id;
end;
$$;

grant execute on function public.increment_song_play_count(uuid) to authenticated, anon;
grant execute on function public.increment_song_download_count(uuid) to authenticated, anon;

-- ── Like count via triggers (no client-side counter writes) ──
create or replace function public.sync_song_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.songs
    set like_count = coalesce(like_count, 0) + 1
    where id = NEW.song_id;
  elsif TG_OP = 'DELETE' then
    update public.songs
    set like_count = greatest(coalesce(like_count, 0) - 1, 0)
    where id = OLD.song_id;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists song_likes_count_insert on public.song_likes;
create trigger song_likes_count_insert
  after insert on public.song_likes
  for each row execute function public.sync_song_like_count();

drop trigger if exists song_likes_count_delete on public.song_likes;
create trigger song_likes_count_delete
  after delete on public.song_likes
  for each row execute function public.sync_song_like_count();

-- ── Block self-escalation on profile updates ──
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

-- ── Upload rate limit (server-side) ──
create or replace function public.can_upload_today(p_max int default 10)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_date date;
begin
  if v_uid is null then return false; end if;
  select daily_upload_count, upload_count_date into v_count, v_date
  from public.profiles where id = v_uid;
  if not found then return false; end if;
  if v_date is distinct from current_date then return true; end if;
  return coalesce(v_count, 0) < p_max;
end;
$$;

create or replace function public.record_upload_today()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_date date;
begin
  if v_uid is null then return; end if;
  select daily_upload_count, upload_count_date into v_count, v_date
  from public.profiles where id = v_uid for update;
  if not found then return; end if;
  if v_date is distinct from current_date then
    update public.profiles
    set daily_upload_count = 1, upload_count_date = current_date
    where id = v_uid;
  else
    update public.profiles
    set daily_upload_count = coalesce(v_count, 0) + 1
    where id = v_uid;
  end if;
end;
$$;

grant execute on function public.can_upload_today(int) to authenticated;
grant execute on function public.record_upload_today() to authenticated;

-- ── Notifications: RPC only, no open client insert ──
drop policy if exists "notifications insert system" on public.notifications;

grant execute on function public.notify_user(uuid, text, text, text, text) to authenticated;

-- ── Song transfers: requester must own the source studio ──
drop policy if exists "transfers insert requester" on public.song_transfers;
create policy "transfers insert owner" on public.song_transfers for insert with check (
  auth.uid() = requested_by
  and exists (
    select 1
    from public.songs sg
    join public.studios sf on sf.id = sg.studio_id
    where sg.id = song_id
      and sg.studio_id = from_studio_id
      and sf.owner_id = auth.uid()
  )
);

-- ── Hide sensitive profile columns from API clients ──
revoke select (totp_secret, daily_upload_count, upload_count_date) on public.profiles from anon, authenticated;
