import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { findTasteTwins } from '../lib/reelsFeatures/api';
import { useAuth } from '../context/AuthContext';

interface Twin {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  overlap: number;
}

export default function TasteTwinPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [twins, setTwins] = useState<Twin[]>([]);

  useEffect(() => {
    if (user) findTasteTwins(user.id).then(setTwins);
  }, [user]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="flex items-center gap-2 text-xl text-white"><Users /> {t('reelsFeatures.tasteTwin')}</h1>
      <p className="mt-2 text-sm text-white/60">{t('reelsFeatures.tasteTwinHint')}</p>
      {!user ? (
        <Link to="/login" className="mt-4 text-blue-400">{t('nav.login')}</Link>
      ) : twins.length === 0 ? (
        <p className="mt-6 text-white/50">{t('reelsFeatures.noTwins')}</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {twins.map((twin) => (
            <li key={twin.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <Link to={`/studio/${twin.username}`} className="text-white hover:text-blue-300">@{twin.username}</Link>
              <span className="text-xs text-white/50">{t('reelsFeatures.overlap', { count: twin.overlap })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
