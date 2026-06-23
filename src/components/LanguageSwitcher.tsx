import { useTranslation } from 'react-i18next';
import { normalizeLang, setLanguage, type AppLanguage } from '../lib/i18n';

const LANGS: { code: AppLanguage; label: string }[] = [
  { code: 'ar', label: 'عربي' },
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = normalizeLang(i18n.language);

  return (
    <div className="liquid-glass flex rounded-xl p-0.5">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => void setLanguage(code)}
          className={`rounded-lg px-2 py-1 text-xs transition-colors ${
            current === code ? 'bg-blue-700 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
