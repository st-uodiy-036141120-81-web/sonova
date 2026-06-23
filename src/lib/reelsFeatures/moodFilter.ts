import type { Song } from '../types';

export type ReelMood = 'all' | 'focus' | 'sad' | 'energy' | 'night' | 'workout';

export const REEL_MOODS: { id: ReelMood; tags: string[] }[] = [
  { id: 'all', tags: [] },
  { id: 'focus', tags: ['ambient', 'calm', 'drone'] },
  { id: 'sad', tags: ['acoustic', 'roots', 'slow'] },
  { id: 'energy', tags: ['electronic', 'dance', 'upbeat'] },
  { id: 'night', tags: ['ambient', 'night', 'chill'] },
  { id: 'workout', tags: ['electronic', 'energy', 'fast'] },
];

export function songMatchesMood(song: Song, mood: ReelMood): boolean {
  if (mood === 'all') return true;
  const def = REEL_MOODS.find((m) => m.id === mood);
  if (!def) return true;
  const tags = new Set([...(song.tags ?? []), ...(song.mood_tags ?? [])].map((t) => t.toLowerCase()));
  return def.tags.some((t) => tags.has(t));
}

export function filterSongsByMood<T extends Song>(songs: T[], mood: ReelMood): T[] {
  if (mood === 'all') return songs;
  return songs.filter((s) => songMatchesMood(s, mood));
}
