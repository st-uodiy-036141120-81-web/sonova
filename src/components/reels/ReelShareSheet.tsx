import { useState } from 'react';
import { X, Copy, QrCode, MessageCircle, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Song } from '../../lib/types';
import { buildClipEmbedUrl, buildQrUrl, buildReelShareUrl, buildWhatsAppShareUrl } from '../../lib/reelsFeatures/shareLinks';
import { recordClipAnalytics } from '../../lib/reelsFeatures/api';
import { useAuth } from '../../context/AuthContext';

interface ReelShareSheetProps {
  song: Song;
  clipStart: number;
  clipEnd: number | null;
  open: boolean;
  onClose: () => void;
}

export default function ReelShareSheet({ song, clipStart, clipEnd, open, onClose }: ReelShareSheetProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const url = buildReelShareUrl(song.id, clipStart, clipEnd ?? undefined);
  const embedUrl = buildClipEmbedUrl(song.id);
  const qr = buildQrUrl(url);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    recordClipAnalytics(song.id, 'share', user?.id).catch(() => {});
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/50" onClick={onClose}>
      <div className="reels-sheet w-full rounded-t-3xl bg-[#121218]/95 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">{t('reelsFeatures.share.title')}</h3>
          <button type="button" onClick={onClose}><X size={18} className="text-white/60" /></button>
        </div>
        <img src={qr} alt="QR" className="mx-auto mb-4 rounded-lg bg-white p-2" width={160} height={160} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={copy} className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm text-white">
            <Copy size={16} /> {copied ? t('reelsFeatures.share.copied') : t('reelsFeatures.share.copyLink')}
          </button>
          <a href={buildWhatsAppShareUrl(song.title, url)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-green-700/80 py-3 text-sm text-white">
            <MessageCircle size={16} /> WhatsApp
          </a>
          <button type="button" onClick={() => navigator.clipboard.writeText(`<iframe src="${embedUrl}" width="320" height="80"></iframe>`)} className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm text-white">
            <Link2 size={16} /> {t('song.embed')}
          </button>
          <a href={qr} download={`${song.id}-qr.png`} className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm text-white">
            <QrCode size={16} /> QR
          </a>
        </div>
      </div>
    </div>
  );
}
