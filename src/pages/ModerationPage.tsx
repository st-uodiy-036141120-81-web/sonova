import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { fetchPendingReports, resolveReport } from '../lib/apiExtended';
import { fetchClipReports } from '../lib/reelsFeatures/api';
import type { CommentReport } from '../lib/types';

export default function ModerationPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [reports, setReports] = useState<CommentReport[]>([]);
  const [clipReports, setClipReports] = useState<Awaited<ReturnType<typeof fetchClipReports>>>([]);

  const load = () => {
    fetchPendingReports().then(setReports).catch(() => setReports([]));
    fetchClipReports().then(setClipReports).catch(() => setClipReports([]));
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
    else if (!authLoading && profile && !profile.is_admin) navigate('/');
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (profile?.is_admin) load();
  }, [profile]);

  const handleResolve = async (r: CommentReport, deleteComment: boolean) => {
    if (!user) return;
    await resolveReport(r.id, user.id, 'resolved', deleteComment, r.comment_id);
    load();
  };

  const handleDismiss = async (r: CommentReport) => {
    if (!user) return;
    await resolveReport(r.id, user.id, 'dismissed');
    load();
  };

  if (!profile?.is_admin) {
    return (
      <PageLayout className="flex min-h-screen items-center justify-center pt-24">
        <p className="text-[var(--text-muted)]">{t('moderation.accessDenied')}</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="mx-auto max-w-2xl px-4 pb-32 pt-28 sm:pt-36">
      <h1 className="flex items-center gap-2 text-2xl text-[var(--text-primary)]">
        <Shield size={24} /> {t('moderation.title')}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{t('moderation.pending')}</p>

      <div className="mt-8 space-y-3">
        {reports.length === 0 ? (
          <p className="text-[var(--text-muted)]">{t('moderation.noReports')}</p>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="liquid-glass rounded-2xl p-4" style={{ background: 'var(--glass-bg)' }}>
              <p className="text-xs text-[var(--text-muted)]">@{r.reporter?.username}</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{r.reason}</p>
              {r.comment && (
                <blockquote className="mt-2 border-r-2 border-blue-500 pr-3 text-sm text-[var(--text-muted)]">
                  {r.comment.content}
                </blockquote>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleResolve(r, true)}
                  className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs text-white hover:scale-105"
                >
                  {t('moderation.resolveDelete')}
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve(r, false)}
                  className="rounded-lg bg-green-600/80 px-3 py-1.5 text-xs text-white"
                >
                  {t('moderation.resolve')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDismiss(r)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-[var(--text-primary)]"
                >
                  {t('moderation.dismiss')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {clipReports.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg text-[var(--text-primary)]">{t('reelsFeatures.clipReports')}</h2>
          <div className="mt-4 space-y-3">
            {clipReports.map((r) => (
              <div key={r.id} className="liquid-glass rounded-2xl p-4" style={{ background: 'var(--glass-bg)' }}>
                <p className="text-xs text-[var(--text-muted)]">@{r.reporter?.username}</p>
                <p className="text-sm text-[var(--text-primary)]">{r.song?.title}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{r.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageLayout>
  );
}
