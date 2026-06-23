import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coffee } from 'lucide-react';
import { sendTip } from '../lib/platformApi';
import { useAuth } from '../context/AuthContext';

interface TipJarProps {
  receiverId: string;
  username: string;
}

const AMOUNTS = [100, 300, 500, 1000];

export default function TipJar({ receiverId, username }: TipJarProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);

  const tip = async (cents: number) => {
    if (!user) return;
    await sendTip(user.id, receiverId, cents, msg || undefined);
    setDone(true);
    setOpen(false);
  };

  if (done) return <p className="text-xs text-green-400">{t('tips.thanks')}</p>;

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 rounded-xl bg-amber-600/80 px-3 py-1.5 text-xs text-white">
        <Coffee size={14} /> {t('tips.support')} @{username}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-xl bg-white/10 p-3">
          <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t('tips.message')} className="w-full rounded-lg bg-black/20 px-3 py-1.5 text-xs text-white outline-none" />
          <div className="flex flex-wrap gap-2">
            {AMOUNTS.map((c) => (
              <button key={c} type="button" onClick={() => tip(c)} className="rounded-lg bg-amber-600 px-3 py-1 text-xs text-white">${(c / 100).toFixed(0)}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
