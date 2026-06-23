import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SongTransfer } from '../lib/types';
import { respondTransfer } from '../lib/api';

interface TransferRequestsProps {
  transfers: SongTransfer[];
  onUpdate: () => void;
}

export default function TransferRequests({ transfers, onUpdate }: TransferRequestsProps) {
  const { t } = useTranslation();
  if (transfers.length === 0) return null;

  const handle = async (tr: SongTransfer, accept: boolean) => {
    await respondTransfer(tr.id, accept, tr.requested_by, tr.song?.title ?? t('transfer.unknownSong'));
    onUpdate();
  };

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-sm text-amber-200">{t('transfer.title', { count: transfers.length })}</h3>
      <div className="space-y-2">
        {transfers.map((tr) => (
          <div key={tr.id} className="liquid-glass flex items-center justify-between rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div>
              <p className="text-sm text-white">{tr.song?.title ?? t('transfer.unknownSong')}</p>
              <p className="text-xs text-white/60">{t('transfer.from', { username: tr.requester?.username ?? '?' })}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handle(tr, true)}
                aria-label={t('transfer.accept')}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white hover:scale-105"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => handle(tr, false)}
                aria-label={t('transfer.reject')}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/80 text-white hover:scale-105"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
