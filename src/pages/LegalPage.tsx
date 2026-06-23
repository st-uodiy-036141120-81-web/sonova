import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';

type LegalDoc = 'privacy' | 'terms' | 'dmca';

export default function LegalPage() {
  const { doc = 'privacy' } = useParams<{ doc: LegalDoc }>();
  const { t } = useTranslation();
  const key = ['privacy', 'terms', 'dmca'].includes(doc) ? doc : 'privacy';

  return (
    <PageLayout className="mx-auto max-w-2xl px-4 pb-24 pt-28">
      <nav className="mb-6 flex flex-wrap gap-3 text-sm">
        {(['privacy', 'terms', 'dmca'] as const).map((d) => (
          <Link
            key={d}
            to={`/legal/${d}`}
            className={key === d ? 'text-blue-400' : 'text-[var(--text-muted)] hover:text-white'}
          >
            {t(`legal.${d}.title`)}
          </Link>
        ))}
      </nav>
      <article className="liquid-glass rounded-2xl p-6 prose prose-invert max-w-none" style={{ background: 'var(--glass-bg)' }}>
        <h1 className="text-2xl text-[var(--text-primary)]">{t(`legal.${key}.title`)}</h1>
        <p className="mt-2 text-xs text-[var(--text-muted)]">{t('legal.updated')}</p>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--text-muted)]">
          {(t(`legal.${key}.sections`, { returnObjects: true }) as string[]).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </article>
      <Link to="/" className="mt-6 inline-block text-sm text-blue-400">{t('common.back')}</Link>
    </PageLayout>
  );
}
