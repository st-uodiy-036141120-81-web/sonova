import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitAppeal } from '../lib/featuresApi';
import { useAuth } from '../context/AuthContext';

interface AppealFormProps {
  songId?: string;
  commentId?: string;
}

export default function AppealForm({ songId, commentId }: AppealFormProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    try {
      await submitAppeal(user.id, reason.trim(), songId, commentId);
      setDone(true);
    } catch {
      setError(t('appeal.error'));
    }
  };

  if (done) return <p className="text-sm text-green-400">{t('appeal.sent')}</p>;

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t('appeal.placeholder')}
        rows={3}
        className="w-full rounded-xl bg-white/10 px-4 py-2 text-sm text-[var(--text-primary)] outline-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm text-white">{t('appeal.submit')}</button>
    </form>
  );
}
