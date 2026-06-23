import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import SongCard from '../components/SongCard';
import FanBadge, { TrustBadge } from '../components/FanBadge';
import VerifiedBadge from '../components/VerifiedBadge';
import ShareButton from '../components/ShareButton';
import MetaTags from '../components/MetaTags';
import PlaybackControls from '../components/PlaybackControls';
import TipJar from '../components/TipJar';
import { fetchSongById, fetchEarlyListenerBadge } from '../lib/featuresApi';
import { fetchSongChapters, fetchSongCredits } from '../lib/platformApi';
import { useAuth } from '../context/AuthContext';
import type { Song, SongChapter, SongCredit, PlayerTrack } from '../lib/types';
import RealWaveform from '../components/RealWaveform';

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [song, setSong] = useState<Song | null>(null);
  const [badge, setBadge] = useState<number | null>(null);
  const [chapters, setChapters] = useState<SongChapter[]>([]);
  const [credits, setCredits] = useState<SongCredit[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchSongById(id).then(setSong);
    fetchSongChapters(id).then(setChapters);
    fetchSongCredits(id).then(setCredits);
  }, [id]);

  useEffect(() => {
    if (user && id) fetchEarlyListenerBadge(id, user.id).then(setBadge);
  }, [user, id]);

  if (!song) {
    return (
      <PageLayout className="flex min-h-screen items-center justify-center pt-24">
        <p className="text-[var(--text-muted)]">{t('common.loading')}</p>
      </PageLayout>
    );
  }

  const username = song.studio?.owner?.username ?? 'unknown';
  const ownerId = song.studio?.owner_id ?? '';
  const queue: PlayerTrack[] = [{ id: song.id, title: song.title, file_url: song.file_url, file_type: song.file_type, artist: `@${username}` }];
  const pageUrl = `${window.location.origin}/song/${song.id}`;

  return (
    <PageLayout className="mx-auto max-w-lg px-4 pb-32 pt-28">
      <MetaTags title={`${song.title} — Sonova`} description={song.description ?? song.title} url={pageUrl} />
      <div className="animate-fade-up liquid-glass rounded-2xl p-6" style={{ background: 'var(--glass-bg)' }}>
        <h1 className="text-2xl text-[var(--text-primary)]">{song.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link to={`/studio/${username}`} className="text-sm text-blue-400">@{username}</Link>
          {song.studio?.owner?.verified && <VerifiedBadge />}
          {song.studio?.owner?.trust_score != null && <TrustBadge score={song.studio.owner.trust_score} />}
          {badge && <FanBadge order={badge} />}
        </div>
        {song.shoutout_username && (
          <p className="mt-2 text-xs text-amber-400">★ {t('song.shoutout')} @{song.shoutout_username}</p>
        )}
        {song.description && <p className="mt-3 text-sm text-[var(--text-muted)]">{song.description}</p>}
        {song.lyrics && (
          <pre className="mt-3 whitespace-pre-wrap text-sm text-[var(--text-primary)] opacity-80">{song.lyrics}</pre>
        )}
        {song.original && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {t('song.remixOf')} <Link to={`/song/${song.original.id}`} className="text-blue-400">{song.original.title}</Link>
          </p>
        )}
        {chapters.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chapters.map((c) => (
              <span key={c.id} className="rounded-lg bg-white/10 px-2 py-1 text-xs text-[var(--text-muted)]">{c.title} · {c.start_seconds}s</span>
            ))}
          </div>
        )}
        {credits.length > 0 && (
          <div className="mt-3 text-xs text-[var(--text-muted)]">
            {credits.map((c) => <span key={c.id} className="mr-2">{c.role}: {c.name}</span>)}
          </div>
        )}
        {song.waveform_peaks && <RealWaveform peaks={song.waveform_peaks} className="mt-4 h-12" active />}
        <div className="mt-4"><PlaybackControls /></div>
        <div className="mt-4"><SongCard song={song} artist={`@${username}`} queue={queue} /></div>
        {ownerId && user?.id !== ownerId && <div className="mt-4"><TipJar receiverId={ownerId} username={username} /></div>}
        <div className="mt-4 flex flex-wrap gap-2">
          <ShareButton title={song.title} url={`/song/${song.id}`} />
          <Link to={`/embed/${song.id}`} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">{t('song.embed')}</Link>
          <Link to={`/listen-like/${username}`} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">{t('listenLike.link')}</Link>
          <Link to={`/reels?song=${song.id}`} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">{t('nav.reels')}</Link>
        </div>
      </div>
    </PageLayout>
  );
}
