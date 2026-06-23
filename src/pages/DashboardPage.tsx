import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, Download, Heart, Play } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import StatsChart from '../components/StatsChart';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardStats } from '../lib/apiExtended';
import type { DashboardStats } from '../lib/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchDashboardStats(user.id).then(setStats);
  }, [user]);

  const cards = [
    { icon: Play, label: t('dashboard.totalPlays'), value: stats?.totalPlays ?? 0 },
    { icon: Download, label: t('dashboard.totalDownloads'), value: stats?.totalDownloads ?? 0 },
    { icon: Heart, label: t('dashboard.totalLikes'), value: stats?.totalLikes ?? 0 },
  ];

  return (
    <PageLayout className="mx-auto max-w-2xl px-4 pb-32 pt-28 sm:pt-36">
      <h1 className="animate-fade-up flex items-center gap-2 text-2xl text-[var(--text-primary)]">
        <BarChart3 size={24} /> {t('dashboard.title')}
      </h1>

      <div className="animate-fade-up delay-1 mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ icon: Icon, label, value }) => (
          <div key={label} className="liquid-glass rounded-2xl p-5 text-center" style={{ background: 'var(--glass-bg)' }}>
            <Icon size={22} className="mx-auto text-blue-500" />
            <p className="mt-2 text-2xl font-medium text-[var(--text-primary)]">{value.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
          </div>
        ))}
      </div>

      <section className="animate-fade-up delay-2 mt-10">
        <h2 className="mb-4 text-lg text-[var(--text-primary)]">{t('dashboard.topSongs')}</h2>
        {!stats || stats.topSongs.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t('dashboard.noData')}</p>
        ) : (
          <div className="liquid-glass rounded-2xl p-6" style={{ background: 'var(--glass-bg)' }}>
            <StatsChart songs={stats.topSongs} labelKey="play_count" />
          </div>
        )}
      </section>

      <section className="animate-fade-up delay-3 mt-6">
        <Link to="/analytics" className="text-sm text-blue-400">{t('analytics.viewAdvanced')} →</Link>
      </section>
    </PageLayout>
  );
}
