import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import OAuthButtons from '../components/OAuthButtons';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn, configured, resendVerification } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.get('verified') === '1') {
      setInfo(t('auth.emailVerifiedLogin'));
    }
  }, [params, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    const err = await signIn(email, password);
    setLoading(false);
    if (err === 'EMAIL_NOT_CONFIRMED') {
      setError(t('auth.emailNotConfirmed'));
      await resendVerification(email.trim()).catch(() => {});
      setInfo(t('auth.verifySent'));
      return;
    }
    if (err) setError(err);
    else navigate('/');
  };

  return (
    <PageLayout className="flex min-h-screen items-center justify-center px-4 pb-24 pt-28">
      <div className="liquid-glass w-full max-w-md rounded-2xl p-8" style={{ background: 'var(--glass-bg)' }}>
        <h1 className="text-2xl text-[var(--text-primary)]">{t('auth.loginTitle')}</h1>

        {!configured && <p className="mt-4 rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-600">{t('auth.supabaseNotConfigured')}</p>}

        <div className="mt-6 space-y-4">
          <OAuthButtons />
          <div className="text-center text-xs text-[var(--text-muted)]">—</div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.email')} required className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth.password')} required className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
            {info && <p className="text-xs text-green-400">{info}</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-white py-3 text-sm text-gray-900 disabled:opacity-50">{t('auth.loginBtn')}</button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          {t('auth.noAccount')} <Link to="/register" className="text-blue-500">{t('nav.register')}</Link>
        </p>
      </div>
    </PageLayout>
  );
}
