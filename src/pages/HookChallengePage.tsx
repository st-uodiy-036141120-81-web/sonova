import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { fetchActiveHookChallenge, fetchHookChallengeEntries, enterHookChallenge } from '../lib/reelsFeatures/api';
import { useAuth } from '../context/AuthContext';
import type { HookChallenge } from '../lib/types';
import type { Song } from '../lib/types';

export default function HookChallengePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [challenge, setChallenge] = useState<HookChallenge | null>(null);
  const [entries, setEntries] = useState<{ song: Song }[]>([]);
  const [songId, setSongId] = useState('');

  useEffect(() => {
    fetchActiveHookChallenge().then(async (c) => {
      setChallenge(c);
      if (c) {
        const list = await fetchHookChallengeEntries(c.id);
        setEntries(list.filter((e) => e.song) as { song: Song }[]);
      }
    });
  }, []);

  const join = async () => {
    if (!user || !challenge || !songId.trim()) return;
    await enterHookChallenge(challenge.id, songId.trim(), user.id);
    const list = await fetchHookChallengeEntries(challenge.id);
    setEntries(list.filter((e) => e.song) as { song: Song }[]);
    setSongId('');
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="flex items-center gap-2 text-xl text-white"><Trophy className="text-yellow-400" /> {t('reelsFeatures.hookChallenge')}</h1>
      {challenge ? (
        <>
          <p className="mt-2 text-white/70">{challenge.title} · {challenge.hashtag}</p>
          {user && (
            <div className="mt-4 flex gap-2">
              <input value={songId} onChange={(e) => setSongId(e.target.value)} placeholder={t('reelsFeatures.enterSongId')} className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-sm text-white outline-none" />
              <button type="button" onClick={join} className="rounded-xl bg-blue-700 px-4 text-sm text-white">{t('reelsFeatures.joinChallenge')}</button>
            </div>
          )}
          <ul className="mt-6 space-y-2">
            {entries.map((e, i) => (
              <li key={e.song.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                <span className="text-white/50">#{i + 1}</span>
                <Link to={`/reels?song=${e.song.id}`} className="text-white hover:text-blue-300">{e.song.title}</Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 text-white/50">{t('reelsFeatures.noChallenge')}</p>
      )}
      <Link to="/reels" className="mt-6 inline-block text-blue-400">{t('reels.title')} →</Link>
    </div>
  );
}
