import { requireClient } from '../api';
import type {
  ClipRepost,
  HookChallenge,
  ListeningRoom,
  ReelClipVariant,
  SongReactionCounts,
  SongReactionType,
} from '../types';

export async function fetchSongReelClips(songId: string): Promise<ReelClipVariant[]> {
  try {
    const { data, error } = await requireClient()
      .from('song_reel_clips')
      .select('*')
      .eq('song_id', songId)
      .order('is_primary', { ascending: false });
    if (error) return [];
    return (data ?? []) as ReelClipVariant[];
  } catch {
    return [];
  }
}

export async function saveSongReelClips(
  songId: string,
  clips: Omit<ReelClipVariant, 'id' | 'song_id' | 'created_at'>[]
): Promise<void> {
  const client = requireClient();
  await client.from('song_reel_clips').delete().eq('song_id', songId);
  if (clips.length === 0) return;
  await client.from('song_reel_clips').insert(
    clips.map((c) => ({
      song_id: songId,
      label: c.label,
      start_seconds: c.start_seconds,
      end_seconds: c.end_seconds,
      cover_url: c.cover_url,
      loop_count: c.loop_count ?? 0,
      is_primary: c.is_primary ?? false,
      scheduled_at: c.scheduled_at,
      collab_studio_id: c.collab_studio_id,
    }))
  );
}

export async function fetchSongReactions(songId: string, userId?: string): Promise<SongReactionCounts> {
  const empty = { fire: 0, headphones: 0, vinyl: 0, mine: [] as SongReactionType[] };
  try {
    const { data, error } = await requireClient().from('song_reactions').select('reaction_type, user_id').eq('song_id', songId);
    if (error) return empty;
    const counts = { fire: 0, headphones: 0, vinyl: 0, mine: [] as SongReactionType[] };
    for (const row of data ?? []) {
      const t = row.reaction_type as SongReactionType;
      counts[t]++;
      if (userId && row.user_id === userId) counts.mine.push(t);
    }
    return counts;
  } catch {
    return empty;
  }
}

export async function toggleSongReaction(
  userId: string,
  songId: string,
  type: SongReactionType
): Promise<boolean> {
  const client = requireClient();
  const { data } = await client
    .from('song_reactions')
    .select('reaction_type')
    .eq('user_id', userId)
    .eq('song_id', songId)
    .eq('reaction_type', type)
    .maybeSingle();
  if (data) {
    await client.from('song_reactions').delete().eq('user_id', userId).eq('song_id', songId).eq('reaction_type', type);
    return false;
  }
  await client.from('song_reactions').insert({ user_id: userId, song_id: songId, reaction_type: type });
  return true;
}

export async function addAudioSongComment(
  songId: string,
  userId: string,
  audioUrl: string,
  ownerId?: string
) {
  const { data, error } = await requireClient()
    .from('song_comments')
    .insert({ song_id: songId, user_id: userId, content: '🎤', audio_url: audioUrl, is_audio: true })
    .select('*, author:profiles(*)')
    .single();
  if (error) throw error;
  if (ownerId && ownerId !== userId) {
    const { createNotification, NotificationKeys } = await import('../notificationI18n');
    const { fetchProfile } = await import('../api');
    const author = await fetchProfile(userId);
    await createNotification(
      ownerId,
      'comment',
      NotificationKeys.songComment.title,
      NotificationKeys.songComment.body,
      { username: author?.username ?? '?', preview: '🎤' },
      `/reels?song=${songId}`
    );
  }
  return data;
}

export type ClipAnalyticsEvent = 'view' | 'stop' | 'listen_full' | 'share' | 'repost';

export async function recordClipAnalytics(
  songId: string,
  eventType: ClipAnalyticsEvent,
  userId?: string,
  stopSecond?: number
): Promise<void> {
  try {
    await requireClient().from('clip_analytics_events').insert({
      song_id: songId,
      user_id: userId ?? null,
      event_type: eventType,
      stop_second: stopSecond ?? null,
    });
  } catch {
    /* local fallback */
    const key = `clip_analytics_${songId}`;
    const local = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[];
    local.push({ eventType, stopSecond, at: Date.now() });
    localStorage.setItem(key, JSON.stringify(local.slice(-200)));
  }
}

export async function fetchClipAnalyticsSummary(songId: string) {
  try {
    const { data } = await requireClient()
      .from('clip_analytics_events')
      .select('event_type, stop_second')
      .eq('song_id', songId);
    const events = data ?? [];
    const views = events.filter((e) => e.event_type === 'view').length;
    const listenFull = events.filter((e) => e.event_type === 'listen_full').length;
    const stops = events.filter((e) => e.event_type === 'stop' && e.stop_second != null).map((e) => e.stop_second as number);
    const avgStop = stops.length ? Math.round(stops.reduce((a, b) => a + b, 0) / stops.length) : null;
    return { views, listenFull, avgStop, reposts: events.filter((e) => e.event_type === 'repost').length };
  } catch {
    const local = JSON.parse(localStorage.getItem(`clip_analytics_${songId}`) ?? '[]') as { eventType: string; stopSecond?: number }[];
    return {
      views: local.filter((e) => e.eventType === 'view').length,
      listenFull: local.filter((e) => e.eventType === 'listen_full').length,
      avgStop: null as number | null,
      reposts: local.filter((e) => e.eventType === 'repost').length,
    };
  }
}

export async function repostClip(
  userId: string,
  sourceSongId: string,
  clipStart: number,
  clipEnd: number,
  caption = ''
): Promise<ClipRepost | null> {
  try {
    const { data, error } = await requireClient()
      .from('clip_reposts')
      .insert({ user_id: userId, source_song_id: sourceSongId, clip_start: clipStart, clip_end: clipEnd, caption })
      .select('*, source:songs(*, studio:studios(*, owner:profiles(*)))')
      .single();
    if (error) throw error;
    await recordClipAnalytics(sourceSongId, 'repost', userId);
    return data as ClipRepost;
  } catch {
    return null;
  }
}

export async function fetchClipReposts(limit = 20): Promise<ClipRepost[]> {
  try {
    const { data } = await requireClient()
      .from('clip_reposts')
      .select('*, source:songs(*, studio:studios(*, owner:profiles(*))), author:profiles(*)')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as ClipRepost[];
  } catch {
    return [];
  }
}

export async function fetchActiveHookChallenge(): Promise<HookChallenge | null> {
  try {
    const { data } = await requireClient()
      .from('hook_challenges')
      .select('*')
      .gt('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as HookChallenge) ?? null;
  } catch {
    return null;
  }
}

export async function enterHookChallenge(challengeId: string, songId: string, userId: string) {
  await requireClient().from('hook_challenge_entries').upsert({ challenge_id: challengeId, song_id: songId, user_id: userId });
}

export async function fetchHookChallengeEntries(challengeId: string) {
  const { data } = await requireClient()
    .from('hook_challenge_entries')
    .select('*, song:songs(*, studio:studios(*, owner:profiles(*)))')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function createListeningRoom(hostId: string, songId: string, title: string): Promise<ListeningRoom | null> {
  try {
    const { data, error } = await requireClient()
      .from('listening_rooms')
      .insert({ host_id: hostId, song_id: songId, title })
      .select('*, host:profiles(*)')
      .single();
    if (error) throw error;
    await requireClient().from('listening_room_members').insert({ room_id: data.id, user_id: hostId });
    return data as ListeningRoom;
  } catch {
    return null;
  }
}

export async function joinListeningRoom(roomId: string, userId: string) {
  await requireClient().from('listening_room_members').upsert({ room_id: roomId, user_id: userId });
}

export async function fetchListeningRoom(roomId: string): Promise<ListeningRoom | null> {
  const { data } = await requireClient()
    .from('listening_rooms')
    .select('*, host:profiles(*), song:songs(*, studio:studios(*, owner:profiles(*)))')
    .eq('id', roomId)
    .maybeSingle();
  return (data as ListeningRoom) ?? null;
}

export async function reportClip(songId: string, reporterId: string, reason: string) {
  await requireClient().from('clip_reports').insert({ song_id: songId, reporter_id: reporterId, reason });
}

export async function fetchClipReports() {
  const { data } = await requireClient()
    .from('clip_reports')
    .select('*, song:songs(title), reporter:profiles(username)')
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function findTasteTwins(userId: string, limit = 10) {
  const client = requireClient();
  const { data: myLikes } = await client.from('song_likes').select('song_id').eq('user_id', userId).limit(50);
  const songIds = (myLikes ?? []).map((r) => r.song_id);
  if (songIds.length === 0) return [];

  const { data: twins } = await client
    .from('song_likes')
    .select('user_id')
    .in('song_id', songIds)
    .neq('user_id', userId)
    .limit(200);

  const counts = new Map<string, number>();
  for (const row of twins ?? []) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
  if (topIds.length === 0) return [];

  const { data: profiles } = await client.from('profiles').select('id, username, display_name, avatar_url').in('id', topIds);
  return (profiles ?? []).map((p) => ({
    ...p,
    overlap: counts.get(p.id) ?? 0,
  })) as { id: string; username: string; display_name: string | null; avatar_url: string | null; overlap: number }[];
}

export async function updateSongClipExtras(
  songId: string,
  extras: {
    clipLoopCount?: number;
    clipCoverUrl?: string | null;
    clipCaption?: string | null;
    clipScheduledAt?: string | null;
    moodTags?: string[];
    collabStudioId?: string | null;
  }
) {
  await requireClient()
    .from('songs')
    .update({
      clip_loop_count: extras.clipLoopCount,
      clip_cover_url: extras.clipCoverUrl,
      clip_caption: extras.clipCaption,
      clip_scheduled_at: extras.clipScheduledAt,
      mood_tags: extras.moodTags,
      collab_studio_id: extras.collabStudioId,
    })
    .eq('id', songId);
}
