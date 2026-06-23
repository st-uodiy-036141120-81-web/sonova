import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flame, MapPin, Disc3, Sparkles } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import SongCard from '../components/SongCard';
import { fetchTrendingSongs, fetchRemixesWeek, fetchSongsByCity, fetchMoodPlaylist } from '../lib/platformApi';
import type { Song, PlayerTrack } from '../lib/types';

const MOODS = ['study', 'night', 'workout'] as const;
const CITIES = ['cairo', 'dubai', 'london', 'paris'];

export default function DiscoverPage() {
  const { t } = useTranslation();
  const [trending, setTrending] = useState<Song[]>([]);
  const [remixes, setRemixes] = useState<Song[]>([]);
  const [citySongs, setCitySongs] = useState<Song[]>([]);
  const [moodSongs, setMoodSongs] = useState<Record<string, Song[]>>({});

  useEffect(() => {
    fetchTrendingSongs(8).then(setTrending);
    fetchRemixesWeek(6).then(setRemixes);
    fetchSongsByCity('cairo', 6).then(setCitySongs);
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
