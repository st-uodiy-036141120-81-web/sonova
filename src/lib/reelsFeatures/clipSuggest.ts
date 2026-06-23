import { DEFAULT_REEL_CLIP_SECONDS, MAX_REEL_CLIP_SECONDS, MIN_REEL_CLIP_SECONDS } from '../reelClip';

/** Find the highest-energy window in waveform peaks for auto clip suggestion */
export function suggestClipFromPeaks(
  peaks: number[],
  durationSeconds: number,
  windowSeconds = DEFAULT_REEL_CLIP_SECONDS
): { start: number; end: number } {
  if (!peaks.length || durationSeconds <= 0) {
    return { start: 0, end: Math.min(windowSeconds, durationSeconds || windowSeconds) };
  }

  const secPerBin = durationSeconds / peaks.length;
  const windowBins = Math.max(1, Math.round(windowSeconds / secPerBin));
  let bestStart = 0;
  let bestScore = -1;

  for (let i = 0; i <= peaks.length - windowBins; i++) {
    let sum = 0;
    for (let j = i; j < i + windowBins; j++) sum += peaks[j] ?? 0;
    if (sum > bestScore) {
      bestScore = sum;
      bestStart = i;
    }
  }

  const start = Math.floor(bestStart * secPerBin);
  const len = Math.min(windowSeconds, MAX_REEL_CLIP_SECONDS, durationSeconds - start);
  const end = Math.max(start + MIN_REEL_CLIP_SECONDS, start + len);
  return { start, end: Math.min(end, durationSeconds) };
}
