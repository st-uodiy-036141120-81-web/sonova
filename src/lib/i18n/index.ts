import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

export type AppLanguage = 'ar' | 'en' | 'fr';

export function normalizeLang(lang?: string): AppLanguage {
  const base = (lang ?? 'ar').split('-')[0] as AppLanguage;
  return base === 'en' || base === 'fr' ? base : 'ar';
}

const saved = normalizeLang(localStorage.getItem('sonova-lang') ?? undefined);

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: saved,
  fallbackLng: 'en',
  supportedLngs: ['ar', 'en', 'fr'],
  nonExplicitSupportedLngs: true,
  interpolation: { escapeValue: false },
  react: {
    useSuspense: false,
    bindI18n: 'languageChanged',
    bindI18nStore: 'added removed',
  },
});

export async function setLanguage(lang: AppLanguage) {
  await i18n.changeLanguage(lang);
  localStorage.setItem('sonova-lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

void setLanguage(saved);

export default i18n;
