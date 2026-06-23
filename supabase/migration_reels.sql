
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
