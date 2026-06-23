import { requireClient, POPULAR_TAGS } from './api';
import type { LiveSession, Song } from './types';

export { POPULAR_TAGS };

export async function recordListenEvent(userId: string | null, songId: string, durationMs: number) {
  await requireClient().from('song_listen_events').insert({
    user_id: userId,
    song_id: songId,
    duration_ms: durationMs,
  });
}

export async function saveTasteTags(userId: string, tags: string[]) {
  await requireClient().from('profiles').update({ taste_tags: tags }).eq('id', userId);
}

export async function fetchSongById(songId: string): Promise<Song | null> {
  const { data, error } = await requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .eq('id', songId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  let original: { id: string; title: string } | null = null;
  if (data.original_song_id) {
    const { data: orig } = await requireClient()
      .from('songs')
      .select('id, title')
      .eq('id', data.original_song_id)
      .maybeSingle();
    if (orig) original = orig;
  }

  return {
    ...data,
    tags: data.tags ?? [],
    play_count: data.play_count ?? 0,
    download_count: data.download_count ?? 0,
    like_count: data.like_count ?? 0,
    original,
  } as Song;
}

export async function registerEarlyListener(songId: string, userId: string) {
  const { count } = await requireClient()
    .from('early_listeners')
    .select('id', { count: 'exact', head: true })
    .eq('song_id', songId);
  if ((count ?? 0) >= 100) return null;
  const order = (count ?? 0) + 1;
  await requireClient()
    .from('early_listeners')
    .upsert({ song_id: songId, user_id: userId, listen_order: order });
  return order;
}

export async function fetchEarlyListenerBadge(songId: string, userId: string): Promise<number | null> {
  const { data } = await requireClient()
    .from('early_listeners')
    .select('listen_order')
    .eq('song_id', songId)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.listen_order ?? null;
}

export async function submitAppeal(
  userId: string,
  reason: string,
  songId?: string,
  commentId?: string
) {
  const { error } = await requireClient()
    .from('song_appeals')
    .insert({ user_id: userId, reason, song_id: songId ?? null, comment_id: commentId ?? null });
  if (error) throw error;
}

export async function subscribeNewsletter(email: string, userId?: string) {
  const { error } = await requireClient()
    .from('newsletter_subscribers')
    .insert({ email, user_id: userId ?? null });
  if (error) throw error;
}

export async function startLiveSession(studioId: string, hostId: string, title: string) {
  await requireClient()
    .from('live_sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('studio_id', studioId)
    .eq('is_active', true);
  const { data, error } = await requireClient()
    .from('live_sessions')
    .insert({ studio_id: studioId, host_id: hostId, title, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data as LiveSession;
}

export async function endLiveSession(sessionId: string) {
  await requireClient()
    .from('live_sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('id', sessionId);
}

export async function fetchActiveLive(studioId: string): Promise<LiveSession | null> {
  const { data } = await requireClient()
    .from('live_sessions')
    .select('*, host:profiles(*)')
    .eq('studio_id', studioId)
    .eq('is_active', true)
    .maybeSingle();
  return data as LiveSession | null;
}

export async function applyReferral(newUserId: string, referralCode: string) {
  const { data: referrer } = await requireClient()
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode)
    .maybeSingle();
  if (!referrer) return;
  await requireClient().from('profiles').update({ referred_by: referrer.id }).eq('id', newUserId);
}

export async function ensureReferralCode(userId: string, username: string) {
  const code = username.slice(0, 12).toLowerCase();
  await requireClient().from('profiles').update({ referral_code: code }).eq('id', userId).is('referral_code', null);
  return code;
}

export async function incrementTrustScore(userId: string, delta: number) {
  const { data } = await requireClient().from('profiles').select('trust_score').eq('id', userId).single();
  const next = Math.min(100, Math.max(0, (data?.trust_score ?? 0) + delta));
  await requireClient().from('profiles').update({ trust_score: next }).eq('id', userId);
  return next;
}
