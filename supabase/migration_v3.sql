
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
  if uname is not null and uname ~ '^[a-zA-Z0-9]{1,7}$' then
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
