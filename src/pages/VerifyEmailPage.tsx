import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function VerifyEmailPage() {
  const { user, emailVerified, resendVerification, signOut } = useAuth();
  const { t } = useTranslation();
  const [msg, setMsg] = useState('');

  if (!user) {
    return (
      <PageLayout className="flex min-h-screen items-center justify-center px-4 pt-28">
        <Link to="/login" className="text-blue-400">{t('nav.login')}</Link>
      </PageLayout>
    );
  }

  if (emailVerified) {
    return (
      <PageLayout className="flex min-h-screen items-center justify-center px-4 pt-28">
        <div className="liquid-glass max-w-md rounded-2xl p-8 text-center" style={{ background: 'var(--glass-bg)' }}>
          <p className="text-green-400">{t('auth.emailVerified')}</p>
          <Link to="/" className="mt-4 inline-block text-blue-400">{t('common.back')}</Link>
        </div>
      </PageLayout>
    );
  }

  const handleResend = async () => {
    const err = await resendVerification();
    setMsg(err ? err : t('auth.verifySent'));
  };

  return (
    <PageLayout className="flex min-h-screen items-center justify-center px-4 pb-24 pt-28">
      <div className="liquid-glass w-full max-w-md rounded-2xl p-8 text-center" style={{ background: 'var(--glass-bg)' }}>
        <Mail size={40} className="mx-auto text-blue-400" />
        <h1 className="mt-4 text-xl text-[var(--text-primary)]">{t('auth.verifyTitle')}</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">{t('auth.verifyEmail')}</p>
        <p className="mt-2 text-sm text-blue-400">{user.email}</p>
        <button type="button" onClick={handleResend} className="mt-6 w-full rounded-xl bg-blue-700 py-3 text-sm text-white">
          {t('auth.resendVerify')}
        </button>
        {msg && <p className="mt-3 text-xs text-green-400">{msg}</p>}
        <button type="button" onClick={() => signOut()} className="mt-4 text-xs text-[var(--text-muted)] underline">
          {t('nav.logout')}
        </button>
      </div>
    </PageLayout>
  );
}
