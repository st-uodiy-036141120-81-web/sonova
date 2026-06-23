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
