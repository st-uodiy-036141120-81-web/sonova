import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { fetchTasteReport } from '../lib/platformApi';

export default function TasteReportPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [report, setReport] = useState<{ tag: string; pct: number }[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchTasteReport(user.id).then(setReport);
  }, [user]);

  return (
    <PageLayout className="mx-auto max-w-lg px-4 pb-32 pt-28">
      <h1 className="text-2xl text-[var(--text-primary)]">{t('tasteReport.title')}</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{t('tasteReport.subtitle')}</p>

      <div className="mt-8 space-y-4">
        {report.length === 0 ? (
          <p className="text-[var(--text-muted)]">{t('tasteReport.empty')}</p>
        ) : (
          report.map(({ tag, pct }) => (
            <div key={tag}>
              <div className="flex justify-between text-sm text-[var(--text-primary)]">
                <span>#{tag}</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </PageLayout>
  );
}
