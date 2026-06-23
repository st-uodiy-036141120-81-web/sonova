import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StudioStory } from '../lib/types';
import { fetchStudioStories } from '../lib/platformApi';

interface StudioStoriesBarProps {
  studioId: string;
}

export default function StudioStoriesBar({ studioId }: StudioStoriesBarProps) {
  const { t } = useTranslation();
  const [stories, setStories] = useState<StudioStory[]>([]);
  const [active, setActive] = useState<StudioStory | null>(null);

  useEffect(() => {
    fetchStudioStories(studioId).then(setStories).catch(() => {});
  }, [studioId]);

  if (stories.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stories.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s)}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 p-0.5"
          >
            <span className="flex h-full w-full items-center justify-center rounded-full bg-black text-lg">📖</span>
          </button>
        ))}
      </div>
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setActive(null)}>
          <div className="max-w-sm rounded-2xl bg-[#121218] p-6 text-white" onClick={(e) => e.stopPropagation()}>
            <p>{active.content}</p>
            {active.media_url && <img src={active.media_url} alt="" className="mt-3 rounded-xl" />}
            <button type="button" onClick={() => setActive(null)} className="mt-4 text-sm text-white/60">{t('common.close')}</button>
          </div>
        </div>
      )}
    </>
  );
}
