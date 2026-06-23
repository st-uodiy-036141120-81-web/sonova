import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { createOAuthProfile } from '../lib/apiExtended';
import { isUsernameAvailable, POPULAR_TAGS } from '../lib/api';
import { saveTasteTags } from '../lib/featuresApi';
import { validateUsername, USERNAME_MAX_LENGTH } from '../lib/validators';

export default function OnboardingPage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState<'profile' | 'tags'>('profile');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!loading && profile) {
    navigate('/');
    return null;
  }

  if (!loading && !user) {
    navigate('/login');
    return null;
  }

  const toggleTag = (tag: string) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((x) => x !== tag);
      if (prev.length >= 3) return prev;
      return [...prev, tag];
    });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const validation = validateUsername(username);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    try {
      const available = await isUsernameAvailable(username.trim());
      if (!available) {
        setError(t('auth.usernameTaken'));
        return;
      }
      await createOAuthProfile(user.id, username.trim(), displayName.trim() || username.trim());
      setStep('tags');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleTagsSubmit = async () => {
    if (!user || tags.length < 3) {
      setError(t('onboarding.pickThree'));
      return;
    }
    setSaving(true);
    try {
      await saveTasteTags(user.id, tags);
      await refreshProfile();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout className="flex min-h-screen items-center justify-center px-4 pb-24 pt-28">
      <div className="liquid-glass w-full max-w-md rounded-2xl p-8" style={{ background: 'var(--glass-bg)' }}>
        {step === 'profile' ? (
          <>
            <h1 className="text-2xl text-[var(--text-primary)]">{t('auth.oauthSetup')}</h1>
            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
              <input value={username} onChange={(e) => setUsername(e.target.value.slice(0, USERNAME_MAX_LENGTH))} placeholder={t('auth.username')} required maxLength={USERNAME_MAX_LENGTH} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('auth.displayName')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={saving} className="w-full rounded-xl bg-blue-700 py-3 text-sm text-white disabled:opacity-50">{t('common.next')}</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl text-[var(--text-primary)]">{t('onboarding.title')}</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{t('onboarding.subtitle')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {POPULAR_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`rounded-lg px-3 py-1.5 text-xs ${tags.includes(tag) ? 'bg-blue-700 text-white' : 'bg-white/10 text-[var(--text-muted)]'}`}>#{tag}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">{tags.length}/3</p>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <button type="button" onClick={handleTagsSubmit} disabled={saving || tags.length < 3} className="mt-4 w-full rounded-xl bg-blue-700 py-3 text-sm text-white disabled:opacity-50">{t('common.save')}</button>
          </>
        )}
      </div>
    </PageLayout>
  );
}
