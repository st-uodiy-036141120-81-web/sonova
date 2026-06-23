import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Music, Upload as UploadIcon } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import AppLoadingScreen from '../components/AppLoadingScreen';
import UploadSongForm from '../components/UploadSongForm';
import { useAuth } from '../context/AuthContext';
import { fetchStudioByOwner } from '../lib/api';
import type { Studio } from '../lib/types';

export default function UploadPage() {
  const { user, profile, loading: authLoading, needsOnboarding } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [studio, setStudio] = useState<Studio | null>(null);
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
    setLoadingStudio(true);
    fetchStudioByOwner(user.id)
      .then(setStudio)
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
      <div className="animate-fade-up mb-6">
        <h1 className="flex items-center gap-2 text-2xl text-[var(--text-primary)]">
          <UploadIcon size={24} /> {t('upload.pageTitle')}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t('upload.formatsHint')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-blue-700/80 px-3 py-1 text-xs text-white">MP3</span>
          <span className="rounded-lg bg-purple-700/80 px-3 py-1 text-xs text-white">MP4</span>
        </div>
      </div>

      <UploadSongForm
        studioId={studio.id}
        variant="simple"
        onUploaded={() => navigate(`/studio/${profile.username}`)}
      />

      <Link
        to={`/studio/${profile.username}`}
        className="animate-fade-up delay-1 mt-6 flex items-center justify-center gap-2 text-sm text-blue-400"
      >
        <Music size={16} /> {t('upload.viewStudio')}
      </Link>
    </PageLayout>
  );
}
