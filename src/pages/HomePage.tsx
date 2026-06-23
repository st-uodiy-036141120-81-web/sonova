import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import SongCard from '../components/SongCard';
import NewsletterSignup from '../components/NewsletterSignup';
import { fetchRecentSongs, fetchFollowingFeed } from '../lib/api';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Song, PlayerTrack } from '../lib/types';
export default function HomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [feedPreview, setFeedPreview] = useState<Song[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchRecentSongs(8, user?.id).then(setSongs).catch(() => {});
    if (user) fetchFollowingFeed(user.id, 4).then(setFeedPreview).catch(() => {});
  }, [user?.id]);

  const queue: PlayerTrack[] = songs.map((s) => ({
    id: s.id,
    title: s.title,
    file_url: s.file_url,
    file_type: s.file_type,
    artist: `@${s.studio?.owner?.username ?? 'unknown'}`,
  }));

  const taglineParts = t('tagline').split('.').map((s) => s.trim()).filter(Boolean);

  return (
    <PageLayout className="flex flex-col items-center text-center pt-28 sm:pt-36 md:pt-44 px-4 sm:px-6 pb-32 min-h-screen">
      <div className="animate-fade-up delay-1 liquid-glass rounded-lg px-4 py-1.5 text-xs sm:text-sm text-white mb-5 sm:mb-6" style={{ background: 'rgba(255, 255, 255, 0.16)' }}>
        Sonova · {t('home.badge')}
      </div>

      <h1 className="animate-fade-up delay-2 max-w-3xl text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] text-[var(--text-primary)]">
        {taglineParts[0]}.
        {taglineParts[1] && (
          <>
            <br />
            {taglineParts[1]}.
          </>
        )}
      </h1>

      <p className="animate-fade-up delay-3 mt-5 sm:mt-6 max-w-md text-sm sm:text-base md:text-lg leading-relaxed text-[var(--text-muted)]">
        {t('description')}
      </p>

      <div className="animate-fade-up delay-4 mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Link to="/reels" className="rounded-xl bg-white px-7 py-2.5 text-sm text-gray-900 transition-transform duration-200 hover:scale-105 active:scale-95">
          {t('nav.reels')}
        </Link>
        <Link to="/reels?mode=stories" className="liquid-glass rounded-xl px-7 py-2.5 text-sm text-white transition-transform duration-200 hover:scale-105 active:scale-95">
          {t('reels.storiesFeed')}
        </Link>
        <Link to="/focus" className="liquid-glass rounded-xl px-7 py-2.5 text-sm text-white transition-transform duration-200 hover:scale-105 active:scale-95">
          {t('focus.title')}
        </Link>
        <Link to="/discover" className="liquid-glass rounded-xl px-7 py-2.5 text-sm text-white transition-transform duration-200 hover:scale-105 active:scale-95">
          {t('nav.discover')}
        </Link>
        <Link to="/register" className="liquid-glass rounded-xl px-7 py-2.5 text-sm text-white transition-transform duration-200 hover:scale-105 active:scale-95">
          {t('home.ctaRegister')}
        </Link>
        <Link to="/search" className="liquid-glass rounded-xl px-7 py-2.5 text-sm text-white transition-transform duration-200 hover:scale-105 active:scale-95">
          {t('home.ctaExplore')}
        </Link>
      </div>

      {feedPreview.length > 0 && (
        <section className="animate-fade-up delay-5 mt-16 w-full max-w-2xl text-start">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg text-white/90">{t('home.following')}</h2>
            <Link to="/feed" className="text-sm text-blue-300">{t('home.viewAll')}</Link>
          </div>
          <div className="space-y-2">
            {feedPreview.map((song) => (
              <SongCard key={song.id} song={song} artist={`@${song.studio?.owner?.username ?? 'unknown'}`} queue={queue} />
            ))}
          </div>
        </section>
      )}

      {songs.length > 0 && (
        <section id="recent" className="animate-fade-up delay-5 mt-16 w-full max-w-2xl text-start">
          <h2 className="mb-4 text-lg text-white/90">{t('home.latest')}</h2>
          <div className="space-y-2">
            {songs.map((song) => (
              <SongCard key={song.id} song={song} artist={`@${song.studio?.owner?.username ?? 'unknown'}`} queue={queue} />
            ))}
          </div>
        </section>
      )}

      <section className="animate-fade-up delay-5 mt-16 w-full max-w-md text-start">
        <h2 className="mb-3 text-lg text-white/90">{t('newsletter.title')}</h2>
        <NewsletterSignup />
      </section>
    </PageLayout>
  );
}
