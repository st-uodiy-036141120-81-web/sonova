import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ArrowLeft } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import AppLoadingScreen from '../components/AppLoadingScreen';
import PostStoryForm from '../components/PostStoryForm';
import StudioStoriesBar from '../components/StudioStoriesBar';
import { useAuth } from '../context/AuthContext';
import { fetchStudioByOwner } from '../lib/api';
import type { Studio } from '../lib/types';

export default function CreateStoryPage() {
  const { user, profile, loading: authLoading, needsOnboarding } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loadingStudio, setLoadingStudio] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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
        <BookOpen size={24} /> {t('create.storyTitle')}
      </h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">{t('create.storyDesc')}</p>

      <PostStoryForm studioId={studio.id} onPosted={() => setRefreshKey((k) => k + 1)} />

      <div key={refreshKey} className="mt-6">
        <p className="mb-2 text-xs text-[var(--text-muted)]">{t('create.activeStories')}</p>
        <StudioStoriesBar studioId={studio.id} />
      </div>

      <Link to={`/studio/${profile.username}`} className="mt-6 block text-center text-sm text-blue-400">
        {t('upload.viewStudio')}
      </Link>
    </PageLayout>
  );
}
