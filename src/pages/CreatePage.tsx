import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Film, Music, Radio, PlusCircle } from 'lucide-react';
import PageLayout from '../components/PageLayout';

const OPTIONS = [
  { key: 'story', to: '/create/story', icon: BookOpen, color: 'from-purple-600 to-pink-600' },
  { key: 'reel', to: '/create/reel', icon: Film, color: 'from-pink-600 to-orange-500' },
  { key: 'song', to: '/create/song', icon: Music, color: 'from-blue-600 to-cyan-500' },
  { key: 'live', to: '/create/live', icon: Radio, color: 'from-red-600 to-rose-500' },
] as const;

export default function CreatePage() {
  const { t } = useTranslation();

  return (
    <PageLayout className="mx-auto max-w-lg px-4 pb-32 pt-28 sm:pt-36">
      <div className="animate-fade-up mb-8 text-center">
        <PlusCircle size={32} className="mx-auto text-[var(--text-primary)]" />
        <h1 className="mt-3 text-2xl text-[var(--text-primary)]">{t('create.hubTitle')}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t('create.hubSubtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map(({ key, to, icon: Icon, color }) => (
          <Link
            key={key}
            to={to}
            className={`animate-fade-up liquid-glass group rounded-2xl p-5 ring-1 ring-white/10 transition-transform hover:scale-[1.02]`}
            style={{ background: 'var(--glass-bg)' }}
          >
            <span className={`inline-flex rounded-xl bg-gradient-to-br ${color} p-3`}>
              <Icon size={22} className="text-white" />
            </span>
            <h2 className="mt-4 text-base font-medium text-[var(--text-primary)]">{t(`create.${key}Title`)}</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{t(`create.${key}Desc`)}</p>
          </Link>
        ))}
      </div>

      <Link to="/live" className="animate-fade-up delay-1 mt-6 block text-center text-sm text-red-400">
        {t('create.browseLive')}
      </Link>
    </PageLayout>
  );
}
