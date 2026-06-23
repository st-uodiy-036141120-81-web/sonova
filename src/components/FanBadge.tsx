import { useTranslation } from 'react-i18next';

interface FanBadgeProps {
  order: number;
}

export default function FanBadge({ order }: FanBadgeProps) {
  const { t } = useTranslation();
  if (order > 100) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 ring-1 ring-amber-500/30">
      {t('fanBadge.listener', { order })}
    </span>
  );
}

export function TrustBadge({ score }: { score: number }) {
  const { t } = useTranslation();
  if (score < 30) return null;
  const label = score >= 70 ? t('fanBadge.trust.verified') : score >= 50 ? t('fanBadge.trust.active') : t('fanBadge.trust.new');
  return (
    <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300">
      ✓ {label} ({score})
    </span>
  );
}
