import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Song } from '../lib/types';
import { requestSongTransfer, fetchProfileByUsername, fetchStudioByOwner } from '../lib/api';
import { validateUsername } from '../lib/validators';

interface TransferSongModalProps {
  song: Song;
  fromStudioId: string;
  requesterId: string;
  onClose: () => void;
  onTransferred: () => void;
}

export default function TransferSongModal({
  song,
  fromStudioId,
  requesterId,
  onClose,
  onTransferred,
}: TransferSongModalProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validation = validateUsername(username);
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    try {
      const profile = await fetchProfileByUsername(username.trim());
      if (!profile) {
        setError(t('transferModal.userNotFound'));
        return;
      }
      const targetStudio = await fetchStudioByOwner(profile.id);
      if (!targetStudio) {
        setError(t('transferModal.studioNotFound'));
        return;
      }
      await requestSongTransfer(
        song.id,
        fromStudioId,
        targetStudio.id,
        requesterId,
        song.title,
        profile.username
      );
      setSuccess(true);
      setTimeout(() => {
        onTransferred();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('transferModal.fail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="liquid-glass w-full max-w-md rounded-2xl p-6" style={{ background: 'rgba(20,20,30,0.85)' }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg text-white">{t('transferModal.title', { title: song.title })}</h3>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white"><X size={20} /></button>
        </div>
        {success ? (
          <p className="text-sm text-green-300">{t('transferModal.success')}</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-white/70">{t('transferModal.description')}</p>
            <form onSubmit={handleTransfer} className="space-y-3">
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username123" className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white outline-none" />
              {error && <p className="text-xs text-red-300">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-700 py-2.5 text-sm text-white disabled:opacity-50">
                {loading ? t('transferModal.sending') : t('transferModal.submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
