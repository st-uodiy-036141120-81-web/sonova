import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Radio } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { fetchActiveLiveSessions } from '../lib/featuresApi';
import type { LiveSession } from '../lib/types';

export default function LiveBrowsePage() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveLiveSessions(30)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout className="mx-auto max-w-lg px-4 pb-32 pt-28 sm:pt-36">
      <h1 className="flex items-center gap-2 text-2xl text-[var(--text-primary)]">
        <Radio size={24} /> {t('live.browseTitle')}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{t('live.browseSubtitle')}</p>

      <Link
        to="/create/live"
        className="mt-4 inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
      >
        {t('live.startYourStream')}
      </Link>

      <div className="mt-8 space-y-3">
        {loading && <p className="text-sm text-[var(--text-muted)]">{t('common.loading')}</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">{t('live.noActive')}</p>
        )}
        {sessions.map((session) => {
          const username = session.studio?.owner?.username ?? session.host?.username;
          if (!username) return null;
          return (
            <Link
              key={session.id}
              to={`/live/${username}`}
              className="liquid-glass flex items-center gap-4 rounded-2xl p-4 transition-transform hover:scale-[1.01]"
              style={{ background: 'var(--glass-bg)' }}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs text-white animate-pulse">LIVE</span>
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--text-primary)]">{session.title}</p>
                <p className="text-xs text-[var(--text-muted)]">@{username}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </PageLayout>
  );
}
