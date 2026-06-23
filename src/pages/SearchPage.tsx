import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, Music, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import SongCard from '../components/SongCard';
import { searchProfiles, searchSongs, POPULAR_TAGS } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Profile, Song } from '../lib/types';
import type { PlayerTrack } from '../lib/types';

type Tab = 'songs' | 'users';

export default function SearchPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [tab, setTab] = useState<Tab>('songs');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent, selectedTag?: string) => {
    e?.preventDefault();
    const q = query.trim() || (selectedTag ? '' : query);
    const t = selectedTag ?? tag;
    if (!q && !t && tab === 'songs') return;
    if (!q && tab === 'users') return;

    setLoading(true);
    setSearched(true);
    try {
      if (tab === 'users') {
        setProfiles(await searchProfiles(q, user?.id));
        setSongs([]);
      } else {
        setSongs(await searchSongs(q || '', t || undefined, user?.id));
        setProfiles([]);
      }
    } catch {
      setProfiles([]);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const queue: PlayerTrack[] = songs.map((s) => ({
    id: s.id,
    title: s.title,
    file_url: s.file_url,
    file_type: s.file_type,
    artist: `@${s.studio?.owner?.username ?? 'unknown'}`,
  }));

  return (
    <PageLayout className="mx-auto max-w-2xl px-4 pb-32 pt-28 sm:pt-36">
      <h1 className="animate-fade-up text-2xl text-white">{t('search.title')}</h1>
      <p className="animate-fade-up delay-1 mt-2 text-sm text-white/70">{t('search.subtitle')}</p>

      <div className="animate-fade-up delay-2 mt-6 flex gap-2">
        <button type="button" onClick={() => setTab('songs')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${tab === 'songs' ? 'bg-white text-gray-900' : 'liquid-glass text-white'}`}>
          <Music size={14} /> {t('search.songsTab')}
        </button>
        <button type="button" onClick={() => setTab('users')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${tab === 'users' ? 'bg-white text-gray-900' : 'liquid-glass text-white'}`}>
          <User size={14} /> {t('search.usersTab')}
        </button>
      </div>

      <form onSubmit={(e) => handleSearch(e)} className="animate-fade-up delay-3 mt-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === 'songs' ? t('search.songPlaceholder') : t('search.userPlaceholder')}
          className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none"
        />
        <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 text-sm text-white disabled:opacity-50">
          <Search size={16} /> {t('search.searchBtn')}
        </button>
      </form>

      {tab === 'songs' && (
        <div className="animate-fade-up delay-4 mt-3 flex flex-wrap items-center gap-2">
          <Tag size={14} className="text-white/50" />
          {POPULAR_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTag(t); handleSearch(undefined, t); }}
              className={`rounded-lg px-2.5 py-1 text-xs ${tag === t ? 'bg-blue-700 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      <div className="animate-fade-up delay-5 mt-8">
        {loading && <p className="text-white/60">{t('search.searching')}</p>}
        {searched && !loading && tab === 'songs' && (
          songs.length === 0 ? <p className="text-white/50">{t('search.noSongs')}</p> : (
            <div className="space-y-2">{songs.map((song) => (
              <SongCard key={song.id} song={song} artist={`@${song.studio?.owner?.username ?? 'unknown'}`} queue={queue} />
            ))}</div>
          )
        )}
        {searched && !loading && tab === 'users' && (
          profiles.length === 0 ? <p className="text-white/50">{t('search.noUsers')}</p> : (
            <div className="space-y-2">{profiles.map((p) => (
              <Link key={p.id} to={`/studio/${p.username}`} className="liquid-glass flex items-center gap-3 rounded-2xl p-4 hover:scale-[1.01] transition-transform" style={{ background: 'rgba(255,255,255,0.08)' }}>
                {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-12 w-12 rounded-xl object-cover" /> : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-white">{p.username[0]?.toUpperCase()}</span>
                )}
                <div><p className="text-sm text-white">@{p.username}</p>{p.display_name && <p className="text-xs text-white/60">{p.display_name}</p>}</div>
              </Link>
            ))}</div>
          )
        )}
      </div>
    </PageLayout>
  );
}
