import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchSongReactions, toggleSongReaction } from '../../lib/reelsFeatures/api';
import type { SongReactionType } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';

const REACTIONS: { type: SongReactionType; emoji: string }[] = [
  { type: 'fire', emoji: '🔥' },
  { type: 'headphones', emoji: '🎧' },
  { type: 'vinyl', emoji: '💿' },
];

interface ReelReactionsBarProps {
  songId: string;
}

export default function ReelReactionsBar({ songId }: ReelReactionsBarProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [counts, setCounts] = useState({ fire: 0, headphones: 0, vinyl: 0 });
  const [mine, setMine] = useState<Set<SongReactionType>>(new Set());

  useEffect(() => {
    fetchSongReactions(songId, user?.id).then((c) => {
      setCounts({ fire: c.fire, headphones: c.headphones, vinyl: c.vinyl });
      setMine(new Set(c.mine));
    });
  }, [songId, user?.id]);

  const toggle = async (type: SongReactionType) => {
    if (!user) return;
    const on = await toggleSongReaction(user.id, songId, type);
    setMine((prev) => {
      const next = new Set(prev);
      if (on) next.add(type);
      else next.delete(type);
      return next;
    });
    setCounts((c) => ({ ...c, [type]: Math.max(0, c[type] + (on ? 1 : -1)) }));
  };

  return (
    <div className="flex gap-2">
      {REACTIONS.map(({ type, emoji }) => (
        <button
          key={type}
          type="button"
          onClick={() => toggle(type)}
          className={`flex flex-col items-center rounded-full px-2 py-1 ${mine.has(type) ? 'bg-white/25' : 'bg-white/10'}`}
          title={t(`reelsFeatures.reactions.${type}`)}
        >
          <span className="text-lg">{emoji}</span>
          <span className="text-[10px] text-white/80">{counts[type]}</span>
        </button>
      ))}
    </div>
  );
}
