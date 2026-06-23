import type { TasteMatchReason } from '../lib/tasteAlgorithm';
import { useTranslation } from 'react-i18next';

interface WhyThisSongProps {
  open: boolean;
  onClose: () => void;
  reasons: TasteMatchReason[];
  tags: string[];
  username: string;
  score: number;
  likedSongIds?: string[];
}

export default function WhyThisSongModal({ open, onClose, reasons, tags, username, score, likedSongIds = [] }: WhyThisSongProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const uniqueReasons = [...new Set(reasons)];

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="reels-sheet w-full max-w-md rounded-t-3xl bg-[#121218]/95 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-medium text-white">{t('whySong.title')}</h3>
        <p className="mt-1 text-xs text-white/50">{t('whySong.matchScore', { score: Math.round(score) })}</p>
        <ul className="mt-4 space-y-2">
          {uniqueReasons.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-white/90">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              <span>{t(`whySong.reasons.${r}`)}</span>
            </li>
          ))}
          {likedSongIds.length > 0 && (
            <li className="text-xs text-white/60">{t('reelsFeatures.whyLikedCount', { count: likedSongIds.length })}</li>
          )}
          {tags.length > 0 && (
            <li className="flex flex-wrap gap-1 pt-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">#{tag}</span>
              ))}
            </li>
          )}
          <li className="text-xs text-blue-300">@{username}</li>
        </ul>
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl bg-white/10 py-2 text-sm text-white">
          {t('whySong.ok')}
        </button>
      </div>
    </div>
  );
}
