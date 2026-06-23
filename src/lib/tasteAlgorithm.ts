import type { Song } from './types';

/** ملف ذوق المستخدم — يُبنى من الإعجابات، المتابعات، والتفاعلات */
export interface TasteProfile {
  tagWeights: Record<string, number>;
  artistWeights: Record<string, number>;
  likedSongIds: Set<string>;
  skippedSongIds: Set<string>;
  positivelyWatchedIds: Set<string>;
}

export interface ScoredSong {
  song: Song;
  score: number;
  matchReasons: TasteMatchReason[];
  isDiscover?: boolean;
  isRepost?: boolean;
  repostClip?: { start: number; end: number };
}

export type TasteMatchReason = 'tag' | 'artist' | 'following' | 'popular' | 'fresh' | 'liked' | 'similar' | 'repost' | 'discover';

const TAG_BOOST = 18;
const ARTIST_BOOST = 22;
const FOLLOWING_BOOST = 28;
const SKIP_PENALTY = 35;
const EXPLORE_JITTER = 8;

/** بناء ملف الذوق من الأغاني المعجَب بها + المتابَعين + التخزين المحلي */
export function buildTasteProfile(
  likedSongs: Song[],
  followingOwnerIds: string[],
  localBoosts: { tags: Record<string, number>; artists: Record<string, number>; skipped: string[]; watched: string[] }
): TasteProfile {
  const tagWeights: Record<string, number> = { ...localBoosts.tags };
  const artistWeights: Record<string, number> = { ...localBoosts.artists };
  const likedSongIds = new Set<string>();

  for (const song of likedSongs) {
    likedSongIds.add(song.id);
    const ownerId = song.studio?.owner_id;
    if (ownerId) artistWeights[ownerId] = (artistWeights[ownerId] ?? 0) + 0.6;

    for (const tag of song.tags ?? []) {
      tagWeights[tag] = (tagWeights[tag] ?? 0) + 0.5;
    }
  }

  for (const id of followingOwnerIds) {
    artistWeights[id] = (artistWeights[id] ?? 0) + 0.4;
  }

  return {
    tagWeights,
    artistWeights,
    likedSongIds,
    skippedSongIds: new Set(localBoosts.skipped),
    positivelyWatchedIds: new Set(localBoosts.watched),
  };
}

/** حساب درجة ملاءمة أغنية لذوق المستخدم */
export function scoreSong(
  song: Song,
  profile: TasteProfile,
  followingIds: Set<string>
): ScoredSong {
  let score = 0;
  const matchReasons: TasteMatchReason[] = [];

  const ageDays = (Date.now() - new Date(song.created_at).getTime()) / 86_400_000;
  score += Math.max(0, 12 - ageDays * 0.4);
  if (ageDays < 7) matchReasons.push('fresh');

  for (const tag of song.tags ?? []) {
    const w = profile.tagWeights[tag] ?? 0;
    if (w > 0) {
      score += w * TAG_BOOST;
      if (!matchReasons.includes('tag')) matchReasons.push('tag');
    }
  }

  const ownerId = song.studio?.owner_id;
  if (ownerId) {
    const aw = profile.artistWeights[ownerId] ?? 0;
    if (aw > 0) {
      score += aw * ARTIST_BOOST;
      if (!matchReasons.includes('artist')) matchReasons.push('artist');
    }
    if (followingIds.has(ownerId)) {
      score += FOLLOWING_BOOST;
      if (!matchReasons.includes('following')) matchReasons.push('following');
    }
  }

  if (profile.positivelyWatchedIds.has(song.id)) score += 8;

  if (profile.likedSongIds.has(song.id)) {
    score += 15;
    matchReasons.push('liked');
  }

  if (song.clip_end_seconds != null && song.clip_end_seconds > (song.clip_start_seconds ?? 0)) {
    score += 6;
  }

  score += Math.log1p(song.play_count ?? 0) * 1.5;
  score += Math.log1p(song.like_count ?? 0) * 2;
  if (song.like_count > 5) matchReasons.push('popular');

  if (profile.skippedSongIds.has(song.id)) score -= SKIP_PENALTY;

  // استكشاف: 15% عشوائية لاكتشاف أنماط جديدة
  score += Math.random() * EXPLORE_JITTER;

  return { song, score, matchReasons };
}

/** إعادة ترتيب مع تنويع + anti-echo chamber */
export function diversifyFeed(scored: ScoredSong[], maxSameArtistInRow = 2, exploreEvery = 5): ScoredSong[] {
  const result: ScoredSong[] = [];
  const remaining = [...scored].sort((a, b) => b.score - a.score);
  const seenTags = new Set<string>();

  while (remaining.length > 0) {
    let pickedIdx = 0;

    // Anti-echo: every Nth item pick lowest-overlap tag song
    if (result.length > 0 && result.length % exploreEvery === 0 && remaining.length > 1) {
      const exploreIdx = remaining.findIndex((s) => {
        const tags = s.song.tags ?? [];
        return tags.length === 0 || tags.some((t) => !seenTags.has(t));
      });
      if (exploreIdx >= 0) pickedIdx = exploreIdx;
    } else if (result.length >= maxSameArtistInRow) {
      const recentArtists = result.slice(-maxSameArtistInRow).map((s) => s.song.studio?.owner_id).filter(Boolean);
      const allSame = recentArtists.length === maxSameArtistInRow && recentArtists.every((id) => id === recentArtists[0]);
      if (allSame) {
        const blocked = recentArtists[0];
        const alt = remaining.findIndex((s) => s.song.studio?.owner_id !== blocked);
        if (alt >= 0) pickedIdx = alt;
      }
    }

    const picked = remaining.splice(pickedIdx, 1)[0]!;
    for (const t of picked.song.tags ?? []) seenTags.add(t);
    result.push(picked);
  }

  return result;
}

/** الخوارزمية الرئيسية: ترتيب الأغاني حسب الذوق */
export function rankSongsForUser(
  candidates: Song[],
  profile: TasteProfile,
  followingIds: string[],
  limit: number,
  exploreEvery = 5
): ScoredSong[] {
  const followingSet = new Set(followingIds);
  const scored = candidates.map((song) => scoreSong(song, profile, followingSet));
  const diversified = diversifyFeed(scored, 2, exploreEvery);
  return diversified.slice(0, limit);
}

/** هل الأغنية "عالية الملاءمة" للعرض كشارة؟ */
export function isHighMatch(scored: ScoredSong, threshold = 25): boolean {
  return scored.score >= threshold && scored.matchReasons.some((r) => r === 'tag' || r === 'artist' || r === 'following');
}
