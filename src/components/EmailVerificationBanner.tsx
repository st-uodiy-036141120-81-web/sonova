import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function EmailVerificationBanner() {
  const { user, emailVerified, resendVerification } = useAuth();
  const { t } = useTranslation();
  const [msg, setMsg] = useState('');

  if (!user || emailVerified) return null;

  const handleResend = async () => {
    const err = await resendVerification();
    setMsg(err ? err : 'OK');
  };

  return (
    <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/90 px-4 py-2 text-xs text-white">
      <span className="flex items-center gap-2">
        <Mail size={14} />
        {t('auth.verifyEmail')}
      </span>
      <button type="button" onClick={handleResend} className="shrink-0 underline hover:no-underline">
        {t('auth.resendVerify')}
      </button>
      {msg === 'OK' && <span className="text-green-200">✓</span>}
    </div>
  );
}
