import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, Clock, Users } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { fetchAdvancedStats } from '../lib/platformApi';
import type { AdvancedStats } from '../lib/types';

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdvancedStats | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchAdvancedStats(user.id).then(setStats);
  }, [user]);

  return (
    <PageLayout className="mx-auto max-w-2xl px-4 pb-32 pt-28">
      <h1 className="text-2xl text-[var(--text-primary)]">{t('analytics.title')}</h1>

      {stats ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="liquid-glass rounded-2xl p-5 text-center" style={{ background: 'var(--glass-bg)' }}>
            <Activity size={20} className="mx-auto text-blue-500" />
            <p className="mt-2 text-2xl text-[var(--text-primary)]">{Math.round(stats.avgCompletion * 100)}%</p>
            <p className="text-xs text-[var(--text-muted)]">{t('analytics.completion')}</p>
          </div>
          <div className="liquid-glass rounded-2xl p-5 text-center" style={{ background: 'var(--glass-bg)' }}>
            <Clock size={20} className="mx-auto text-blue-500" />
            <p className="mt-2 text-2xl text-[var(--text-primary)]">{stats.peakHour}:00</p>
            <p className="text-xs text-[var(--text-muted)]">{t('analytics.peakHour')}</p>
          </div>
          <div className="liquid-glass rounded-2xl p-5 text-center" style={{ background: 'var(--glass-bg)' }}>
            <Users size={20} className="mx-auto text-blue-500" />
            <p className="mt-2 text-2xl text-[var(--text-primary)]">{stats.topFanIds.length}</p>
            <p className="text-xs text-[var(--text-muted)]">{t('analytics.topFans')}</p>
          </div>
        </div>
      ) : (
        <p className="mt-8 text-[var(--text-muted)]">{t('common.loading')}</p>
      )}

      {stats && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg text-[var(--text-primary)]">{t('analytics.hourly')}</h2>
          <div className="flex h-24 items-end gap-1">
            {stats.hourCounts.map((c, h) => (
              <div key={h} className="flex-1 rounded-t bg-blue-600/60" style={{ height: `${Math.max(4, (c / Math.max(...stats.hourCounts, 1)) * 100)}%` }} title={`${h}:00`} />
            ))}
          </div>
        </section>
      )}
    </PageLayout>
  );
}
