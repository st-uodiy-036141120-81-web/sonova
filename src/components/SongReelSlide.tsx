import { useEffect, useRef, useState } from 'react';
import {
  Heart, MessageCircle, Share2, Check, Pause, Play, HelpCircle, Bookmark,
  Music, Mail, Repeat2, Download, PictureInPicture2, Gauge, Cast, Flag, Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Song } from '../lib/types';
import type { TasteMatchReason } from '../lib/tasteAlgorithm';
import { useAuth } from '../context/AuthContext';
import { useUserSettings } from '../context/UserSettingsContext';
import { usePlayer } from '../context/PlayerContext';
import { toggleSongLike, incrementPlayCount } from '../lib/api';
import Waveform from './Waveform';
import RealWaveform from './RealWaveform';
import WhyThisSongModal from './WhyThisSongModal';
import ReelCommentSheet from './reels/ReelCommentSheet';
import ReelReactionsBar from './reels/ReelReactionsBar';
import ReelShareSheet from './reels/ReelShareSheet';
import ReelLyricsOverlay from './reels/ReelLyricsOverlay';
import { useReelTasteTracking } from '../hooks/useReelTasteTracking';
import { recordLikeBoost } from '../lib/tasteStorage';
import { toggleSavedSong, isSongSaved } from '../lib/platformApi';
import { getReelClipBounds, hasReelClip } from '../lib/reelClip';
import {
  createListeningRoom,
  recordClipAnalytics,
  repostClip,
  reportClip,
} from '../lib/reelsFeatures/api';
import { addToReelsMix } from '../lib/reelsFeatures/localMix';
import { saveOfflineClip } from '../lib/reelsFeatures/offlineClips';

function hashHue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return Math.abs(h) % 360;
}

interface SongReelSlideProps {
  song: Song;
  isActive: boolean;
  username: string;
  forYou?: boolean;
  storyMode?: boolean;
  isDiscover?: boolean;
  matchReasons?: TasteMatchReason[];
  matchScore?: number;
  clipOverride?: { start: number; end: number };
  onEnded?: () => void;
  onCreateRoom?: (roomId: string) => void;
}

export default function SongReelSlide({
  song,
  isActive,
  username,
  forYou = false,
  storyMode = false,
  isDiscover = false,
  matchReasons = [],
  matchScore = 0,
  clipOverride,
  onEnded,
  onCreateRoom,
}: SongReelSlideProps) {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { play } = usePlayer();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playedRef = useRef(false);
  const loopsLeftRef = useRef(song.clip_loop_count ?? 0);
  const lastTapRef = useRef(0);

  const [liked, setLiked] = useState(song.liked_by_me ?? false);
  const [likes, setLikes] = useState(song.like_count);
  const [saved, setSaved] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [likePulse, setLikePulse] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(settings.defaultSpeed);

  const hue = hashHue(song.id);
  const { clipStart, clipEnd } = getReelClipBounds(song, storyMode, clipOverride);
  const loopMax = song.clip_loop_count ?? 0;

  useReelTasteTracking(song, isActive, user?.id);

  useEffect(() => {
    setLiked(song.liked_by_me ?? false);
    setLikes(song.like_count);
    loopsLeftRef.current = loopMax;
  }, [song, loopMax]);

  useEffect(() => {
    if (user) isSongSaved(user.id, song.id).then(setSaved);
  }, [song.id, user]);

  useEffect(() => {
    if (isActive) recordClipAnalytics(song.id, 'view', user?.id).catch(() => {});
  }, [isActive, song.id, user?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    const media = song.file_type === 'mp4' ? video : audio;

    if (isActive && media) {
      media.playbackRate = speed;
      media.currentTime = clipStart;
      media.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      if (!playedRef.current) {
        playedRef.current = true;
        incrementPlayCount(song.id).catch(() => {});
      }
    } else {
      audio?.pause();
      video?.pause();
      setPlaying(false);
      setCommentsOpen(false);
      setShareOpen(false);
      setWhyOpen(false);
    }
  }, [isActive, song, clipStart, speed]);

  useEffect(() => {
    const media = song.file_type === 'mp4' ? videoRef.current : audioRef.current;
    if (!media || !isActive) return;

    const onTimeUpdate = () => {
      setCurrentTime(media.currentTime);
      if (clipEnd != null && media.currentTime >= clipEnd) {
        if (loopsLeftRef.current > 0) {
          loopsLeftRef.current--;
          media.currentTime = clipStart;
          media.play().catch(() => {});
          return;
        }
        media.pause();
        setPlaying(false);
        recordClipAnalytics(song.id, 'stop', user?.id, Math.round(media.currentTime)).catch(() => {});
        onEnded?.();
      }
    };

    const onNativeEnd = () => { if (clipEnd == null) onEnded?.(); };

    media.addEventListener('timeupdate', onTimeUpdate);
    media.addEventListener('ended', onNativeEnd);
    return () => {
      media.removeEventListener('timeupdate', onTimeUpdate);
      media.removeEventListener('ended', onNativeEnd);
    };
  }, [isActive, song, clipEnd, clipStart, onEnded, user?.id]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      handleLike();
      setLikePulse(true);
      setTimeout(() => setLikePulse(false), 400);
    } else togglePlay();
    lastTapRef.current = now;
  };

  const togglePlay = () => {
    const media = song.file_type === 'mp4' ? videoRef.current : audioRef.current;
    if (!media) return;
    if (playing) { media.pause(); setPlaying(false); }
    else { media.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaved(await toggleSavedSong(user.id, song.id));
  };

  const handleLike = async () => {
    if (!user) return;
    setLikePulse(true);
    setTimeout(() => setLikePulse(false), 400);
    const nowLiked = await toggleSongLike(user.id, { ...song, liked_by_me: liked, like_count: likes });
    setLiked(nowLiked);
    setLikes((c) => (nowLiked ? c + 1 : Math.max(0, c - 1)));
    if (nowLiked) {
      recordLikeBoost(song.tags ?? [], song.studio?.owner_id, user.id);
      addToReelsMix({ id: song.id, title: song.title, file_url: song.file_url, file_type: song.file_type, artist: `@${username}` });
    }
  };

  const listenFull = () => {
    recordClipAnalytics(song.id, 'listen_full', user?.id).catch(() => {});
    play(
      { id: song.id, title: song.title, file_url: song.file_url, file_type: song.file_type, artist: `@${username}`, startAt: clipEnd ?? clipStart },
      undefined,
      clipEnd ?? clipStart
    );
    navigate(`/song/${song.id}`);
  };

  const handleRepost = async () => {
    if (!user || clipEnd == null) return;
    await repostClip(user.id, song.id, clipStart, clipEnd, song.clip_caption ?? '');
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleOffline = () => {
    if (clipEnd == null) return;
    saveOfflineClip({ songId: song.id, title: song.title, fileUrl: song.file_url, clipStart, clipEnd, savedAt: new Date().toISOString() });
  };

  const handleRoom = async () => {
    if (!user) return;
    const room = await createListeningRoom(user.id, song.id, `${song.title} · ${t('reelsFeatures.listeningRoom')}`);
    if (room) onCreateRoom?.(room.id);
  };

  const handlePiP = async () => {
    const v = videoRef.current;
    if (v && document.pictureInPictureEnabled) {
      try { await v.requestPictureInPicture(); } catch { /* ignore */ }
    }
  };

  const handleCast = () => {
    const media = song.file_type === 'mp4' ? videoRef.current : audioRef.current;
    if (media && 'remote' in media) {
      (media as HTMLMediaElement & { remote?: { prompt: () => void } }).remote?.prompt();
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length]!;
    setSpeed(next);
    const media = song.file_type === 'mp4' ? videoRef.current : audioRef.current;
    if (media) media.playbackRate = next;
  };

  return (
    <section
      className="reels-slide relative h-[100dvh] w-full shrink-0 snap-start snap-always overflow-hidden"
      style={{ background: `linear-gradient(160deg, hsl(${hue} 45% 18%) 0%, hsl(${(hue + 60) % 360} 35% 8%) 50%, #0a0a0f 100%)` }}
    >
      {song.clip_cover_url && (
        <img src={song.clip_cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      )}

      {song.file_type === 'mp4' ? (
        <video ref={videoRef} src={song.file_url} className="absolute inset-0 h-full w-full object-cover opacity-70" playsInline loop={clipEnd == null} />
      ) : (
        <audio ref={audioRef} src={song.file_url} loop={clipEnd == null} preload="auto" />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70 pointer-events-none" />

      <ReelLyricsOverlay lyrics={song.lyrics} currentTime={currentTime} clipStart={clipStart} active={playing && isActive} />

      <button type="button" className="absolute inset-0 z-10 flex items-center justify-center" onClick={handleTap} aria-label={playing ? 'Pause' : 'Play'}>
        {!playing && (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
            <Play size={28} className="ml-1 text-white" fill="white" />
          </span>
        )}
      </button>

      <div className="absolute bottom-36 left-4 right-24 z-20 pointer-events-none">
        {isDiscover && <span className="mb-2 inline-flex rounded-full bg-emerald-600/80 px-3 py-1 text-xs text-white">{t('reelsFeatures.discoverArtist')}</span>}
        {storyMode && <span className="mb-2 inline-flex rounded-full bg-purple-600/80 px-3 py-1 text-xs text-white">{t('reels.story')}</span>}
        {hasReelClip(song) && <span className="mb-2 ms-2 inline-flex rounded-full bg-pink-600/80 px-3 py-1 text-xs text-white">{t('reels.clip')}</span>}
        {forYou && <span className="mb-2 ms-2 inline-flex rounded-full bg-blue-700/80 px-3 py-1 text-xs text-white">✦ {t('reels.forYou')}</span>}
        <p className="text-lg font-medium text-white drop-shadow-lg">{song.title}</p>
        {song.clip_caption && <p className="mt-1 text-sm text-white/80">{song.clip_caption}</p>}
        <Link to={`/studio/${username}`} className="pointer-events-auto mt-1 inline-block text-sm text-white/80 hover:text-white">@{username}</Link>
        {song.shoutout_username && (
          <Link to={`/studio/${song.shoutout_username}`} className="pointer-events-auto ms-2 text-sm text-pink-300">→ @{song.shoutout_username}</Link>
        )}
        <div className="mt-3 max-w-xs pointer-events-none">
          {song.waveform_peaks?.length ? <RealWaveform peaks={song.waveform_peaks} className="h-8" active={playing && isActive} /> : <Waveform seed={song.id} active={playing && isActive} />}
        </div>
        <div className="pointer-events-auto mt-3">
          <ReelReactionsBar songId={song.id} />
        </div>
      </div>

      <div className="absolute bottom-28 right-3 z-20 flex flex-col items-center gap-3 max-h-[70vh] overflow-y-auto">
        {forYou && matchReasons.length > 0 && (
          <button type="button" onClick={() => setWhyOpen(true)} className="reels-action flex flex-col items-center gap-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"><HelpCircle size={22} className="text-white" /></span>
            <span className="text-[10px] text-white/70">{t('reels.why')}</span>
          </button>
        )}

        <button type="button" onClick={listenFull} className="reels-action flex flex-col items-center gap-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"><Music size={20} className="text-white" /></span>
          <span className="text-[10px] text-white/70">{t('reelsFeatures.listenFull')}</span>
        </button>

        <button type="button" onClick={handleSave} className="reels-action flex flex-col items-center gap-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <Bookmark size={22} className={saved ? 'fill-yellow-400 text-yellow-400' : 'text-white'} />
          </span>
        </button>

        <button type="button" onClick={handleLike} className={`reels-action flex flex-col items-center gap-1 ${likePulse ? 'scale-125' : ''}`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <Heart size={26} className={liked ? 'fill-red-500 text-red-500' : 'text-white'} />
          </span>
          <span className="text-xs text-white/90">{likes}</span>
        </button>

        <button type="button" onClick={() => setCommentsOpen(true)} className="reels-action flex flex-col items-center gap-1">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"><MessageCircle size={26} className="text-white" /></span>
          <span className="text-xs text-white/90">{commentCount}</span>
        </button>

        <button type="button" onClick={() => setShareOpen(true)} className="reels-action flex flex-col items-center gap-1">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            {shareCopied ? <Check size={24} className="text-green-400" /> : <Share2 size={24} className="text-white" />}
          </span>
        </button>

        {user && (
          <>
            <button type="button" onClick={handleRepost} className="reels-action" title={t('reelsFeatures.repost')}><Repeat2 size={20} className="text-white" /></button>
            <Link to={`/messages?user=${song.studio?.owner_id}`} className="reels-action"><Mail size={20} className="text-white" /></Link>
            <button type="button" onClick={handleRoom} className="reels-action"><Users size={20} className="text-white" /></button>
            <button type="button" onClick={handleOffline} className="reels-action"><Download size={20} className="text-white" /></button>
            <button type="button" onClick={() => user && reportClip(song.id, user.id, 'inappropriate').catch(() => {})} className="reels-action"><Flag size={18} className="text-white/60" /></button>
          </>
        )}

        <button type="button" onClick={cycleSpeed} className="reels-action flex items-center gap-1 text-[10px] text-white/70">
          <Gauge size={16} /> {speed}x
        </button>
        {song.file_type === 'mp4' && (
          <button type="button" onClick={handlePiP} className="reels-action"><PictureInPicture2 size={18} className="text-white" /></button>
        )}
        <button type="button" onClick={handleCast} className="reels-action"><Cast size={18} className="text-white" /></button>

        {playing && (
          <button type="button" onClick={togglePlay} className="reels-action">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"><Pause size={18} className="text-white" /></span>
          </button>
        )}
      </div>

      <WhyThisSongModal open={whyOpen} onClose={() => setWhyOpen(false)} reasons={matchReasons} tags={song.tags ?? []} username={username} score={matchScore} likedSongIds={[]} />
      <ReelCommentSheet song={song} open={commentsOpen} onClose={() => setCommentsOpen(false)} onCountChange={setCommentCount} />
      <ReelShareSheet song={song} clipStart={clipStart} clipEnd={clipEnd} open={shareOpen} onClose={() => setShareOpen(false)} />
    </section>
  );
}
