import type { PlayerTrack } from '../types';

const MIX_KEY = 'sonova_reels_mix';

export function addToReelsMix(track: PlayerTrack): void {
  const list = getReelsMix().filter((t) => t.id !== track.id);
  list.unshift(track);
  localStorage.setItem(MIX_KEY, JSON.stringify(list.slice(0, 15)));
}

export function getReelsMix(): PlayerTrack[] {
  try {
    return JSON.parse(localStorage.getItem(MIX_KEY) ?? '[]') as PlayerTrack[];
  } catch {
    return [];
  }
}

export function clearReelsMix(): void {
  localStorage.removeItem(MIX_KEY);
}
