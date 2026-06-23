import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { subscribeNewsletter } from '../lib/featuresApi';
import { useAuth } from '../context/AuthContext';

export default function NewsletterSignup() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await subscribeNewsletter(email, user?.id);
      setDone(true);
    } catch {
      setError(t('newsletter.error'));
    }
  };

  if (done) {
    return <p className="text-sm text-green-400">{t('newsletter.success')}</p>;
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="relative flex-1">
        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('newsletter.placeholder')}
          required
          className="w-full rounded-xl bg-white/10 py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none"
        />
      </div>
      <button type="submit" className="rounded-xl bg-blue-700 px-4 text-sm text-white">{t('newsletter.subscribe')}</button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
