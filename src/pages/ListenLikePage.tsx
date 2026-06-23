import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import SongCard from '../components/SongCard';
import { useAuth } from '../context/AuthContext';
import { fetchProfileByUsername } from '../lib/api';
import { fetchFeedLikeUser } from '../lib/platformApi';
import type { Profile, Song, PlayerTrack } from '../lib/types';

export default function ListenLikePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    if (!username) return;
    fetchProfileByUsername(username).then(async (p) => {
      if (!p) return;
      setProfile(p);
      setSongs(await fetchFeedLikeUser(p.id, user?.id));
    }).catch(() => {});
  }, [username, user?.id]);

  const queue: PlayerTrack[] = songs.map((s) => ({
    id: s.id, title: s.title, file_url: s.file_url, file_type: s.file_type,
    artist: `@${s.studio?.owner?.username ?? 'unknown'}`,
  }));

  return (
    <PageLayout className="mx-auto max-w-2xl px-4 pb-32 pt-28">
      <h1 className="text-2xl text-[var(--text-primary)]">{t('listenLike.title')}</h1>
      {profile && <p className="mt-1 text-sm text-blue-400">@{profile.username}</p>}
      <div className="mt-8 space-y-2">
        {songs.map((s) => <SongCard key={s.id} song={s} artist={`@${s.studio?.owner?.username ?? 'unknown'}`} queue={queue} />)}
      </div>
    </PageLayout>
  );
}
