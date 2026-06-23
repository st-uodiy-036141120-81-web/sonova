import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import SongCard from '../components/SongCard';
import { fetchFollowingFeed } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Song } from '../lib/types';
import type { PlayerTrack } from '../lib/types';

export default function FeedPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchFollowingFeed(user.id, 30)
      .then(setSongs)
      .finally(() => setLoading(false));
  }, [user]);

  const queue: PlayerTrack[] = songs.map((s) => ({
    id: s.id,
    title: s.title,
    file_url: s.file_url,
    file_type: s.file_type,
    artist: `@${s.studio?.owner?.username ?? 'unknown'}`,
  }));

  return (
    <PageLayout className="mx-auto max-w-2xl px-4 pb-32 pt-28 sm:pt-36">
      <h1 className="animate-fade-up text-2xl text-white">{t('feed.title')}</h1>
      <p className="animate-fade-up delay-1 mt-2 text-sm text-white/70">{t('feed.subtitle')}</p>

      <div className="animate-fade-up delay-2 mt-8 space-y-2">
        {loading ? (
          <p className="text-white/60">{t('common.loading')}</p>
        ) : songs.length === 0 ? (
          <div className="liquid-glass rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <p className="text-white/70">{t('feed.empty')}</p>
            <Link to="/search" className="mt-2 inline-block text-blue-300">{t('feed.exploreLink')}</Link>
          </div>
        ) : (
          songs.map((song) => (
            <SongCard key={song.id} song={song} artist={`@${song.studio?.owner?.username ?? 'unknown'}`} queue={queue} />
          ))
        )}
      </div>
    </PageLayout>
  );
}
