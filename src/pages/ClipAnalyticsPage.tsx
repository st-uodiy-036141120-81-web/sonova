import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';
import { fetchClipAnalyticsSummary } from '../lib/reelsFeatures/api';
import { formatClipTime } from '../lib/reelClip';

export default function ClipAnalyticsPage() {
  const { songId } = useParams<{ songId: string }>();
  const { t } = useTranslation();
  const [stats, setStats] = useState({ views: 0, listenFull: 0, avgStop: null as number | null, reposts: 0 });

  useEffect(() => {
    if (songId) fetchClipAnalyticsSummary(songId).then(setStats);
  }, [songId]);

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="flex items-center gap-2 text-xl text-white"><BarChart3 /> {t('reelsFeatures.clipAnalytics')}</h1>
      <dl className="mt-6 space-y-4">
        <div className="rounded-xl bg-white/5 p-4"><dt className="text-xs text-white/50">{t('reelsFeatures.views')}</dt><dd className="text-2xl text-white">{stats.views}</dd></div>
        <div className="rounded-xl bg-white/5 p-4"><dt className="text-xs text-white/50">{t('reelsFeatures.listenFullClicks')}</dt><dd className="text-2xl text-white">{stats.listenFull}</dd></div>
        <div className="rounded-xl bg-white/5 p-4"><dt className="text-xs text-white/50">{t('reelsFeatures.avgStop')}</dt><dd className="text-2xl text-white">{stats.avgStop != null ? formatClipTime(stats.avgStop) : '—'}</dd></div>
        <div className="rounded-xl bg-white/5 p-4"><dt className="text-xs text-white/50">{t('reelsFeatures.reposts')}</dt><dd className="text-2xl text-white">{stats.reposts}</dd></div>
      </dl>
      <Link to="/dashboard" className="mt-6 inline-block text-blue-400">{t('dashboard.title')} →</Link>
    </div>
  );
}
