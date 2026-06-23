import type { ReactNode } from 'react';
import BoomerangVideoBg from './BoomerangVideoBg';
import Header from './Header';
import EmailVerificationBanner from './EmailVerificationBanner';
import SiteFooter from './SiteFooter';

interface PageLayoutProps {
  children: ReactNode;
  hero?: boolean;
  className?: string;
}

export default function PageLayout({ children, hero = false, className = '' }: PageLayoutProps) {
  return (
    <div className={`relative min-h-screen w-full overflow-x-hidden ${hero ? 'h-screen overflow-hidden' : ''}`}>
      <BoomerangVideoBg />
      <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'var(--page-overlay)' }} />
      <Header />
      <EmailVerificationBanner />
      <main className={`relative z-10 ${className}`}>{children}</main>
      {!hero && <SiteFooter />}
    </div>
  );
}
