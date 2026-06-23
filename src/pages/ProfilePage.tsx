import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadAvatar, fetchFollowCounts } from '../lib/api';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      fetchFollowCounts(profile.id).then(setCounts).catch(() => {});
    }
  }, [profile]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSaving(true);
    try {
      const url = await uploadAvatar(user.id, file);
      await updateProfile(user.id, { avatar_url: url });
      await refreshProfile();
      setMessage(t('profile.avatarUpdated'));
    } catch {
      setMessage(t('profile.avatarFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { display_name: displayName, bio });
      await refreshProfile();
      setMessage(t('profile.saved'));
    } catch {
      setMessage(t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !profile) {
    return (
      <PageLayout className="flex min-h-screen items-center justify-center pt-24">
        <p className="text-white/70">{t('common.loading')}</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="mx-auto max-w-lg px-4 pb-32 pt-28 sm:pt-36">
      <div className="animate-fade-up liquid-glass rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <h1 className="text-2xl text-white">{t('profile.title')}</h1>
        <p className="mt-1 text-sm text-white/60">@{profile.username} · {t('profile.followersCount', { followers: counts.followers, following: counts.following })}</p>

        <div className="mt-6 flex items-center gap-4">
          <label className="group relative cursor-pointer">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-700 text-2xl text-white">
                {profile.username[0]?.toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={20} className="text-white" />
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </label>
          <div>
            <p className="text-sm text-white">{t('profile.avatar')}</p>
            <p className="text-xs text-white/50">{t('profile.avatarHint')}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-8 space-y-4">
          <div>
            <label className="text-xs text-white/60">{t('profile.displayName')}</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-white/60">{t('profile.bio')}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {message && <p className="text-xs text-green-300">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm text-gray-900 transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? t('profile.saving') : t('profile.saveChanges')}
          </button>
        </form>

        <Link to={`/studio/${profile.username}`} className="mt-4 block text-center text-sm text-blue-300 hover:text-blue-200">
          {t('profile.goStudio')}
        </Link>
        <Link to="/settings" className="mt-2 block text-center text-sm text-blue-300 hover:text-blue-200">
          {t('nav.settings')} →
        </Link>
      </div>
    </PageLayout>
  );
}
