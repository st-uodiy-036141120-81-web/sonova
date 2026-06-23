import { requireClient } from './api';
import type {
  Album,
  CommentPoll,
  FanClub,
  Song,
  SongChapter,
  SongCredit,
  StudioStory,
  Tip,
  VoiceMessage,
} from './types';

function normSong(row: Record<string, unknown>): Song {
  return {
    ...row,
    tags: (row.tags as string[]) ?? [],
    play_count: (row.play_count as number) ?? 0,
    download_count: (row.download_count as number) ?? 0,
    like_count: (row.like_count as number) ?? 0,
    status: (row.status as Song['status']) ?? 'published',
  } as Song;
}

// ── Saved reels / listen later ──
export async function toggleSavedSong(userId: string, songId: string): Promise<boolean> {
  const { data } = await requireClient().from('saved_songs').select('song_id').eq('user_id', userId).eq('song_id', songId).maybeSingle();
  if (data) {
    await requireClient().from('saved_songs').delete().eq('user_id', userId).eq('song_id', songId);
    return false;
  }
  await requireClient().from('saved_songs').insert({ user_id: userId, song_id: songId });
  return true;
}

export async function fetchSavedSongs(userId: string): Promise<Song[]> {
  const { data } = await requireClient()
    .from('saved_songs')
    .select('song:songs(*, studio:studios(*, owner:profiles(*)))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((r) => normSong((r as unknown as { song: Record<string, unknown> }).song));
}

export async function isSongSaved(userId: string, songId: string): Promise<boolean> {
  const { data } = await requireClient().from('saved_songs').select('song_id').eq('user_id', userId).eq('song_id', songId).maybeSingle();
  return !!data;
}

// ── Discover ──
export async function fetchTrendingSongs(limit = 10): Promise<Song[]> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data } = await requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .eq('status', 'published')
    .gte('created_at', weekAgo)
    .order('play_count', { ascending: false })
    .limit(limit);
  return (data ?? []).map(normSong);
}

export async function fetchRemixesWeek(limit = 10): Promise<Song[]> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data } = await requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .not('original_song_id', 'is', null)
    .gte('created_at', weekAgo)
    .order('like_count', { ascending: false })
    .limit(limit);
  return (data ?? []).map(normSong);
}

export async function fetchSongsByCity(city: string, limit = 10): Promise<Song[]> {
  const { data } = await requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .eq('city_tag', city)
    .eq('status', 'published')
    .limit(limit);
  return (data ?? []).map(normSong);
}

// ── Analytics ──
export async function recordListenCompletion(userId: string | null, songId: string, ratio: number) {
  await requireClient().from('listen_completions').insert({ user_id: userId, song_id: songId, completion_ratio: ratio });
}

export async function fetchAdvancedStats(ownerId: string) {
  const { data: studio } = await requireClient().from('studios').select('id').eq('owner_id', ownerId).single();
  if (!studio) return null;

  const { data: songs } = await requireClient().from('songs').select('id, title, play_count').eq('studio_id', studio.id);
  const songIds = (songs ?? []).map((s) => s.id);

  const { data: completions } = await requireClient()
    .from('listen_completions')
    .select('song_id, completion_ratio, created_at')
    .in('song_id', songIds.length ? songIds : ['00000000-0000-0000-0000-000000000000']);

  const avgCompletion =
    completions?.length
      ? completions.reduce((a, c) => a + (c.completion_ratio ?? 0), 0) / completions.length
      : 0;

  const hourCounts = new Array(24).fill(0);
  for (const c of completions ?? []) {
    const h = new Date(c.created_at).getHours();
    hourCounts[h]++;
  }
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  const topListeners = await requireClient()
    .from('listen_completions')
    .select('user_id')
    .in('song_id', songIds.length ? songIds : ['00000000-0000-0000-0000-000000000000'])
    .limit(500);

  const listenerMap: Record<string, number> = {};
  for (const r of topListeners.data ?? []) {
    if (r.user_id) listenerMap[r.user_id] = (listenerMap[r.user_id] ?? 0) + 1;
  }
  const topFanIds = Object.entries(listenerMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return { avgCompletion, peakHour, hourCounts, topFanIds, songs: songs ?? [] };
}

// ── Listen like @username ──
export async function fetchFeedLikeUser(targetUserId: string, viewerId: string | undefined, limit = 20): Promise<Song[]> {
  const { fetchUserLikedSongs, fetchBlockedIds } = await import('./api');
  const blocked = viewerId ? await fetchBlockedIds(viewerId) : new Set<string>();
  const liked = await fetchUserLikedSongs(targetUserId);
  return liked.filter((s) => !blocked.has(s.studio?.owner_id ?? '')).slice(0, limit);
}

// ── Mood playlists ──
export async function fetchMoodPlaylist(mood: string, limit = 15): Promise<Song[]> {
  const { MOOD_TAGS } = await import('./localFeatures');
  const tags = MOOD_TAGS[mood] ?? ['calm'];
  const { data } = await requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .eq('status', 'published')
    .overlaps('tags', tags)
    .order('play_count', { ascending: false })
    .limit(limit);
  return (data ?? []).map(normSong);
}

// ── Taste report ──
export async function fetchTasteReport(userId: string) {
  const { fetchUserLikedSongs } = await import('./api');
  const liked = await fetchUserLikedSongs(userId);
  const tagCounts: Record<string, number> = {};
  for (const s of liked) {
    for (const t of s.tags ?? []) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  }
  const total = Object.values(tagCounts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);
}

// ── Song meta ──
export async function fetchSongChapters(songId: string): Promise<SongChapter[]> {
  const { data } = await requireClient().from('song_chapters').select('*').eq('song_id', songId).order('start_seconds');
  return (data ?? []) as SongChapter[];
}

export async function fetchSongCredits(songId: string): Promise<SongCredit[]> {
  const { data } = await requireClient().from('song_credits').select('*').eq('song_id', songId);
  return (data ?? []) as SongCredit[];
}

// ── Albums ──
export async function fetchStudioAlbums(studioId: string): Promise<Album[]> {
  const { data } = await requireClient()
    .from('albums')
    .select('*, songs:album_songs(song:songs(*))')
    .eq('studio_id', studioId);
  return (data ?? []) as Album[];
}

export async function createAlbum(studioId: string, title: string, songIds: string[]) {
  const { data: album, error } = await requireClient().from('albums').insert({ studio_id: studioId, title }).select().single();
  if (error) throw error;
  if (songIds.length) {
    await requireClient().from('album_songs').insert(songIds.map((song_id, i) => ({ album_id: album.id, song_id, position: i })));
  }
  return album as Album;
}

// ── Drafts & schedule ──
export async function publishDraft(songId: string, publishAt?: string) {
  await requireClient().from('songs').update({
    status: publishAt ? 'scheduled' : 'published',
    publish_at: publishAt ?? null,
  }).eq('id', songId);
}

// ── Rate limit (server-enforced) ──
export async function checkUploadRateLimit(_userId: string, maxDaily = 10): Promise<boolean> {
  const { data, error } = await requireClient().rpc('can_upload_today', { p_max: maxDaily });
  if (error) return true;
  return Boolean(data);
}

export async function incrementUploadCount(_userId: string) {
  await requireClient().rpc('record_upload_today');
}

// ── 2FA: not yet implemented — disabled until real TOTP flow exists ──
export async function enable2FA(_userId: string): Promise<string> {
  throw new Error('2FA_NOT_AVAILABLE');
}

export async function disable2FA(_userId: string) {
  /* no-op */
}

export async function fetchStudioDrafts(studioId: string): Promise<Song[]> {
  const { data } = await requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .eq('studio_id', studioId)
    .in('status', ['draft', 'scheduled'])
    .order('created_at', { ascending: false });
  return (data ?? []).map(normSong);
}

// ── Stories ──
export async function postStudioStory(studioId: string, content: string, mediaUrl?: string) {
  const expires = new Date(Date.now() + 24 * 86_400_000).toISOString();
  await requireClient().from('studio_stories').insert({ studio_id: studioId, content, media_url: mediaUrl ?? null, expires_at: expires });
}

export async function fetchStudioStories(studioId: string): Promise<StudioStory[]> {
  const { data } = await requireClient()
    .from('studio_stories')
    .select('*')
    .eq('studio_id', studioId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  return (data ?? []) as StudioStory[];
}

// ── Polls ──
export async function votePoll(pollId: string, userId: string, optionIndex: number) {
  const { data: poll } = await requireClient().from('comment_polls').select('votes').eq('id', pollId).single();
  const votes = (poll?.votes as Record<string, number>) ?? {};
  votes[userId] = optionIndex;
  await requireClient().from('comment_polls').update({ votes }).eq('id', pollId);
}

export async function fetchPollForComment(commentId: string): Promise<CommentPoll | null> {
  const { data } = await requireClient().from('comment_polls').select('*').eq('comment_id', commentId).maybeSingle();
  return data as CommentPoll | null;
}

// ── Fan clubs ──
export async function joinFanClub(clubId: string, userId: string) {
  const { count } = await requireClient().from('fan_club_members').select('id', { count: 'exact', head: true }).eq('club_id', clubId);
  const { data: club } = await requireClient().from('fan_clubs').select('max_members').eq('id', clubId).single();
  if ((count ?? 0) >= (club?.max_members ?? 100)) throw new Error('FULL');
  await requireClient().from('fan_club_members').insert({ club_id: clubId, user_id: userId });
}

export async function fetchFanClub(studioId: string): Promise<FanClub | null> {
  const { data } = await requireClient().from('fan_clubs').select('*, members:fan_club_members(count)').eq('studio_id', studioId).maybeSingle();
  return data as FanClub | null;
}

// ── Voice DM ──
export async function sendVoiceMessage(senderId: string, receiverId: string, audioUrl: string, duration: number) {
  const { data, error } = await requireClient()
    .from('voice_messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, audio_url: audioUrl, duration_seconds: duration })
    .select()
    .single();
  if (error) throw error;
  return data as VoiceMessage;
}

// ── Tips ──
export async function sendTip(senderId: string, receiverId: string, amountCents: number, message?: string) {
  const { data, error } = await requireClient()
    .from('tips')
    .insert({ sender_id: senderId, receiver_id: receiverId, amount_cents: amountCents, message, status: 'completed' })
    .select()
    .single();
  if (error) throw error;
  return data as Tip;
}

// ── Push subscription ──
export async function savePushSubscription(userId: string, subscription: PushSubscriptionJSON) {
  await requireClient().from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint!,
    keys: subscription.keys,
  });
}

// ── Live WebRTC signals ──
export async function sendLiveSignal(sessionId: string, senderId: string, signalType: string, payload: unknown) {
  await requireClient().from('live_signals').insert({ session_id: sessionId, sender_id: senderId, signal_type: signalType, payload });
}

// ── Exclusive access check ──
export async function canAccessSong(song: Song, userId?: string, isFollower = false): Promise<boolean> {
  if (song.status === 'draft') return false;
  if (song.status === 'scheduled' && song.publish_at && new Date(song.publish_at) > new Date()) return false;
  if (song.followers_only && !isFollower && song.studio?.owner_id !== userId) return false;
  if (song.early_access_until && new Date(song.early_access_until) > new Date() && !isFollower && song.studio?.owner_id !== userId) return false;
  return true;
}

export async function fetchPublishedSongs(studioId: string, userId?: string): Promise<Song[]> {
  const { data } = await requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .eq('studio_id', studioId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });
  const songs = (data ?? []).map(normSong);
  const now = new Date();
  return songs.filter((s) => {
    if (s.status === 'scheduled' && s.publish_at && new Date(s.publish_at) > now) return s.studio?.owner_id === userId;
    return true;
  });
}
