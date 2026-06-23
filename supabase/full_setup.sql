-- Sonova: run this entire file once in Supabase SQL Editor (new project)
-- Order: base schema, then incremental migrations

-- ═══════════════════════════════════════════════════════════════
-- 1) BASE SCHEMA (schema.sql)
-- ═══════════════════════════════════════════════════════════════
-- Sonova platform schema (full)
-- Storage buckets: avatars, songs (public read)

create extension if not exists "pgcrypto";

-- ── Core ──
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text default '',
  avatar_url text,
  created_at timestamptz default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9]{1,7}$')
);

create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid unique not null references public.profiles(id) on delete cascade,
  name text not null default 'My Studio',
  description text default '',
  created_at timestamptz default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null,
  file_url text not null,
  file_type text not null check (file_type in ('mp3', 'mp4')),
  duration_seconds int,
  tags text[] default '{}',
  play_count int default 0,
  download_count int default 0,
  like_count int default 0,
  created_at timestamptz default now()
);

create table if not exists public.studio_comments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.studio_comments(id) on delete cascade,
  content text not null,
  is_pinned boolean default false,
  created_at timestamptz default now()
);

-- ── Social ──
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (follower_id, following_id),
  check (follower_id != following_id)
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id != blocked_id)
);

create table if not exists public.song_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, song_id)
);

-- ── Playlists ──
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.playlist_songs (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position int not null default 0,
  primary key (playlist_id, song_id)
);

-- ── Transfers (pending accept/reject) ──
create table if not exists public.song_transfers (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  from_studio_id uuid not null references public.studios(id) on delete cascade,
  to_studio_id uuid not null references public.studios(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now(),
  responded_at timestamptz
);

-- ── Notifications ──
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

-- ── Moderation ──
create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.studio_comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz default now(),
  unique (comment_id, reporter_id)
);

-- ── Indexes ──
create index if not exists idx_profiles_username on public.profiles (username);
create index if not exists idx_songs_title on public.songs (title);
create index if not exists idx_songs_tags on public.songs using gin (tags);
create index if not exists idx_songs_studio on public.songs (studio_id);
create index if not exists idx_follows_follower on public.follows (follower_id);
create index if not exists idx_follows_following on public.follows (following_id);
create index if not exists idx_blocks_blocker on public.blocks (blocker_id);
create index if not exists idx_notifications_user on public.notifications (user_id, read);
create index if not exists idx_transfers_to on public.song_transfers (to_studio_id, status);

-- ── RLS ──
alter table public.profiles enable row level security;
alter table public.studios enable row level security;
alter table public.songs enable row level security;
alter table public.studio_comments enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.song_likes enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.song_transfers enable row level security;
alter table public.notifications enable row level security;
alter table public.comment_reports enable row level security;

-- Profiles
create policy "profiles read all" on public.profiles for select using (true);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);

-- Studios
create policy "studios read all" on public.studios for select using (true);
create policy "studios update own" on public.studios for update using (auth.uid() = owner_id);
create policy "studios insert own" on public.studios for insert with check (auth.uid() = owner_id);

-- Songs
create policy "songs read all" on public.songs for select using (true);
create policy "songs insert own studio" on public.songs for insert
  with check (exists (select 1 from public.studios s where s.id = studio_id and s.owner_id = auth.uid()));
create policy "songs update own studio" on public.songs for update
  using (exists (select 1 from public.studios s where s.id = studio_id and s.owner_id = auth.uid()));
create policy "songs delete own studio" on public.songs for delete
  using (exists (select 1 from public.studios s where s.id = studio_id and s.owner_id = auth.uid()));
create policy "songs increment stats" on public.songs for update using (true) with check (true);

-- Comments
create policy "comments read all" on public.studio_comments for select using (true);
create policy "comments insert auth" on public.studio_comments for insert with check (auth.uid() = user_id);
create policy "comments update own or studio owner" on public.studio_comments for update
  using (auth.uid() = user_id or exists (select 1 from public.studios s where s.id = studio_id and s.owner_id = auth.uid()));
create policy "comments delete own or studio owner" on public.studio_comments for delete
  using (auth.uid() = user_id or exists (select 1 from public.studios s where s.id = studio_id and s.owner_id = auth.uid()));

-- Follows
create policy "follows read all" on public.follows for select using (true);
create policy "follows insert own" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows delete own" on public.follows for delete using (auth.uid() = follower_id);

-- Blocks
create policy "blocks read own" on public.blocks for select using (auth.uid() = blocker_id);
create policy "blocks insert own" on public.blocks for insert with check (auth.uid() = blocker_id);
create policy "blocks delete own" on public.blocks for delete using (auth.uid() = blocker_id);

-- Likes
create policy "likes read all" on public.song_likes for select using (true);
create policy "likes insert own" on public.song_likes for insert with check (auth.uid() = user_id);
create policy "likes delete own" on public.song_likes for delete using (auth.uid() = user_id);

-- Playlists
create policy "playlists read all" on public.playlists for select using (true);
create policy "playlists manage own studio" on public.playlists for all
  using (exists (select 1 from public.studios s where s.id = studio_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.studios s where s.id = studio_id and s.owner_id = auth.uid()));

create policy "playlist_songs read all" on public.playlist_songs for select using (true);
create policy "playlist_songs manage own" on public.playlist_songs for all
  using (exists (
    select 1 from public.playlists p join public.studios s on s.id = p.studio_id
    where p.id = playlist_id and s.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.playlists p join public.studios s on s.id = p.studio_id
    where p.id = playlist_id and s.owner_id = auth.uid()
  ));

-- Transfers
create policy "transfers read involved" on public.song_transfers for select using (
  auth.uid() = requested_by
  or exists (select 1 from public.studios s where s.id = to_studio_id and s.owner_id = auth.uid())
  or exists (select 1 from public.studios s where s.id = from_studio_id and s.owner_id = auth.uid())
);
create policy "transfers insert requester" on public.song_transfers for insert with check (auth.uid() = requested_by);
create policy "transfers update recipient" on public.song_transfers for update
  using (exists (select 1 from public.studios s where s.id = to_studio_id and s.owner_id = auth.uid()));

-- Notifications
create policy "notifications read own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications update own" on public.notifications for update using (auth.uid() = user_id);
create policy "notifications insert system" on public.notifications for insert with check (true);

-- Reports
create policy "reports insert auth" on public.comment_reports for insert with check (auth.uid() = reporter_id);
create policy "reports read own" on public.comment_reports for select using (auth.uid() = reporter_id);

-- ── Auth trigger ──
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text := new.raw_user_meta_data->>'username';
  dname text := coalesce(new.raw_user_meta_data->>'display_name', uname);
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, uname, dname);
  insert into public.studios (owner_id, name, description)
  values (new.id, dname || '''s Studio', '');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ── Helper: create notification ──
create or replace function public.notify_user(
  p_user_id uuid, p_type text, p_title text, p_body text, p_link text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
end;
$$;

-- ── Migration for existing DBs ──
alter table public.songs add column if not exists tags text[] default '{}';
alter table public.songs add column if not exists play_count int default 0;
alter table public.songs add column if not exists download_count int default 0;
alter table public.songs add column if not exists like_count int default 0;
-- Username: max 7 alphanumeric chars (reject longer names)
alter table public.profiles drop constraint if exists username_format;
alter table public.profiles add constraint username_format check (username ~ '^[a-zA-Z0-9]{1,7}$');

-- Song comments for Reels feed
create table if not exists public.song_comments (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_song_comments_song on public.song_comments (song_id, created_at desc);

alter table public.song_comments enable row level security;

create policy "song_comments read all" on public.song_comments for select using (true);
create policy "song_comments insert auth" on public.song_comments for insert with check (auth.uid() = user_id);
create policy "song_comments delete own" on public.song_comments for delete using (auth.uid() = user_id);

-- ── Sonova v3 extensions ──

alter table public.profiles add column if not exists is_admin boolean default false;

alter table public.songs add column if not exists audio_fingerprint text;
create index if not exists idx_songs_fingerprint on public.songs (audio_fingerprint);

-- Direct messages
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_dm_pair on public.direct_messages (sender_id, receiver_id, created_at desc);

-- Playlist collaborators
create table if not exists public.playlist_collaborators (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz default now(),
  primary key (playlist_id, user_id)
);

-- Moderation status on reports
alter table public.comment_reports add column if not exists status text default 'pending'
  check (status in ('pending', 'resolved', 'dismissed'));
alter table public.comment_reports add column if not exists resolved_by uuid references public.profiles(id);
alter table public.comment_reports add column if not exists resolved_at timestamptz;

alter table public.direct_messages enable row level security;
alter table public.playlist_collaborators enable row level security;

create policy "dm read own" on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "dm insert sender" on public.direct_messages for insert
  with check (auth.uid() = sender_id);
create policy "dm update receiver" on public.direct_messages for update
  using (auth.uid() = receiver_id);

create policy "collab read all" on public.playlist_collaborators for select using (true);
create policy "collab manage owner" on public.playlist_collaborators for all
  using (exists (
    select 1 from public.playlists p join public.studios s on s.id = p.studio_id
    where p.id = playlist_id and s.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.playlists p join public.studios s on s.id = p.studio_id
    where p.id = playlist_id and s.owner_id = auth.uid()
  ));

-- Admin moderation policies
create policy "reports read admin" on public.comment_reports for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create policy "reports update admin" on public.comment_reports for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- OAuth-safe trigger: skip if no username yet
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text := new.raw_user_meta_data->>'username';
  dname text := coalesce(new.raw_user_meta_data->>'display_name', uname);
begin
  if uname is not null and uname ~ '^[a-zA-Z0-9]{7,}$' then
    insert into public.profiles (id, username, display_name)
    values (new.id, uname, dname)
    on conflict (id) do nothing;
    insert into public.studios (owner_id, name, description)
    values (new.id, coalesce(dname, uname) || '''s Studio', '')
    on conflict (owner_id) do nothing;
  end if;
  return new;
end;
$$;

-- Enable realtime for notifications + messages
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.direct_messages;
-- Sonova v4: taste sync, credits, live, appeals, badges, newsletter

alter table public.profiles add column if not exists taste_tags text[] default '{}';
alter table public.profiles add column if not exists trust_score int default 0;
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);

alter table public.songs add column if not exists original_song_id uuid references public.songs(id);
alter table public.songs add column if not exists waveform_peaks jsonb;
alter table public.songs add column if not exists clip_start_seconds int default 0;
alter table public.songs add column if not exists clip_end_seconds int;

create table if not exists public.song_listen_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  duration_ms int not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_listen_user on public.song_listen_events (user_id, created_at desc);

create table if not exists public.song_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid references public.songs(id) on delete set null,
  comment_id uuid references public.studio_comments(id) on delete set null,
  reason text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  is_active boolean default true,
  started_at timestamptz default now(),
  ended_at timestamptz
);

create table if not exists public.early_listeners (
  song_id uuid not null references public.songs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  listen_order int not null,
  created_at timestamptz default now(),
  primary key (song_id, user_id)
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.song_listen_events enable row level security;
alter table public.song_appeals enable row level security;
alter table public.live_sessions enable row level security;
alter table public.early_listeners enable row level security;
alter table public.newsletter_subscribers enable row level security;

create policy "listen insert auth" on public.song_listen_events for insert with check (auth.uid() = user_id or user_id is null);
create policy "listen read own" on public.song_listen_events for select using (auth.uid() = user_id);

create policy "appeals insert auth" on public.song_appeals for insert with check (auth.uid() = user_id);
create policy "appeals read own" on public.song_appeals for select using (auth.uid() = user_id);

create policy "live read all" on public.live_sessions for select using (true);
create policy "live manage host" on public.live_sessions for all using (auth.uid() = host_id) with check (auth.uid() = host_id);

create policy "early read all" on public.early_listeners for select using (true);
create policy "early insert auth" on public.early_listeners for insert with check (auth.uid() = user_id);

create policy "newsletter insert" on public.newsletter_subscribers for insert with check (true);
create policy "newsletter read own" on public.newsletter_subscribers for select using (auth.uid() = user_id);

alter publication supabase_realtime add table public.playlist_songs;
alter publication supabase_realtime add table public.live_sessions;
-- Sonova v5: all platform features

-- Songs publishing & exclusivity
alter table public.songs add column if not exists status text default 'published' check (status in ('draft', 'scheduled', 'published'));
alter table public.songs add column if not exists publish_at timestamptz;
alter table public.songs add column if not exists description text;
alter table public.songs add column if not exists lyrics text;
alter table public.songs add column if not exists is_exclusive boolean default false;
alter table public.songs add column if not exists followers_only boolean default false;
alter table public.songs add column if not exists early_access_until timestamptz;
alter table public.songs add column if not exists city_tag text;
alter table public.songs add column if not exists shoutout_username text;

alter table public.profiles add column if not exists verified boolean default false;
alter table public.profiles add column if not exists totp_secret text;
alter table public.profiles add column if not exists totp_enabled boolean default false;
alter table public.profiles add column if not exists daily_upload_count int default 0;
alter table public.profiles add column if not exists upload_count_date date;

create table if not exists public.saved_songs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, song_id)
);

create table if not exists public.song_chapters (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  title text not null,
  start_seconds int not null,
  end_seconds int
);

create table if not exists public.song_credits (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  role text not null,
  name text not null,
  profile_id uuid references public.profiles(id) on delete set null
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null,
  cover_url text,
  created_at timestamptz default now()
);

create table if not exists public.album_songs (
  album_id uuid not null references public.albums(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position int not null default 0,
  primary key (album_id, song_id)
);

create table if not exists public.studio_stories (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  content text not null,
  media_url text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists public.comment_polls (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.studio_comments(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]',
  votes jsonb not null default '{}'
);

create table if not exists public.fan_clubs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade unique,
  name text not null,
  max_members int default 100
);

create table if not exists public.fan_club_members (
  club_id uuid not null references public.fan_clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (club_id, user_id)
);

create table if not exists public.voice_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  audio_url text not null,
  duration_seconds int,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete set null,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents int not null,
  currency text default 'USD',
  message text,
  status text default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz default now()
);

create table if not exists public.listen_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  completion_ratio float not null,
  created_at timestamptz default now()
);

create table if not exists public.live_signals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  signal_type text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

alter table public.saved_songs enable row level security;
alter table public.song_chapters enable row level security;
alter table public.song_credits enable row level security;
alter table public.albums enable row level security;
alter table public.album_songs enable row level security;
alter table public.studio_stories enable row level security;
alter table public.comment_polls enable row level security;
alter table public.fan_clubs enable row level security;
alter table public.fan_club_members enable row level security;
alter table public.voice_messages enable row level security;
alter table public.tips enable row level security;
alter table public.listen_completions enable row level security;
alter table public.live_signals enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "saved own" on public.saved_songs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "chapters read" on public.song_chapters for select using (true);
create policy "chapters manage" on public.song_chapters for all using (exists (select 1 from public.songs s join public.studios st on st.id = s.studio_id where s.id = song_id and st.owner_id = auth.uid()));
create policy "credits read" on public.song_credits for select using (true);
create policy "albums read" on public.albums for select using (true);
create policy "stories read" on public.studio_stories for select using (expires_at > now());
create policy "polls read" on public.comment_polls for select using (true);
create policy "fan clubs read" on public.fan_clubs for select using (true);
create policy "fan members read" on public.fan_club_members for select using (true);
create policy "voice own" on public.voice_messages for all using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "tips read" on public.tips for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "completions insert" on public.listen_completions for insert with check (auth.uid() = user_id or user_id is null);
create policy "live signals read" on public.live_signals for select using (true);
create policy "live signals insert" on public.live_signals for insert with check (auth.uid() = sender_id);
create policy "push own" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.playlist_songs;
alter publication supabase_realtime add table public.live_signals;
-- User preferences (all settings in one JSON document)
alter table public.profiles add column if not exists settings jsonb not null default '{}'::jsonb;

create index if not exists idx_profiles_settings on public.profiles using gin (settings);

-- Self-service account deletion
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
-- Sonova v7: advanced reels / clips features

alter table public.songs add column if not exists clip_loop_count int default 0;
alter table public.songs add column if not exists clip_cover_url text;
alter table public.songs add column if not exists clip_caption text;
alter table public.songs add column if not exists clip_scheduled_at timestamptz;
alter table public.songs add column if not exists mood_tags text[] default '{}';
alter table public.songs add column if not exists collab_studio_id uuid references public.studios(id);

alter table public.song_comments add column if not exists audio_url text;
alter table public.song_comments add column if not exists is_audio boolean default false;

create table if not exists public.song_reel_clips (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  label text default '',
  start_seconds int not null default 0,
  end_seconds int not null,
  cover_url text,
  loop_count int default 0,
  is_primary boolean default false,
  scheduled_at timestamptz,
  collab_studio_id uuid references public.studios(id),
  created_at timestamptz default now()
);
create index if not exists idx_song_reel_clips_song on public.song_reel_clips (song_id);

create table if not exists public.song_reactions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('fire', 'headphones', 'vinyl')),
  created_at timestamptz default now(),
  primary key (user_id, song_id, reaction_type)
);
create index if not exists idx_song_reactions_song on public.song_reactions (song_id);

create table if not exists public.clip_analytics_events (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('view', 'stop', 'listen_full', 'share', 'repost')),
  stop_second int,
  created_at timestamptz default now()
);
create index if not exists idx_clip_analytics_song on public.clip_analytics_events (song_id, created_at desc);

create table if not exists public.clip_reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_song_id uuid not null references public.songs(id) on delete cascade,
  clip_start int not null default 0,
  clip_end int not null,
  caption text default '',
  created_at timestamptz default now()
);
create index if not exists idx_clip_reposts_user on public.clip_reposts (user_id, created_at desc);

create table if not exists public.hook_challenges (
  id uuid primary key default gen_random_uuid(),
  hashtag text not null,
  title text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists public.hook_challenge_entries (
  challenge_id uuid not null references public.hook_challenges(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (challenge_id, song_id)
);

create table if not exists public.listening_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid references public.songs(id) on delete set null,
  title text not null default 'Listening room',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.listening_room_members (
  room_id uuid not null references public.listening_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

create table if not exists public.clip_reports (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz default now()
);

alter table public.song_reel_clips enable row level security;
alter table public.song_reactions enable row level security;
alter table public.clip_analytics_events enable row level security;
alter table public.clip_reposts enable row level security;
alter table public.hook_challenges enable row level security;
alter table public.hook_challenge_entries enable row level security;
alter table public.listening_rooms enable row level security;
alter table public.listening_room_members enable row level security;
alter table public.clip_reports enable row level security;

create policy "reel_clips read all" on public.song_reel_clips for select using (true);
create policy "reel_clips manage song owner" on public.song_reel_clips for all using (
  exists (select 1 from public.songs s join public.studios st on st.id = s.studio_id where s.id = song_id and st.owner_id = auth.uid())
);

create policy "reactions read all" on public.song_reactions for select using (true);
create policy "reactions insert auth" on public.song_reactions for insert with check (auth.uid() = user_id);
create policy "reactions delete own" on public.song_reactions for delete using (auth.uid() = user_id);

create policy "clip_analytics insert" on public.clip_analytics_events for insert with check (auth.uid() = user_id or user_id is null);
create policy "clip_analytics read studio" on public.clip_analytics_events for select using (
  exists (select 1 from public.songs s join public.studios st on st.id = s.studio_id where s.id = song_id and st.owner_id = auth.uid())
);

create policy "clip_reposts read all" on public.clip_reposts for select using (true);
create policy "clip_reposts insert auth" on public.clip_reposts for insert with check (auth.uid() = user_id);
create policy "clip_reposts delete own" on public.clip_reposts for delete using (auth.uid() = user_id);

create policy "hook read all" on public.hook_challenges for select using (true);
create policy "hook entries read all" on public.hook_challenge_entries for select using (true);
create policy "hook entries insert auth" on public.hook_challenge_entries for insert with check (auth.uid() = user_id);

create policy "rooms read active" on public.listening_rooms for select using (is_active = true or host_id = auth.uid());
create policy "rooms insert host" on public.listening_rooms for insert with check (auth.uid() = host_id);
create policy "rooms update host" on public.listening_rooms for update using (auth.uid() = host_id);

create policy "room_members read" on public.listening_room_members for select using (true);
create policy "room_members join" on public.listening_room_members for insert with check (auth.uid() = user_id);
create policy "room_members leave" on public.listening_room_members for delete using (auth.uid() = user_id);

create policy "clip_reports insert auth" on public.clip_reports for insert with check (auth.uid() = reporter_id);
create policy "clip_reports read admin" on public.clip_reports for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- Seed current hook challenge (optional)
insert into public.hook_challenges (hashtag, title, starts_at, ends_at)
select '#HookWeek', 'Best 15-second hook', now(), now() + interval '7 days'
where not exists (select 1 from public.hook_challenges where ends_at > now() limit 1);
