import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListMusic, Plus, Trash2, UserPlus } from 'lucide-react';
import type { Playlist, Song } from '../lib/types';
import { createPlaylist, fetchPlaylists, addSongToPlaylist, deletePlaylist } from '../lib/api';
import { addPlaylistCollaborator, fetchPlaylistCollaborators } from '../lib/apiExtended';
import { fetchProfileByUsername } from '../lib/api';
import { validateUsername } from '../lib/validators';

interface PlaylistSectionProps {
  studioId: string;
  songs: Song[];
  isOwner: boolean;
}

export default function PlaylistSection({ studioId, songs, isOwner }: PlaylistSectionProps) {
  const { t } = useTranslation();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState('');
  const [collabUser, setCollabUser] = useState('');
  const [collabPlaylistId, setCollabPlaylistId] = useState('');
  const [collabs, setCollabs] = useState<Record<string, string[]>>({});

  const load = () => fetchPlaylists(studioId).then(setPlaylists);
  useEffect(() => { load(); }, [studioId]);

  const loadCollabs = async (playlistId: string) => {
    const data = await fetchPlaylistCollaborators(playlistId);
    setCollabs((prev) => ({
      ...prev,
      [playlistId]: data.map((c: { profile?: { username: string } }) => c.profile?.username ?? '').filter(Boolean),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createPlaylist(studioId, name.trim());
    setName('');
    load();
  };

  const handleAddCollab = async () => {
    if (!collabPlaylistId) return;
    if (validateUsername(collabUser)) return;
    const profile = await fetchProfileByUsername(collabUser.trim());
    if (!profile) return;
    await addPlaylistCollaborator(collabPlaylistId, profile.id);
    await loadCollabs(collabPlaylistId);
    setCollabUser('');
  };

  if (!isOwner && playlists.length === 0) return null;

  return (
    <section className="mt-8">
      <h3 className="mb-4 flex items-center gap-2 text-lg text-[var(--text-primary)]">
        <ListMusic size={18} /> {t('studio.playlists')}
      </h3>
      {isOwner && (
        <form onSubmit={handleCreate} className="mb-4 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Playlist name" className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-sm text-[var(--text-primary)] outline-none" />
          <button type="submit" className="flex items-center gap-1 rounded-xl bg-blue-700 px-4 text-sm text-white"><Plus size={14} /></button>
        </form>
      )}
      {playlists.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">—</p>
      ) : (
        <div className="space-y-3">
          {playlists.map((pl) => (
            <div key={pl.id} className="liquid-glass rounded-xl p-4" style={{ background: 'var(--glass-bg)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-primary)]">{pl.name}</p>
                {isOwner && (
                  <button type="button" onClick={() => deletePlaylist(pl.id).then(load)} className="text-red-400"><Trash2 size={14} /></button>
                )}
              </div>
              {collabs[pl.id]?.length > 0 && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">Collab: {collabs[pl.id].join(', ')}</p>
              )}
              {isOwner && songs.length > 0 && (
                <select className="mt-2 w-full rounded-lg bg-white/10 px-3 py-2 text-xs text-[var(--text-primary)] outline-none" defaultValue="" onChange={(e) => { if (e.target.value) addSongToPlaylist(pl.id, e.target.value, Date.now()); e.target.value = ''; }}>
                  <option value="">+ Add song</option>
                  {songs.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              )}
              {isOwner && (
                <div className="mt-2 flex gap-2">
                  <input value={collabPlaylistId === pl.id ? collabUser : ''} onFocus={() => setCollabPlaylistId(pl.id)} onChange={(e) => { setCollabPlaylistId(pl.id); setCollabUser(e.target.value); }} placeholder={t('studio.collab')} className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none" />
                  <button type="button" onClick={() => { setCollabPlaylistId(pl.id); handleAddCollab(); }} className="rounded-lg bg-white/10 px-2 text-[var(--text-primary)]"><UserPlus size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
