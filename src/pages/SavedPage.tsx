import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bookmark } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import SongCard from '../components/SongCard';
import { useAuth } from '../context/AuthContext';
import { fetchSavedSongs } from '../lib/platformApi';
import type { Song, PlayerTrack } from '../lib/types';

export default function SavedPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchSavedSongs(user.id).then(setSongs);
  }, [user]);

  const queue: PlayerTrack[] = songs.map((s) => ({
    id: s.id, title: s.title, file_url: s.file_url, file_type: s.file_type,
    artist: `@${s.studio?.owner?.username ?? 'unknown'}`,
  }));

  return (
    <PageLayout className="mx-auto max-w-2xl px-4 pb-32 pt-28">
      <h1 className="flex items-center gap-2 text-2xl text-[var(--text-primary)]">
        <Bookmark size={24} /> {t('saved.title')}
      </h1>
      <div className="mt-8 space-y-2">
        {songs.length === 0 ? (
          <p className="text-[var(--text-muted)]">{t('saved.empty')}</p>
        ) : (
          songs.map((s) => <SongCard key={s.id} song={s} artist={`@${s.studio?.owner?.username ?? 'unknown'}`} queue={queue} />)
        )}
      </div>
    </PageLayout>
  );
}
