import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gauge, Moon, Cast } from 'lucide-react';
import { getPlaybackSpeed, setPlaybackSpeed, setSleepTimer, clearSleepTimer } from '../lib/localFeatures';

interface PlaybackControlsProps {
  onSpeedChange?: (speed: number) => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];
const SLEEP_OPTIONS = [15, 30, 60];

export default function PlaybackControls({ onSpeedChange }: PlaybackControlsProps) {
  const { t } = useTranslation();
  const [speed, setSpeed] = useState(getPlaybackSpeed());
  const [sleepSet, setSleepSet] = useState<number | null>(null);

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length]!;
    setSpeed(next);
    setPlaybackSpeed(next);
    onSpeedChange?.(next);
  };

  const setSleep = (min: number) => {
    setSleepTimer(min);
    setSleepSet(min);
  };

  const cast = () => {
    const audio = document.querySelector('audio');
    if (audio && 'remote' in audio) {
      (audio as HTMLMediaElement & { remote?: { prompt: () => void } }).remote?.prompt();
    } else {
      alert(t('playback.castUnavailable'));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={cycleSpeed} className="liquid-glass flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--text-primary)]">
        <Gauge size={12} /> {speed}x
      </button>
      <div className="flex gap-1">
        {SLEEP_OPTIONS.map((m) => (
          <button key={m} type="button" onClick={() => setSleep(m)} className={`rounded-lg px-2 py-1 text-[10px] ${sleepSet === m ? 'bg-blue-700 text-white' : 'bg-white/10 text-[var(--text-muted)]'}`}>
            <Moon size={10} className="inline" /> {m}m
          </button>
        ))}
        {sleepSet && (
          <button type="button" onClick={() => { clearSleepTimer(); setSleepSet(null); }} className="text-[10px] text-red-400">×</button>
        )}
      </div>
      <button type="button" onClick={cast} className="liquid-glass flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--text-primary)]">
        <Cast size={12} /> {t('playback.cast')}
      </button>
    </div>
  );
}
