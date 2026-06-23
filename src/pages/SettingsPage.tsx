import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Save, LogOut } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { SettingsTabBar } from '../components/settings/SettingControls';
import SettingsPanels from '../components/settings/SettingsPanels';
import { useAuth } from '../context/AuthContext';
import { useUserSettings } from '../context/UserSettingsContext';
import { savePushSubscription } from '../lib/platformApi';
import { saveTasteTags } from '../lib/featuresApi';
import { resetLocalTaste } from '../lib/tasteStorage';
import {
  fetchBlockedUsers,
  unblockUser,
  updateProfile,
  uploadAvatar,
  updateUsername,
  fetchStudioByOwner,
  updateStudio,
  POPULAR_TAGS,
} from '../lib/api';
import { deleteOwnAccount, downloadJsonExport, exportUserData } from '../lib/userSettingsApi';
import { validatePasswordMatch } from '../lib/validators';
import { getVapidPublicKey, urlBase64ToUint8Array } from '../lib/push';
import type { Profile, Studio } from '../lib/types';

const TAB_IDS = ['profile', 'account', 'privacy', 'notifications', 'playback', 'reels', 'studio', 'social', 'display', 'storage', 'security'] as const;
type TabId = (typeof TAB_IDS)[number];

export default function SettingsPage() {
  const {
    user,
    profile,
    loading: authLoading,
    emailVerified,
    refreshProfile,
    resendVerification,
    updatePassword,
    updateEmail,
    signOut,
  } = useAuth();
  const { settings, updateSettings, resetSettings } = useUserSettings();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();

  const initialTab = (params.get('tab') as TabId) || 'profile';
  const [tab, setTab] = useState<TabId>(TAB_IDS.includes(initialTab) ? initialTab : 'profile');

  const [blocked, setBlocked] = useState<Profile[]>([]);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [pushDone, setPushDone] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [studioName, setStudioName] = useState('');
  const [studioDesc, setStudioDesc] = useState('');
  const [tasteTags, setTasteTags] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const isEmailAuth = Boolean(user?.identities?.some((i) => i.provider === 'email') ?? user?.email);

  const tabs = useMemo(
    () => TAB_IDS.map((id) => ({ id, label: t(`settings.tabs.${id}`) })),
    [t]
  );

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setParams({ tab }, { replace: true });
  }, [tab, setParams]);

  useEffect(() => {
    if (!user) return;
    fetchBlockedUsers(user.id).then(setBlocked);
    fetchStudioByOwner(user.id).then(setStudio).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? '');
    setBio(profile.bio ?? '');
    setUsername(profile.username);
    setTasteTags(profile.taste_tags ?? []);
  }, [profile]);

  useEffect(() => {
    if (!studio) return;
    setStudioName(studio.name);
    setStudioDesc(studio.description ?? '');
  }, [studio]);

  const handleResendVerify = async () => {
    setErr('');
    setMsg('');
    const error = await resendVerification();
    if (error) setErr(error);
    else setMsg(t('auth.verifySent'));
  };

  const referralLink = profile?.referral_code
    ? `${window.location.origin}/register?ref=${profile.referral_code}`
    : null;

  const handleTab = (id: string) => setTab(id as TabId);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSaving(true);
    try {
      const url = await uploadAvatar(user.id, file);
      await updateProfile(user.id, { avatar_url: url });
      await refreshProfile();
      setMsg(t('profile.avatarUpdated'));
    } catch {
      setErr(t('profile.avatarFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setErr('');
    try {
      await updateProfile(user.id, { display_name: displayName, bio });
      await saveTasteTags(user.id, tasteTags);
      await refreshProfile();
      setMsg(t('profile.saved'));
    } catch {
      setErr(t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleUsernameSave = async () => {
    if (!user || !profile || username.trim() === profile.username) return;
    setSaving(true);
    try {
      const error = await updateUsername(user.id, username);
      if (error === 'USERNAME_TAKEN') setErr(t('auth.usernameTaken'));
      else if (error) setErr(error);
      else {
        await refreshProfile();
        setMsg(t('settings.usernameUpdated'));
      }
    } catch {
      setErr(t('settings.usernameFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    setErr('');
    const validation = validatePasswordMatch(newPassword, confirmPassword);
    if (validation) {
      setErr(validation);
      return;
    }
    setSaving(true);
    const error = await updatePassword(newPassword);
    if (error) setErr(t('auth.passwordUpdateFailed'));
    else {
      setNewPassword('');
      setConfirmPassword('');
      setMsg(t('auth.passwordUpdated'));
    }
    setSaving(false);
  };

  const handleEmailSave = async () => {
    if (!newEmail.trim()) return;
    setSaving(true);
    const error = await updateEmail(newEmail);
    if (error) setErr(error);
    else setMsg(t('settings.emailChangeSent'));
    setSaving(false);
  };

  const handleStudioSave = async () => {
    if (!studio) return;
    setSaving(true);
    try {
      await updateStudio(studio.id, { name: studioName, description: studioDesc });
      setStudio(await fetchStudioByOwner(studio.owner_id));
      setMsg(t('settings.studioSaved'));
    } catch {
      setErr(t('settings.studioSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetTaste = () => {
    if (!user) return;
    resetLocalTaste(user.id);
    setMsg(t('settings.resetTasteDone'));
  };

  const handleExport = async () => {
    if (!user) return;
    const data = await exportUserData(user.id);
    downloadJsonExport(data, `sonova-export-${user.id.slice(0, 8)}.json`);
    setMsg(t('settings.exportDone'));
  };

  const handleDeleteAccount = async () => {
    if (!confirm(t('settings.deleteConfirm'))) return;
    try {
      await deleteOwnAccount();
      await signOut();
      navigate('/');
    } catch {
      setErr(t('settings.deleteFailed'));
    }
  };

  if (authLoading || !profile) {
    return (
      <PageLayout className="flex min-h-screen items-center justify-center pt-24">
        <p className="text-[var(--text-muted)]">{t('common.loading')}</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="mx-auto max-w-lg px-4 pb-32 pt-28 sm:pt-36">
      <div className="animate-fade-up">
        <h1 className="text-2xl text-[var(--text-primary)]">{t('nav.settings')}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t('settings.subtitle')}</p>
        <Link to={`/studio/${profile.username}`} className="mt-2 inline-block text-sm text-blue-400">
          {t('settings.viewProfile')} →
        </Link>
      </div>

      <SettingsTabBar tabs={tabs} active={tab} onChange={handleTab} />

      {(msg || err) && (
        <p className={`mb-4 text-xs ${err ? 'text-red-300' : 'text-green-300'}`}>{err || msg}</p>
      )}

      <div className="animate-fade-up space-y-4">
        {tab === 'profile' && (
          <div className="liquid-glass space-y-4 rounded-2xl p-5" style={{ background: 'var(--glass-bg)' }}>
            <div className="flex items-center gap-4">
              <label className="group relative cursor-pointer">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-xl text-white">
                    {profile.username[0]?.toUpperCase()}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera size={18} className="text-white" />
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </label>
              <div>
                <p className="text-sm text-[var(--text-primary)]">@{profile.username}</p>
                <p className="text-xs text-[var(--text-muted)]">{t('settings.profileHint')}</p>
              </div>
            </div>
            <form onSubmit={handleProfileSave} className="space-y-3">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('profile.displayName')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder={t('profile.bio')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
              <div>
                <p className="mb-2 text-xs text-[var(--text-muted)]">{t('settings.tasteHint')}</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTasteTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : prev.length >= 3 ? prev : [...prev, tag]))}
                      className={`rounded-lg px-2.5 py-1 text-xs ${tasteTags.includes(tag) ? 'bg-blue-700 text-white' : 'bg-white/10 text-[var(--text-muted)]'}`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm text-gray-900 disabled:opacity-50">
                <Save size={16} /> {saving ? t('profile.saving') : t('profile.saveChanges')}
              </button>
            </form>
            {studio && (
              <div className="space-y-2 border-t border-white/10 pt-4">
                <input value={studioName} onChange={(e) => setStudioName(e.target.value)} placeholder={t('settings.studioName')} className="w-full rounded-xl bg-white/10 px-4 py-2 text-sm text-[var(--text-primary)] outline-none" />
                <textarea value={studioDesc} onChange={(e) => setStudioDesc(e.target.value)} rows={2} placeholder={t('settings.studioDesc')} className="w-full rounded-xl bg-white/10 px-4 py-2 text-sm text-[var(--text-primary)] outline-none" />
                <button type="button" onClick={handleStudioSave} className="rounded-xl bg-blue-700 px-4 py-2 text-sm text-white">{t('common.save')}</button>
              </div>
            )}
          </div>
        )}

        {tab === 'account' && (
          <div className="liquid-glass space-y-4 rounded-2xl p-5" style={{ background: 'var(--glass-bg)' }}>
            <SettingsPanels tab="account" settings={settings} updateSettings={updateSettings} profile={profile} studio={studio} userEmail={user?.email} emailVerified={emailVerified} isEmailAuth={isEmailAuth} onResendVerify={handleResendVerify} />
            <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={7} placeholder={t('settings.username')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
            <button type="button" onClick={handleUsernameSave} disabled={username === profile.username} className="rounded-xl bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50">{t('common.save')}</button>
            {isEmailAuth && (
              <>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={t('settings.newEmail')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
                <button type="button" onClick={handleEmailSave} className="rounded-xl bg-blue-700 px-4 py-2 text-sm text-white">{t('settings.changeEmail')}</button>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('settings.newPassword')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('settings.confirmNewPassword')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
                <button type="button" onClick={handlePasswordSave} className="rounded-xl bg-blue-700 px-4 py-2 text-sm text-white">{t('settings.changePassword')}</button>
              </>
            )}
          </div>
        )}

        {tab !== 'profile' && tab !== 'account' && (
          <div className="liquid-glass rounded-2xl p-5" style={{ background: 'var(--glass-bg)' }}>
            <SettingsPanels
              tab={tab}
              settings={settings}
              updateSettings={(p) => void updateSettings(p)}
              profile={profile}
              studio={studio}
              userEmail={user?.email}
              emailVerified={emailVerified}
              isEmailAuth={isEmailAuth}
              onResetTaste={handleResetTaste}
              onExport={handleExport}
              onDeleteAccount={handleDeleteAccount}
              blocked={blocked}
              onUnblock={async (id) => {
                if (!user) return;
                await unblockUser(user.id, id);
                setBlocked((prev) => prev.filter((p) => p.id !== id));
              }}
              onEnablePush={async () => {
                if (!user || !('serviceWorker' in navigator)) return;
                const vapid = getVapidPublicKey();
                if (!vapid) {
                  setErr(t('settings.pushNeedsVapid'));
                  return;
                }
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
                });
                await savePushSubscription(user.id, sub.toJSON());
                setPushDone(true);
              }}
              pushDone={pushDone}
              referralLink={referralLink}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void resetSettings()} className="rounded-xl bg-white/10 px-4 py-2 text-xs text-[var(--text-primary)]">
            {t('settings.resetAll')}
          </button>
          <button type="button" onClick={() => signOut().then(() => navigate('/'))} className="flex items-center gap-2 rounded-xl bg-red-600/80 px-4 py-2 text-xs text-white">
            <LogOut size={14} /> {t('settings.logout')}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
