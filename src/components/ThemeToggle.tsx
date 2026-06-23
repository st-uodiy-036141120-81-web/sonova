import { Moon, Sun, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();

  const label =
    theme === 'dark' ? t('theme.light') : theme === 'light' ? t('theme.amoled') : t('theme.dark');

  return (
    <button
      type="button"
      onClick={toggle}
      className="liquid-glass flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 hover:scale-105"
      aria-label={label}
      title={label}
    >
      {theme === 'dark' && <Sun size={16} className="text-white" />}
      {theme === 'light' && <Moon size={16} className="text-gray-800" />}
      {theme === 'amoled' && <Smartphone size={16} className="text-white" />}
    </button>
  );
}
