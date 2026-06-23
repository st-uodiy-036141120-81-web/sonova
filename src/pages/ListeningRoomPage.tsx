import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchListeningRoom, joinListeningRoom } from '../lib/reelsFeatures/api';
import { useAuth } from '../context/AuthContext';
import type { ListeningRoom } from '../lib/types';

export default function ListeningRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [room, setRoom] = useState<ListeningRoom | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchListeningRoom(id).then(setRoom);
    if (user) joinListeningRoom(id, user.id).catch(() => {});
    const interval = setInterval(() => { if (id) fetchListeningRoom(id).then(setRoom); }, 5000);
    return () => clearInterval(interval);
  }, [id, user]);

  if (!room) return <div className="flex h-[50vh] items-center justify-center text-white/50">{t('reelsFeatures.roomLoading')}</div>;

  return (
    <div className="mx-auto max-w-md px-4 py-8 text-center">
      <h1 className="text-xl text-white">{room.title}</h1>
      <p className="mt-2 text-sm text-white/60">@{room.host?.username} · {t('reelsFeatures.listeningRoom')}</p>
      {room.song && (
        <Link to={`/reels?song=${room.song.id}`} className="mt-6 block rounded-2xl bg-white/10 p-6 text-white hover:bg-white/15">
          ▶ {room.song.title}
        </Link>
      )}
      <p className="mt-4 text-xs text-white/40">{t('reelsFeatures.roomHint')}</p>
      <Link to="/reels" className="mt-6 inline-block text-blue-400">{t('reels.title')} →</Link>
    </div>
  );
}
