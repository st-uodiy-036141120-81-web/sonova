import {
  fetchReelsSongs,
  fetchUserLikedSongs,
  fetchFollowingOwnerIds,
  fetchBlockedIds,
  requireClient,
} from './api';
import { fetchUserSettings } from './userSettingsApi';
import { filterSongsForReels } from './userSettings';
import { buildTasteProfile, rankSongsForUser, isHighMatch, type ScoredSong } from './tasteAlgorithm';
import { loadLocalTaste } from './tasteStorage';
import type { Song } from './types';
import { filterSongsByMood, type ReelMood } from './reelsFeatures/moodFilter';
import { fetchClipReposts } from './reelsFeatures/api';

export interface PersonalizedReelsResult {
  feed: ScoredSong[];
  tasteStrength: number;
}

function normalizeSong(row: Record<string, unknown>): Song {
  return {
    ...row,
    tags: (row.tags as string[]) ?? [],
    mood_tags: (row.mood_tags as string[]) ?? [],
    play_count: (row.play_count as number) ?? 0,
    download_count: (row.download_count as number) ?? 0,
    like_count: (row.like_count as number) ?? 0,
  } as Song;
}

function isClipVisible(song: Song): boolean {
  if (!song.clip_scheduled_at) return true;
  return new Date(song.clip_scheduled_at).getTime() <= Date.now();
}

/** Personalized reels feed with mood, discover, reposts */
export async function fetchPersonalizedReels(
  userId: string | undefined,
  limit = 40,
  options?: { mood?: ReelMood }
): Promise<PersonalizedReelsResult> {
  const mood = options?.mood ?? 'all';
  const poolSize = Math.max(limit * 3, 80);

  if (!userId) {
    let candidates = await fetchReelsSongs(poolSize);
    candidates = filterSongsByMood(candidates.filter(isClipVisible), mood);
    return {
      feed: candidates.map((song) => ({ song, score: 0, matchReasons: [] })),
      tasteStrength: 0,
    };
  }

  const [{ data, error }, likedSongs, followingIds, blocked, settings, reposts] = await Promise.all([
    requireClient()
      .from('songs')
      .select('*, studio:studios(*, owner:profiles(*))')
      .order('created_at', { ascending: false })
      .limit(poolSize),
    fetchUserLikedSongs(userId),
    fetchFollowingOwnerIds(userId),
    fetchBlockedIds(userId),
    fetchUserSettings(userId),
    fetchClipReposts(15),
  ]);

  if (error) throw error;

  const followingSet = new Set(followingIds);
  let candidates = filterSongsForReels(
    (data ?? []).map(normalizeSong).filter((s) => !blocked.has(s.studio?.owner_id ?? '') && isClipVisible(s)),
    settings
  );
  candidates = filterSongsByMood(candidates, mood);

  const localTaste = loadLocalTaste(userId);
  const profile = buildTasteProfile(likedSongs, followingIds, localTaste);

  const tagCount = Object.keys(profile.tagWeights).length;
  const artistCount = Object.keys(profile.artistWeights).length;
  const tasteStrength = Math.min(
    1,
    (likedSongs.length * 0.08 + followingIds.length * 0.05 + tagCount * 0.1 + artistCount * 0.1)
  );

  const exploreEvery = Math.max(3, Math.round(8 - (settings.explorationLevel / 100) * 5));
  let ranked = rankSongsForUser(candidates, profile, followingIds, limit, exploreEvery);

  const likedIds = new Set(likedSongs.map((s) => s.id));
  let feed: ScoredSong[] = ranked.map((item) => ({
    ...item,
    song: { ...item.song, liked_by_me: likedIds.has(item.song.id) },
  }));

  const discover = candidates
    .filter((s) => !followingSet.has(s.studio?.owner_id ?? '') && !likedIds.has(s.id))
    .slice(0, 2)
    .map((song) => ({
      song: { ...song, liked_by_me: false },
      score: 50,
      matchReasons: ['discover' as const],
      isDiscover: true,
    }));

  if (discover.length && feed.length > 3) {
    feed.splice(2, 0, discover[0]!);
    if (discover[1]) feed.splice(7, 0, discover[1]);
  }

  const repostItems: ScoredSong[] = reposts
    .filter((r) => r.source && !blocked.has(r.source.studio?.owner_id ?? ''))
    .slice(0, 5)
    .map((r) => ({
      song: { ...r.source!, liked_by_me: likedIds.has(r.source!.id) },
      score: 40,
      matchReasons: ['repost' as const],
      isRepost: true,
      repostClip: { start: r.clip_start, end: r.clip_end },
    }));

  feed = [...repostItems.slice(0, 2), ...feed].slice(0, limit);

  return { feed, tasteStrength };
}

export { isHighMatch };
