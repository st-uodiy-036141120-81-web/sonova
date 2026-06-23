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
