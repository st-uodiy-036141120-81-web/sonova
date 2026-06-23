import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="relative z-10 border-t border-white/10 px-4 py-8 text-center text-xs text-[var(--text-muted)]">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link to="/legal/privacy" className="hover:text-[var(--text-primary)]">{t('legal.privacy.title')}</Link>
        <Link to="/legal/terms" className="hover:text-[var(--text-primary)]">{t('legal.terms.title')}</Link>
        <Link to="/legal/dmca" className="hover:text-[var(--text-primary)]">{t('legal.dmca.title')}</Link>
      </div>
      <p className="mt-3">© {new Date().getFullYear()} Sonova</p>
    </footer>
  );
}
