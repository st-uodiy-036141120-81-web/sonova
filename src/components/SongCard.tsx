import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Download, Trash2, ArrowRightLeft, Heart, Scissors, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Song } from '../lib/types';
import type { PlayerTrack } from '../lib/types';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { incrementPlayCount, incrementDownloadCount, toggleSongLike } from '../lib/api';
import Waveform from './Waveform';
import ShareButton from './ShareButton';
import ReelClipEditModal from './ReelClipEditModal';
import { hasReelClip, formatClipTime } from '../lib/reelClip';

interface SongCardProps {
  song: Song;
  artist: string;
  queue?: PlayerTrack[];
  isOwner?: boolean;
  onDelete?: (id: string) => void;
  onTransfer?: (song: Song) => void;
  onLikeToggle?: () => void;
  onClipSaved?: () => void;
}

export default function SongCard({
  song,
  artist,
  queue,
  isOwner,
  onDelete,
  onTransfer,
  onLikeToggle,
  onClipSaved,
}: SongCardProps) {
  const { t } = useTranslation();
  const { play, current, isPlaying } = usePlayer();
  const { user } = useAuth();
  const [liked, setLiked] = useState(song.liked_by_me ?? false);
  const [likes, setLikes] = useState(song.like_count);
  const [clipModalOpen, setClipModalOpen] = useState(false);

  useEffect(() => {
    setLiked(song.liked_by_me ?? false);
    setLikes(song.like_count);
  }, [song.liked_by_me, song.like_count]);

  const track: PlayerTrack = {
    id: song.id,
    title: song.title,
    file_url: song.file_url,
    file_type: song.file_type,
    artist,
  };
  const active = current?.id === song.id && isPlaying;

  const handlePlay = () => {
    play(track, queue);
    incrementPlayCount(song.id).catch(() => {});
  };

  const handleDownload = () => {
    incrementDownloadCount(song.id).catch(() => {});
  };

  const handleLike = async () => {
    if (!user) return;
    const nowLiked = await toggleSongLike(user.id, { ...song, liked_by_me: liked, like_count: likes });
    setLiked(nowLiked);
    setLikes((c) => (nowLiked ? c + 1 : c - 1));
    onLikeToggle?.();
  };

  return (
    <div className="liquid-glass rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlay}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <Play size={18} fill={active ? 'white' : 'none'} />
        </button>
        <div className="min-w-0 flex-1">
          <Link to={`/song/${song.id}`} className="truncate text-sm text-white hover:text-blue-300">{song.title}</Link>
          <p className="text-xs text-white/60">
            {artist} · {song.file_type.toUpperCase()}
            {hasReelClip(song) && (
              <span className="ms-2 rounded bg-pink-600/30 px-1.5 py-0.5 text-[10px] text-pink-200">
                {t('reels.clip')} {formatClipTime(song.clip_start_seconds ?? 0)}–{formatClipTime(song.clip_end_seconds ?? 0)}
              </span>
            )}
          </p>
          <Waveform seed={song.id} active={active} className="mt-2" />
          {song.tags?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {song.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-1 text-[10px] text-white/40">
            {song.play_count} {t('song.plays')} · {song.download_count} {t('song.downloads')} · {likes} {t('song.likes')}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          {user && (
            <button
              type="button"
              onClick={handleLike}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
            >
              <Heart size={16} className={liked ? 'fill-blue-400 text-blue-400' : 'text-white/80'} />
            </button>
          )}
          <ShareButton title={song.title} url={`/song/${song.id}`} />
          <a
            href={song.file_url}
            download
            onClick={handleDownload}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
          >
            <Download size={16} />
          </a>
          {isOwner && (
            <Link to={`/clip-analytics/${song.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10" title={t('reelsFeatures.clipAnalytics')}>
              <BarChart3 size={16} />
            </Link>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={() => setClipModalOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
              title={t('reelsClip.editTitle')}
            >
              <Scissors size={16} />
            </button>
          )}
          {isOwner && onTransfer && (
            <button type="button" onClick={() => onTransfer(song)} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10">
              <ArrowRightLeft size={16} />
            </button>
          )}
          {isOwner && onDelete && (
            <button type="button" onClick={() => onDelete(song.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-300 hover:bg-white/10">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      {clipModalOpen && (
        <ReelClipEditModal
          song={song}
          onClose={() => setClipModalOpen(false)}
          onSaved={() => onClipSaved?.()}
        />
      )}
    </div>
  );
}
