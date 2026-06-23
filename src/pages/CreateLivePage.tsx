import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Radio, ArrowLeft } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import AppLoadingScreen from '../components/AppLoadingScreen';
import { useAuth } from '../context/AuthContext';
import { fetchStudioByOwner } from '../lib/api';
import { fetchActiveLive } from '../lib/featuresApi';
import type { LiveSession, Studio } from '../lib/types';

export default function CreateLivePage() {
  const { user, profile, loading: authLoading, needsOnboarding } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [activeLive, setActiveLive] = useState<LiveSession | null>(null);
  const [loadingStudio, setLoadingStudio] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && needsOnboarding) navigate('/onboarding');
  }, [authLoading, needsOnboarding, navigate]);

  useEffect(() => {
    if (!user) {
      setLoadingStudio(false);
      return;
    }
    fetchStudioByOwner(user.id)
      .then(async (s) => {
        setStudio(s);
        if (s) setActiveLive(await fetchActiveLive(s.id));
      })
      .catch(() => setStudio(null))
      .finally(() => setLoadingStudio(false));
  }, [user?.id]);

  if (authLoading || loadingStudio) return <AppLoadingScreen />;

  if (!profile || !studio) {
    return (
      <PageLayout className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 pb-32 pt-28 text-center">
        <p className="text-[var(--text-muted)]">{t('upload.noStudio')}</p>
        <Link to="/onboarding" className="mt-4 text-sm text-blue-400">{t('upload.completeProfile')}</Link>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="mx-auto max-w-lg px-4 pb-32 pt-28 sm:pt-36">
      <Link to="/create" className="mb-4 flex items-center gap-1 text-sm text-blue-400">
        <ArrowLeft size={14} /> {t('create.backToHub')}
      </Link>
      <h1 className="mb-2 flex items-center gap-2 text-2xl text-[var(--text-primary)]">
        <Radio size={24} /> {t('create.liveTitle')}
      </h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">{t('create.liveDesc')}</p>

      <div className="liquid-glass rounded-2xl p-6 text-center" style={{ background: 'var(--glass-bg)' }}>
        {activeLive?.is_active ? (
          <>
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs text-white animate-pulse">● LIVE</span>
            <p className="mt-4 text-[var(--text-primary)]">{activeLive.title}</p>
            <Link
              to={`/live/${profile.username}`}
              className="mt-4 inline-block rounded-xl bg-red-600 px-6 py-2.5 text-sm text-white"
            >
              {t('create.manageLive')}
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)]">{t('create.liveStartHint')}</p>
            <Link
              to={`/live/${profile.username}`}
              className="mt-4 inline-block rounded-xl bg-red-600 px-6 py-2.5 text-sm text-white"
            >
              {t('live.start')}
            </Link>
          </>
        )}
      </div>

      <Link to="/live" className="mt-6 block text-center text-sm text-blue-400">
        {t('create.browseLive')}
      </Link>
    </PageLayout>
  );
}
