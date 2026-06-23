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
