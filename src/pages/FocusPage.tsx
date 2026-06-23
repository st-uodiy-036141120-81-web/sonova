import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { fetchPersonalizedReels } from '../lib/personalizedReels';
import { useAuth } from '../context/AuthContext';
import type { ScoredSong } from '../lib/tasteAlgorithm';

/** Minimal distraction-free listening */
export default function FocusPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [feed, setFeed] = useState<ScoredSong[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    fetchPersonalizedReels(user?.id, 20).then(({ feed: f }) => setFeed(f));
  }, [user?.id]);

  const current = feed[index]?.song;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = current.file_url;
    if (playing) audio.play().catch(() => {});
    const onEnd = () => setIndex((i) => (i + 1) % feed.length);
    audio.addEventListener('ended', onEnd);
    return () => audio.removeEventListener('ended', onEnd);
  }, [current, playing, feed.length]);

  if (!current) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white/50">
        {t('common.loading')}
      </div>
    );
  }

  const username = current.studio?.owner?.username ?? '';

  return (
    <div className="relative flex h-screen flex-col items-center justify-center bg-black px-6">
      <Link to="/" className="absolute top-6 right-6 text-white/50 hover:text-white">
        <X size={24} />
      </Link>
      <p className="text-xs uppercase tracking-widest text-white/30">{t('focus.title')}</p>
      <h1 className="mt-8 text-center text-3xl text-white">{current.title}</h1>
      <p className="mt-2 text-white/50">@{username}</p>
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="mt-12 flex h-20 w-20 items-center justify-center rounded-full border border-white/20 text-2xl text-white transition-transform hover:scale-105"
      >
        {playing ? '⏸' : '▶'}
      </button>
      <audio ref={audioRef} loop={false} />
      <p className="absolute bottom-8 text-xs text-white/30">{index + 1} / {feed.length}</p>
    </div>
  );
}
