export const MAX_REEL_CLIP_SECONDS = 90;
export const DEFAULT_REEL_CLIP_SECONDS = 30;
export const MIN_REEL_CLIP_SECONDS = 5;

export interface ReelClipRange {
  start: number;
  end: number;
}

export function hasReelClip(song: { clip_end_seconds?: number | null; clip_start_seconds?: number }): boolean {
  if (song.clip_end_seconds == null) return false;
  return song.clip_end_seconds > (song.clip_start_seconds ?? 0);
}

/** Clip bounds for reels/stories playback */
export function getReelClipBounds(
  song: {
    clip_start_seconds?: number;
    clip_end_seconds?: number | null;
    duration_seconds?: number | null;
    reel_clips?: { start_seconds: number; end_seconds: number; is_primary?: boolean }[];
  },
  storyMode = false,
  override?: { start?: number; end?: number }
): { clipStart: number; clipEnd: number | null } {
  if (override?.start != null && override?.end != null) {
    return { clipStart: override.start, clipEnd: override.end };
  }
  const variant = song.reel_clips?.find((c) => c.is_primary) ?? song.reel_clips?.[0];
  if (variant) {
    return { clipStart: variant.start_seconds, clipEnd: variant.end_seconds };
  }
  if (hasReelClip(song)) {
    return {
      clipStart: song.clip_start_seconds ?? 0,
      clipEnd: song.clip_end_seconds ?? null,
    };
  }
  if (storyMode) {
    const start = song.clip_start_seconds ?? 0;
    const end = song.duration_seconds
      ? Math.min(start + DEFAULT_REEL_CLIP_SECONDS, song.duration_seconds)
      : start + DEFAULT_REEL_CLIP_SECONDS;
    return { clipStart: start, clipEnd: end };
  }
  return { clipStart: 0, clipEnd: null };
}

export function formatClipTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function validateReelClip(
  start: number,
  end: number,
  durationSeconds: number | null,
  t: (key: string, opts?: Record<string, unknown>) => string
): string | null {
  if (end <= start) return t('reelsClip.endBeforeStart');
  const len = end - start;
  if (len < MIN_REEL_CLIP_SECONDS) return t('reelsClip.tooShort', { min: MIN_REEL_CLIP_SECONDS });
  if (len > MAX_REEL_CLIP_SECONDS) return t('reelsClip.tooLong', { max: MAX_REEL_CLIP_SECONDS });
  if (durationSeconds != null && end > durationSeconds) {
    return t('reelsClip.exceedsDuration', { time: formatClipTime(durationSeconds) });
  }
  return null;
}

export function defaultClipRange(durationSeconds: number | null): ReelClipRange {
  const start = 0;
  const maxEnd = durationSeconds ?? DEFAULT_REEL_CLIP_SECONDS;
  const end = Math.min(DEFAULT_REEL_CLIP_SECONDS, maxEnd);
  return { start, end: Math.max(end, Math.min(MIN_REEL_CLIP_SECONDS, maxEnd)) };
}
