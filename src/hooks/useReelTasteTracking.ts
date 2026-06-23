import { useEffect, useRef } from 'react';
import type { Song } from '../lib/types';
import { recordPositiveWatch, recordSkip } from '../lib/tasteStorage';
import { recordListenEvent, registerEarlyListener } from '../lib/featuresApi';

const POSITIVE_WATCH_MS = 8000;
const SKIP_THRESHOLD_MS = 2000;

/** تتبع مدة مشاهدة الريل لتحسين خوارزمية الذوق + مزامنة Supabase */
export function useReelTasteTracking(song: Song, isActive: boolean, userId?: string) {
  const startRef = useRef<number | null>(null);
  const recordedRef = useRef(false);
  const earlyRef = useRef(false);

  useEffect(() => {
    if (isActive && userId && !earlyRef.current) {
      registerEarlyListener(song.id, userId).catch(() => {});
      earlyRef.current = true;
    }
  }, [isActive, song.id, userId]);

  useEffect(() => {
    if (isActive) {
      startRef.current = Date.now();
      recordedRef.current = false;
      return;
    }

    if (startRef.current === null || recordedRef.current) return;

    const duration = Date.now() - startRef.current;
    recordedRef.current = true;
    startRef.current = null;

    const tags = song.tags ?? [];
    const artistId = song.studio?.owner_id;

    recordListenEvent(userId ?? null, song.id, duration).catch(() => {});

    if (duration >= POSITIVE_WATCH_MS) {
      recordPositiveWatch(song.id, tags, artistId, userId);
    } else if (duration < SKIP_THRESHOLD_MS) {
      recordSkip(song.id, tags, artistId, userId);
    }
  }, [isActive, song, userId]);
}
