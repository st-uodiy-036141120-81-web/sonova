import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flame, MapPin, Disc3, Sparkles, Radio } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import SongCard from '../components/SongCard';
import { fetchTrendingSongs, fetchRemixesWeek, fetchSongsByCity, fetchMoodPlaylist } from '../lib/platformApi';
import { fetchActiveLiveSessions } from '../lib/featuresApi';
import type { Song, PlayerTrack, LiveSession } from '../lib/types';

const MOODS = ['study', 'night', 'workout'] as const;
const CITIES = ['cairo', 'dubai', 'london', 'paris'];

export default function DiscoverPage() {
  const { t } = useTranslation();
  const [trending, setTrending] = useState<Song[]>([]);
  const [remixes, setRemixes] = useState<Song[]>([]);
  const [citySongs, setCitySongs] = useState<Song[]>([]);
  const [moodSongs, setMoodSongs] = useState<Record<string, Song[]>>({});
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);

  useEffect(() => {
    fetchTrendingSongs(8).then(setTrending);
    fetchRemixesWeek(6).then(setRemixes);
    fetchSongsByCity('cairo', 6).then(setCitySongs);
    fetchActiveLiveSessions(8).then(setLiveSessions);
    for (const m of MOODS) fetchMoodPlaylist(m, 4).then((s) => setMoodSongs((prev) => ({ ...prev, [m]: s })));
  }, []);

  const queue: PlayerTrack[] = trending.map((s) => ({
    id: s.id, title: s.title, file_url: s.file_url, file_type: s.file_type,
    artist: `@${s.studio?.owner?.username ?? 'unknown'}`,
  }));

  const Section = ({ icon: Icon, title, songs }: { icon: typeof Flame; title: string; songs: Song[] }) => (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 text-lg text-[var(--text-primary)]"><Icon size={18} /> {title}</h2>
      {songs.length === 0 ? <p className="text-sm text-[var(--text-muted)]">{t('discover.empty')}</p> : (
        <div className="space-y-2">{songs.map((s) => <SongCard key={s.id} song={s} artist={`@${s.studio?.owner?.username ?? 'unknown'}`} queue={queue} />)}</div>
      )}
    </section>
  );

  return (
    <PageLayout className="mx-auto max-w-2xl px-4 pb-32 pt-28">
      <h1 className="text-2xl text-[var(--text-primary)]">{t('discover.title')}</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{t('discover.subtitle')}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/taste-report" className="liquid-glass rounded-xl px-4 py-2 text-sm text-[var(--text-primary)]">{t('discover.tasteReport')}</Link>
        <Link to="/saved" className="liquid-glass rounded-xl px-4 py-2 text-sm text-[var(--text-primary)]">{t('discover.saved')}</Link>
      </div>

      <div className="mt-10">
        {liveSessions.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg text-[var(--text-primary)]">
              <Radio size={18} className="text-red-400" /> {t('live.browseTitle')}
            </h2>
            <div className="space-y-2">
              {liveSessions.map((session) => {
                const uname = session.studio?.owner?.username ?? session.host?.username;
                if (!uname) return null;
                return (
                  <Link key={session.id} to={`/live/${uname}`} className="liquid-glass flex items-center gap-3 rounded-xl p-3 ring-1 ring-red-500/30">
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] text-white animate-pulse">LIVE</span>
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">{session.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">@{uname}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Link to="/live" className="mt-2 inline-block text-xs text-blue-400">{t('create.browseLive')}</Link>
          </section>
        )}
        <Section icon={Flame} title={t('discover.trending')} songs={trending} />
        <Section icon={Disc3} title={t('discover.remixes')} songs={remixes} />
        <Section icon={MapPin} title={t('discover.byCity')} songs={citySongs} />
        {MOODS.map((m) => (
          <Section key={m} icon={Sparkles} title={t(`discover.mood.${m}`)} songs={moodSongs[m] ?? []} />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {CITIES.map((c) => (
          <button key={c} type="button" onClick={() => fetchSongsByCity(c, 6).then(setCitySongs)} className="rounded-lg bg-white/10 px-3 py-1 text-xs text-[var(--text-muted)] capitalize">{c}</button>
        ))}
      </div>
    </PageLayout>
  );
}
