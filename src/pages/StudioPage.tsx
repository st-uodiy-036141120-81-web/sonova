import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { User, MessageCircle } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import SongCard from '../components/SongCard';
import UploadSongForm from '../components/UploadSongForm';
import TransferSongModal from '../components/TransferSongModal';
import CommentSection from '../components/CommentSection';
import FollowBlockButtons from '../components/FollowBlockButtons';
import PlaylistSection from '../components/PlaylistSection';
import TransferRequests from '../components/TransferRequests';
import StudioStoriesBar from '../components/StudioStoriesBar';
import TipJar from '../components/TipJar';
import VerifiedBadge from '../components/VerifiedBadge';
import ShareButton from '../components/ShareButton';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  fetchStudioByUsername,
  fetchStudioSongs,
  fetchStudioComments,
  fetchPendingTransfers,
  fetchFollowCounts,
  deleteSong,
  updateStudio,
  isBlocked,
} from '../lib/api';
import type { Song, SongTransfer, Studio, StudioComment } from '../lib/types';
import type { PlayerTrack } from '../lib/types';

export default function StudioPage() {
  const { username } = useParams<{ username: string }>();
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [comments, setComments] = useState<StudioComment[]>([]);
  const [transfers, setTransfers] = useState<SongTransfer[]>([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [songToTransfer, setSongToTransfer] = useState<Song | null>(null);
  const [blockedView, setBlockedView] = useState(false);
  const [editing, setEditing] = useState(false);
  const [studioName, setStudioName] = useState('');
  const [studioDesc, setStudioDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isOwner = user?.id === studio?.owner_id;
  const owner = studio?.owner;

  const load = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const s = await fetchStudioByUsername(username);
      if (!s) {
        setNotFound(true);
        return;
      }
      if (user && s.owner_id !== user.id) {
        const blocked = await isBlocked(user.id, s.owner_id);
        if (blocked) {
          setBlockedView(true);
          setStudio(s);
          setLoading(false);
          return;
        }
      }
      setStudio(s);
      setStudioName(s.name);
      setStudioDesc(s.description ?? '');
      const [songList, commentList, pending, followCounts] = await Promise.all([
        fetchStudioSongs(s.id, user?.id),
        fetchStudioComments(s.id, user?.id),
        isOwner || s.owner_id === user?.id ? fetchPendingTransfers(s.id) : Promise.resolve([]),
        fetchFollowCounts(s.owner_id),
      ]);
      setSongs(songList);
      setComments(commentList);
      setTransfers(pending);
      setCounts(followCounts);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [username, user?.id]);

  const queue: PlayerTrack[] = songs.map((s) => ({
    id: s.id,
    title: s.title,
    file_url: s.file_url,
    file_type: s.file_type,
    artist: `@${username}`,
  }));

  if (loading) {
    return (
      <PageLayout className="flex min-h-screen items-center justify-center pt-24">
        <p className="text-white/70">{t('studioPage.loading')}</p>
      </PageLayout>
    );
  }

  if (notFound || !studio) {
    return (
      <PageLayout className="flex min-h-screen flex-col items-center justify-center pt-24 px-4">
        <p className="text-white">{t('studioPage.notFound')}</p>
        <Link to="/search" className="mt-4 text-blue-300">{t('studioPage.searchLink')}</Link>
      </PageLayout>
    );
  }

  if (blockedView) {
    return (
      <PageLayout className="flex min-h-screen items-center justify-center pt-24 px-4">
        <p className="text-white/70">{t('studioPage.blocked')}</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="mx-auto max-w-2xl px-4 pb-32 pt-28 sm:pt-36">
      <div className="animate-fade-up liquid-glass rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-start gap-4">
          {owner?.avatar_url ? (
            <img src={owner.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700">
              <User size={28} className="text-white" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-2">
                <input value={studioName} onChange={(e) => setStudioName(e.target.value)} className="w-full rounded-lg bg-white/10 px-3 py-2 text-white outline-none" />
                <textarea value={studioDesc} onChange={(e) => setStudioDesc(e.target.value)} rows={2} className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white outline-none" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => updateStudio(studio.id, { name: studioName, description: studioDesc }).then(load)} className="rounded-lg bg-blue-700 px-3 py-1 text-sm text-white">{t('studioPage.save')}</button>
                  <button type="button" onClick={() => setEditing(false)} className="text-sm text-white/60">{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-xl text-white flex items-center gap-2">{studio.name} {owner?.verified && <VerifiedBadge />}</h1>
                    <p className="text-sm text-blue-300">@{username}</p>
                    <p className="mt-1 text-xs text-white/50">{t('profile.followersCount', { followers: counts.followers, following: counts.following })}</p>
                  </div>
                  <ShareButton title={studio.name} url={`/studio/${username}`} />
                </div>
                {studio.description && <p className="mt-2 text-sm text-white/70">{studio.description}</p>}
                {isOwner && (
                  <button type="button" onClick={() => setEditing(true)} className="mt-2 text-xs text-white/50 hover:text-white">{t('studioPage.editStudio')}</button>
                )}
              </>
            )}
          </div>
        </div>

        <StudioStoriesBar studioId={studio.id} />

        {!isOwner && owner && (
          <div className="mt-4 flex flex-wrap gap-3">
            <TipJar receiverId={owner.id} username={username ?? ''} />
            <Link to={`/listen-like/${username}`} className="text-sm text-blue-400">{t('listenLike.link')}</Link>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <FollowBlockButtons
            viewerId={user?.id}
            targetId={studio.owner_id}
            viewerUsername={profile?.username ?? ''}
            isSelf={isOwner}
          />
          {user && !isOwner && (
            <Link
              to={`/messages?user=${studio.owner_id}`}
              className="liquid-glass flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] hover:scale-105"
            >
              <MessageCircle size={14} /> {t('studioPage.message')}
            </Link>
          )}
          <Link
            to={`/live/${username}`}
            className="liquid-glass flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-red-400 hover:scale-105"
          >
            ● LIVE
          </Link>
        </div>
      </div>

      {isOwner && transfers.length > 0 && <TransferRequests transfers={transfers} onUpdate={load} />}

      {isOwner && (
        <div className="animate-fade-up delay-1 mt-6">
          <UploadSongForm studioId={studio.id} onUploaded={load} />
        </div>
      )}

      <section className="animate-fade-up delay-2 mt-8">
        <h2 className="mb-4 text-lg text-white">{t('studioPage.songsCount', { count: songs.length })}</h2>
        {songs.length === 0 ? (
          <p className="text-sm text-white/50">{isOwner ? t('studioPage.noSongsOwner') : t('studioPage.noSongsGuest')}</p>
        ) : (
          <div className="space-y-2">
            {songs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                artist={`@${username}`}
                queue={queue}
                isOwner={isOwner}
                onDelete={(id) => { if (confirm(t('studioPage.deleteConfirm'))) deleteSong(id).then(load); }}
                onTransfer={setSongToTransfer}
                onLikeToggle={load}
                onClipSaved={load}
              />
            ))}
          </div>
        )}
      </section>

      <PlaylistSection studioId={studio.id} songs={songs} isOwner={isOwner} />

      <CommentSection
        studioId={studio.id}
        userId={user?.id}
        studioOwnerId={studio.owner_id}
        isStudioOwner={isOwner}
        comments={comments}
        onUpdate={load}
      />

      {songToTransfer && user && (
        <TransferSongModal
          song={songToTransfer}
          fromStudioId={studio.id}
          requesterId={user.id}
          onClose={() => setSongToTransfer(null)}
          onTransferred={load}
        />
      )}
    </PageLayout>
  );
}
