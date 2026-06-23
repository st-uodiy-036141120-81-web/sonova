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
  const [connected, setConnected] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  const startWebRTC = async () => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    pc.ontrack = (e) => {
      if (audioRef.current) audioRef.current.srcObject = e.streams[0] ?? null;
      setConnected(true);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && live && user) sendLiveSignal(live.id, user.id, 'ice', e.candidate.toJSON());
    };
    if (isOwner) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (live && user) await sendLiveSignal(live.id, user.id, 'offer', offer);
    }
  };

  const handleStart = async () => {
    if (!studio || !user || !title.trim()) return;
    const session = await startLiveSession(studio.id, user.id, title.trim());
    setLive(session);
    setTimeout(() => startWebRTC(), 500);
  };

  const handleEnd = async () => {
    pcRef.current?.close();
    if (!live) return;
    await endLiveSession(live.id);
    setLive(null);
    setConnected(false);
  };

  useEffect(() => {
    if (live?.is_active && !isOwner) startWebRTC();
  }, [live?.is_active, isOwner]);

  return (
    <PageLayout className="mx-auto max-w-lg px-4 pb-32 pt-28">
      <h1 className="text-2xl text-[var(--text-primary)]">{t('live.title')}</h1>
      {live?.is_active ? (
        <div className="mt-6 liquid-glass rounded-2xl p-6 ring-2 ring-red-500/50" style={{ background: 'var(--glass-bg)' }}>
          <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs text-white animate-pulse">● LIVE {connected && '· WebRTC'}</span>
          <p className="mt-4 text-lg text-[var(--text-primary)]">{live.title}</p>
          <p className="text-sm text-[var(--text-muted)]">@{username}</p>
          <audio ref={audioRef} autoPlay playsInline className="mt-4 w-full" />
          {isOwner && (
            <button type="button" onClick={handleEnd} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm text-white">{t('live.end')}</button>
          )}
        </div>
      ) : isOwner ? (
        <div className="mt-6 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('live.sessionTitle')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
          <button type="button" onClick={handleStart} className="w-full rounded-xl bg-red-600 py-3 text-sm text-white">{t('live.start')}</button>
        </div>
      ) : (
        <p className="mt-6 text-[var(--text-muted)]">{t('live.offline')}</p>
      )}
      {username && <Link to={`/studio/${username}`} className="mt-6 block text-sm text-blue-400">{t('common.back')}</Link>}
    </PageLayout>
  );
}
