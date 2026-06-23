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
