import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronUp, Music2, Sparkles, Users, Trophy } from 'lucide-react';
import SonovaLogo from '../components/SonovaLogo';
import SongReelSlide from '../components/SongReelSlide';
import ReelsMoodBar from '../components/reels/ReelsMoodBar';
import { useAuth } from '../context/AuthContext';
import { useUserSettings } from '../context/UserSettingsContext';
import { fetchPersonalizedReels, isHighMatch } from '../lib/personalizedReels';
import { isSupabaseConfigured } from '../lib/supabase';
import type { ScoredSong } from '../lib/tasteAlgorithm';
import type { ReelMood } from '../lib/reelsFeatures/moodFilter';
import { getReelsMix } from '../lib/reelsFeatures/localMix';
import { usePlayer } from '../context/PlayerContext';

export default function ReelsPage() {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { play } = usePlayer();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);

  const [feed, setFeed] = useState<ScoredSong[]>([]);
  const [tasteStrength, setTasteStrength] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState<ReelMood>((params.get('mood') as ReelMood) || 'all');
  const storyMode = params.get('mode') === 'stories';
  const clipOverride = params.get('clipStart') && params.get('clipEnd')
    ? { start: Number(params.get('clipStart')), end: Number(params.get('clipEnd')) }
    : undefined;

  const loadFeed = useCallback(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPersonalizedReels(user?.id, 40, { mood }).then(({ feed: ranked, tasteStrength: strength }) => {
      setFeed(ranked);
      setTasteStrength(strength);
      setLoading(false);
    });
  }, [user?.id, mood]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  useEffect(() => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (mood === 'all') next.delete('mood');
      else next.set('mood', mood);
      return next;
    }, { replace: true });
  }, [mood, setParams]);

  useEffect(() => {
    if (loading || feed.length === 0) return;
    const songId = params.get('song');
    if (!songId) return;
    const idx = feed.findIndex((s) => s.song.id === songId);
    if (idx >= 0) {
      requestAnimationFrame(() => {
        slideRefs.current[idx]?.scrollIntoView({ behavior: 'auto', block: 'start' });
        setActiveIndex(idx);
      });
    }
  }, [loading, feed, params]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || feed.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const idx = slideRefs.current.indexOf(entry.target as HTMLElement);
            if (idx >= 0) setActiveIndex(idx);
          }
        }
      },
      { root, threshold: [0.55, 0.75] }
    );
    slideRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [feed]);

  const scrollToIndex = useCallback((idx: number) => {
    slideRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveIndex(idx);
  }, []);

  const goNext = useCallback(() => scrollToIndex(Math.min(activeIndex + 1, feed.length - 1)), [activeIndex, feed.length, scrollToIndex]);
  const goPrev = useCallback(() => scrollToIndex(Math.max(activeIndex - 1, 0)), [activeIndex, scrollToIndex]);

  useEffect(() => {
    if (!settings.keyboardShortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowUp') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, settings.keyboardShortcuts]);

  const playMix = () => {
    const mix = getReelsMix();
    if (mix.length) play(mix[0], mix);
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black text-white/60">
        {t('reels.personalizing')}
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <Music2 size={40} className="text-white/40" />
        <p className="text-white/60">{t('reels.empty')}</p>
        <Link to="/" className="text-blue-400">{t('common.back')}</Link>
      </div>
    );
  }

  const personalized = tasteStrength > 0.15;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <header className="absolute top-0 left-0 right-0 z-40 flex flex-col gap-2 px-4 pt-4 pb-2 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between pointer-events-none">
          <Link to="/" className="pointer-events-auto flex items-center gap-2">
            <SonovaLogo />
            <span className="text-sm text-white">
              {storyMode ? t('reels.storiesFeed') : personalized ? t('reels.forYouFeed') : t('reels.title')}
            </span>
          </Link>
          <div className="flex items-center gap-2 pointer-events-auto">
            {personalized && !storyMode && (
              <span className="flex items-center gap-1 rounded-full bg-blue-700/60 px-2.5 py-1 text-[10px] text-white backdrop-blur-sm">
                <Sparkles size={10} /> {Math.round(tasteStrength * 100)}%
              </span>
            )}
            <Link to="/hook-challenge" className="rounded-full bg-white/10 p-1.5 text-white" title={t('reelsFeatures.hookChallenge')}><Trophy size={14} /></Link>
            <Link to="/taste-twin" className="rounded-full bg-white/10 p-1.5 text-white" title={t('reelsFeatures.tasteTwin')}><Users size={14} /></Link>
            {getReelsMix().length > 0 && (
              <button type="button" onClick={playMix} className="rounded-full bg-pink-600/80 px-2 py-1 text-[10px] text-white">{t('reelsFeatures.playMix')}</button>
            )}
          </div>
        </div>
        {!storyMode && <ReelsMoodBar mood={mood} onChange={setMood} />}
      </header>

      <div ref={scrollRef} className="reels-scroll h-[100dvh] w-full overflow-y-scroll">
        {feed.map((item, i) => {
          const username = item.song.studio?.owner?.username ?? 'unknown';
          return (
            <div key={`${item.song.id}-${i}`} ref={(el) => { slideRefs.current[i] = el; }}>
              <SongReelSlide
                song={item.song}
                isActive={i === activeIndex}
                username={username}
                forYou={isHighMatch(item) || item.isDiscover}
                storyMode={storyMode}
                matchReasons={item.isDiscover ? ['discover', ...item.matchReasons] : item.isRepost ? ['repost', ...item.matchReasons] : item.matchReasons}
                matchScore={item.score}
                clipOverride={item.repostClip ?? clipOverride}
                isDiscover={item.isDiscover}
                onEnded={i === activeIndex ? goNext : undefined}
                onCreateRoom={(roomId) => navigate(`/room/${roomId}`)}
              />
            </div>
          );
        })}
      </div>

      {activeIndex < feed.length - 1 && (
        <span className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 text-xs text-white/50 animate-pulse">
          <ChevronUp size={14} className="rotate-180" /> {t('reels.swipeHint')}
        </span>
      )}
    </div>
  );
}
