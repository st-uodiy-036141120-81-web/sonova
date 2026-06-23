import { Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ShareButtonProps {
  title: string;
  url: string;
}

export default function ShareButton({ title, url }: ShareButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={share}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 transition-colors"
      aria-label={t('song.share')}
    >
      {copied ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
    </button>
  );
}
