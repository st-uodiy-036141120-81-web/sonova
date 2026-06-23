import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { fetchStudioByUsername } from '../lib/api';
import { fetchActiveLive, startLiveSession, endLiveSession } from '../lib/featuresApi';
import { sendLiveSignal } from '../lib/platformApi';
import { supabase } from '../lib/supabase';
import type { LiveSession, Studio } from '../lib/types';

export default function LivePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [live, setLive] = useState<LiveSession | null>(null);
  const [title, setTitle] = useState('');
  const [useVideo, setUseVideo] = useState(false);
  const [connected, setConnected] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const load = async () => {
    if (!username) return;
    const s = await fetchStudioByUsername(username);
    if (!s) return;
    setStudio(s);
    setLive(await fetchActiveLive(s.id));
  };

  useEffect(() => { load(); }, [username]);

  useEffect(() => {
    if (!live?.id || !supabase) return;
    const channel = supabase.channel(`live-${live.id}`).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'live_signals', filter: `session_id=eq.${live.id}`,
    }, async (payload) => {
      const row = payload.new as { sender_id: string; signal_type: string; payload: RTCSessionDescriptionInit | RTCIceCandidateInit };
      if (row.sender_id === user?.id) return;
      const pc = pcRef.current;
      if (!pc) return;
      if (row.signal_type === 'offer') {
        await pc.setRemoteDescription(row.payload as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (user) await sendLiveSignal(live.id, user.id, 'answer', answer);
      } else if (row.signal_type === 'answer') {
        await pc.setRemoteDescription(row.payload as RTCSessionDescriptionInit);
      } else if (row.signal_type === 'ice') {
        await pc.addIceCandidate(row.payload as RTCIceCandidateInit);
      }
    }).subscribe();
    return () => { if (supabase) supabase.removeChannel(channel); };
  }, [live?.id, user?.id]);

  const isOwner = user?.id === studio?.owner_id;

  const attachStream = (stream: MediaStream) => {
    if (audioRef.current) audioRef.current.srcObject = stream;
    if (videoRef.current && useVideo) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
    setConnected(true);
  };

  const startWebRTC = async (withVideo: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    pc.ontrack = (e) => {
      if (e.streams[0]) attachStream(e.streams[0]);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && live && user) sendLiveSignal(live.id, user.id, 'ice', e.candidate.toJSON());
    };
    if (isOwner) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      attachStream(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (live && user) await sendLiveSignal(live.id, user.id, 'offer', offer);
    }
  };

  const handleStart = async () => {
    if (!studio || !user || !title.trim()) return;
    const session = await startLiveSession(studio.id, user.id, title.trim());
    setLive(session);
    setTimeout(() => startWebRTC(useVideo), 500);
  };

  const handleEnd = async () => {
    pcRef.current?.close();
    pcRef.current = null;
    if (!live) return;
    await endLiveSession(live.id);
    setLive(null);
    setConnected(false);
  };

  useEffect(() => {
    if (live?.is_active && !isOwner) startWebRTC(false);
  }, [live?.is_active, isOwner]);

  return (
    <PageLayout className="mx-auto max-w-lg px-4 pb-32 pt-28">
      <h1 className="text-2xl text-[var(--text-primary)]">{t('live.title')}</h1>
      {live?.is_active ? (
        <div className="mt-6 liquid-glass rounded-2xl p-6 ring-2 ring-red-500/50" style={{ background: 'var(--glass-bg)' }}>
          <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs text-white animate-pulse">● LIVE {connected && '· WebRTC'}</span>
          <p className="mt-4 text-lg text-[var(--text-primary)]">{live.title}</p>
          <p className="text-sm text-[var(--text-muted)]">@{username}</p>
          {useVideo || !isOwner ? (
            <video ref={videoRef} autoPlay playsInline muted={isOwner} className="mt-4 aspect-video w-full rounded-xl bg-black object-cover" />
          ) : null}
          <audio ref={audioRef} autoPlay playsInline className="mt-4 w-full" />
          {isOwner && (
            <button type="button" onClick={handleEnd} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm text-white">{t('live.end')}</button>
          )}
        </div>
      ) : isOwner ? (
        <div className="mt-6 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('live.sessionTitle')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input type="checkbox" checked={useVideo} onChange={(e) => setUseVideo(e.target.checked)} />
            {t('live.enableVideo')}
          </label>
          <button type="button" onClick={handleStart} disabled={!title.trim()} className="w-full rounded-xl bg-red-600 py-3 text-sm text-white disabled:opacity-50">{t('live.start')}</button>
        </div>
      ) : (
        <p className="mt-6 text-[var(--text-muted)]">{t('live.offline')}</p>
      )}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        {username && <Link to={`/studio/${username}`} className="text-blue-400">{t('common.back')}</Link>}
        <Link to="/live" className="text-blue-400">{t('create.browseLive')}</Link>
      </div>
    </PageLayout>
  );
}
