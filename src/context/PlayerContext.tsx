import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerTrack } from '../lib/types';
import { getPlaybackSpeed, getSleepUntil, clearSleepTimer, setPlaybackSpeed } from '../lib/localFeatures';
import { recordListenCompletion } from '../lib/platformApi';
import { useAuth } from './AuthContext';
import { useUserSettings } from './UserSettingsContext';

interface PlayerContextValue {
  current: PlayerTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  queue: PlayerTrack[];
  playbackSpeed: number;
  play: (track: PlayerTrack, queue?: PlayerTrack[], startAt?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (ratio: number) => void;
  setSpeed: (s: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<PlayerTrack | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(settings.defaultSpeed);
  const completionSent = useRef(false);

  useEffect(() => {
    setPlaybackSpeedState(settings.defaultSpeed);
    if (audioRef.current) audioRef.current.playbackRate = settings.defaultSpeed;
  }, [settings.defaultSpeed]);

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.preload = 'metadata';
    audio.playbackRate = playbackSpeed;

    const onTime = () => {
      setProgress(audio.currentTime);
      if (audio.duration && !completionSent.current && audio.currentTime / audio.duration >= 0.8) {
        completionSent.current = true;
        if (current) recordListenCompletion(user?.id ?? null, current.id, audio.currentTime / audio.duration).catch(() => {});
      }
      const sleepUntil = getSleepUntil();
      if (sleepUntil && Date.now() >= sleepUntil) {
        audio.pause();
        setIsPlaying(false);
        clearSleepTimer();
      }
    };
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      setIsPlaying(false);
      setProgress(0);
      completionSent.current = false;
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [current, user?.id, playbackSpeed]);

  const play = useCallback((track: PlayerTrack, newQueue?: PlayerTrack[], startAt?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    completionSent.current = false;
    setCurrent(track);
    if (newQueue) setQueue(newQueue);
    audio.src = track.file_url;
    audio.playbackRate = playbackSpeed;
    const seekTo = startAt ?? track.startAt ?? 0;
    const onMeta = () => {
      if (seekTo > 0) audio.currentTime = seekTo;
      audio.removeEventListener('loadedmetadata', onMeta);
    };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [playbackSpeed]);

  const setSpeed = useCallback((s: number) => {
    setPlaybackSpeedState(s);
    setPlaybackSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(() => {}); }
  }, [current, isPlaying]);

  const next = useCallback(() => {
    if (!current || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === current.id);
    const nextTrack = queue[(idx + 1) % queue.length];
    if (nextTrack) play(nextTrack);
  }, [current, queue, play]);

  const prev = useCallback(() => {
    if (!current || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === current.id);
    const prevTrack = queue[(idx - 1 + queue.length) % queue.length];
    if (prevTrack) play(prevTrack);
  }, [current, queue, play]);

  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = ratio * duration;
    setProgress(audio.currentTime);
  }, [duration]);

  const value = useMemo(
    () => ({ current, isPlaying, progress, duration, queue, playbackSpeed, play, toggle, next, prev, seek, setSpeed }),
    [current, isPlaying, progress, duration, queue, playbackSpeed, play, toggle, next, prev, seek, setSpeed]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

function formatTime(s: number) {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function SpeedButton({ onSpeedChange }: { onSpeedChange: (s: number) => void }) {
  const [speed, setSpeed] = useState(getPlaybackSpeed());
  const cycle = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!;
    setSpeed(next);
    onSpeedChange(next);
  };
  return <button type="button" onClick={cycle} className="text-[10px] text-gray-500">{speed}x</button>;
}

export function GlobalPlayer() {
  const { t } = useTranslation();
  const { current, isPlaying, progress, duration, toggle, next, prev, seek, setSpeed } = usePlayer();
  if (!current) return null;

  const pct = duration ? (progress / duration) * 100 : 0;
  const remaining = duration - progress;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 w-auto sm:w-80 animate-fade-up">
      <div className="rounded-2xl bg-white p-2.5 pr-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-xs font-medium text-white">
            {current.file_type.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-900">{current.title}</p>
            <p className="truncate text-xs text-gray-500">{current.artist}</p>
            <button type="button" className="mt-2 h-1 w-full rounded-full bg-gray-200" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek((e.clientX - rect.left) / rect.width);
            }}>
              <span className="block h-1 rounded-full bg-blue-700" style={{ width: `${pct}%` }} />
            </button>
            <div className="mt-1 flex justify-between">
              <span className="text-[10px] text-gray-500">{formatTime(progress)}</span>
              <span className="text-[10px] text-gray-500">-{formatTime(remaining)}</span>
            </div>
          </div>
        </div>
        <div className="mt-2 px-1"><SpeedButton onSpeedChange={setSpeed} /></div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={prev} className="flex flex-1 items-center justify-center rounded-2xl bg-white py-2 text-sm text-gray-900 shadow-lg">{t('player.prev')}</button>
        <button type="button" onClick={toggle} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg">{isPlaying ? '⏸' : '▶'}</button>
        <button type="button" onClick={next} className="flex flex-1 items-center justify-center rounded-2xl bg-white py-2 text-sm text-gray-900 shadow-lg">{t('player.next')}</button>
      </div>
    </div>
  );
}
