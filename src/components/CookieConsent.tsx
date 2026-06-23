import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const KEY = 'sonova_cookie_consent';

export default function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/10 bg-[#0a0a0f]/95 p-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-center text-xs text-white/70 sm:text-start">
          {t('legal.cookieBanner')}{' '}
          <Link to="/legal/privacy" className="text-blue-400 underline">{t('legal.privacy.title')}</Link>
        </p>
        <button
          type="button"
          onClick={() => { localStorage.setItem(KEY, '1'); setVisible(false); }}
          className="shrink-0 rounded-xl bg-blue-700 px-4 py-2 text-xs text-white"
        >
          {t('legal.cookieAccept')}
        </button>
      </div>
    </div>
  );
}
