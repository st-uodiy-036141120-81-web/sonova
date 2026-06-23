import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import OAuthButtons from '../components/OAuthButtons';
import { useAuth } from '../context/AuthContext';
import { validateUsername, validatePasswordMatch, USERNAME_MAX_LENGTH } from '../lib/validators';
import { isUsernameAvailable } from '../lib/api';
import { isSupabaseConfigured } from '../lib/supabase';
import { getErrorMessage, isUniqueViolation } from '../lib/errors';

export default function RegisterPage() {
  const { signUp, resendVerification } = useAuth();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = params.get('ref');
    if (ref) sessionStorage.setItem('sonova-ref', ref);
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validation = validateUsername(username);
    if (validation) { setError(validation); return; }
    const passErr = validatePasswordMatch(password, confirmPassword);
    if (passErr) { setError(passErr); return; }
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const available = await isUsernameAvailable(username.trim());
        if (!available) { setError(t('auth.usernameTaken')); setLoading(false); return; }
      }
      const err = await signUp(email, password, username.trim(), displayName.trim() || username.trim());
      if (err) setError(err);
      else {
        setSuccess(true);
        await resendVerification(email.trim()).catch(() => {});
      }
    } catch (err) {
      if (isUniqueViolation(err)) setError(t('auth.usernameTaken'));
      else setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout className="flex min-h-screen items-center justify-center px-4 pb-24 pt-28">
      <div className="liquid-glass w-full max-w-md rounded-2xl p-8" style={{ background: 'var(--glass-bg)' }}>
        <h1 className="text-2xl text-[var(--text-primary)]">{t('auth.registerTitle')}</h1>

        {success ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-green-500">{t('auth.verifyEmail')}</p>
            <p className="text-xs text-[var(--text-muted)]">{t('auth.verifyCheckInbox')}</p>
            <Link to="/login" className="block text-center text-sm text-blue-400">{t('nav.login')}</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <OAuthButtons />
            <div className="text-center text-xs text-[var(--text-muted)]">—</div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.slice(0, USERNAME_MAX_LENGTH))}
                placeholder={t('auth.username')}
                required
                maxLength={USERNAME_MAX_LENGTH}
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('auth.displayName')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.email')} required className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth.password')} required minLength={6} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('auth.confirmPassword')} required minLength={6} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-white py-3 text-sm text-gray-900 disabled:opacity-50">{t('auth.registerBtn')}</button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          {t('auth.hasAccount')} <Link to="/login" className="text-blue-500">{t('nav.login')}</Link>
        </p>
      </div>
    </PageLayout>
  );
}
