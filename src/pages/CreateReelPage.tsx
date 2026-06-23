import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Film, ArrowLeft } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import AppLoadingScreen from '../components/AppLoadingScreen';
import UploadSongForm from '../components/UploadSongForm';
import { useAuth } from '../context/AuthContext';
import { fetchStudioByOwner } from '../lib/api';
import type { Studio } from '../lib/types';

export default function CreateReelPage() {
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
      <Link to="/create" className="mb-4 flex items-center gap-1 text-sm text-blue-400">
        <ArrowLeft size={14} /> {t('create.backToHub')}
      </Link>
      <h1 className="mb-2 flex items-center gap-2 text-2xl text-[var(--text-primary)]">
        <Film size={24} /> {t('create.reelTitle')}
      </h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">{t('create.reelDesc')}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-lg bg-pink-700/80 px-3 py-1 text-xs text-white">MP3</span>
        <span className="rounded-lg bg-orange-700/80 px-3 py-1 text-xs text-white">MP4</span>
      </div>

      <UploadSongForm
        studioId={studio.id}
        mode="reel"
        onUploaded={() => navigate('/reels')}
      />

      <Link to="/reels" className="mt-6 block text-center text-sm text-blue-400">
        {t('create.viewReels')}
      </Link>
    </PageLayout>
  );
}
