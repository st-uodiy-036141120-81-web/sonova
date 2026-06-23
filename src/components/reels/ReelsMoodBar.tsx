import { useTranslation } from 'react-i18next';
import type { ReelMood } from '../../lib/reelsFeatures/moodFilter';
import { REEL_MOODS } from '../../lib/reelsFeatures/moodFilter';

interface ReelsMoodBarProps {
  mood: ReelMood;
  onChange: (m: ReelMood) => void;
}

export default function ReelsMoodBar({ mood, onChange }: ReelsMoodBarProps) {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {REEL_MOODS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs backdrop-blur-md ${
            mood === m.id ? 'bg-white text-black' : 'bg-white/15 text-white/80'
          }`}
        >
          {t(`reelsFeatures.mood.${m.id}`)}
        </button>
      ))}
    </div>
  );
}
