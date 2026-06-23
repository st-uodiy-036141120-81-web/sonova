import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X, Search, LogIn, LogOut, User, Disc3, Rss, MessageCircle, BarChart3, Shield, PlaySquare, Upload } from 'lucide-react';
import SonovaLogo from './SonovaLogo';
import NotificationsBell from './NotificationsBell';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, profile, signOut, configured } = useAuth();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const NAV = [
    { label: t('nav.discover'), to: '/discover' },
    { label: t('nav.reels'), to: '/reels' },
    { label: t('focus.title'), to: '/focus' },
    { label: t('nav.explore'), to: '/search' },
    { label: t('nav.feed'), to: '/feed' },
  ];

  return (
    <header className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 md:px-10 pt-5">
      <div className="flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 select-none shrink-0">
          <SonovaLogo />
          <span className="text-base tracking-tight text-[var(--text-primary)]">{t('brand')}</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-5">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              {item.label}
            </Link>
          ))}
          {profile && (
            <>
              <Link to="/upload" className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm text-gray-900 hover:scale-105">
                <Upload size={14} /> {t('nav.upload')}
              </Link>
              <Link to={`/studio/${profile.username}`} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">{t('nav.myStudio')}</Link>
              <Link to="/messages" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">{t('nav.messages')}</Link>
              <Link to="/dashboard" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">{t('nav.dashboard')}</Link>
            </>
          )}
          {profile?.is_admin && (
            <Link to="/moderation" className="text-sm text-amber-400 hover:text-amber-300">{t('nav.moderation')}</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <button type="button" onClick={() => navigate('/reels')} className="liquid-glass hidden sm:flex h-9 w-9 items-center justify-center rounded-xl hover:scale-105" aria-label={t('nav.reels')}>
            <PlaySquare size={16} className="text-[var(--text-primary)]" />
          </button>

          <button type="button" onClick={() => navigate('/search')} className="liquid-glass hidden sm:flex h-9 w-9 items-center justify-center rounded-xl hover:scale-105" aria-label={t('common.search')}>
            <Search size={16} className="text-[var(--text-primary)]" />
          </button>

          {user && <NotificationsBell />}

          {user && profile ? (
            <>
              <Link to="/profile" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-0.5 hover:scale-105 transition-transform" aria-label={t('profile.title')}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-lg bg-blue-700"><User size={14} className="text-white" /></span>
                )}
              </Link>
              <Link to="/settings" className="hidden sm:inline text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                @{profile.username}
              </Link>
              <button type="button" onClick={() => signOut()} className="liquid-glass hidden md:flex h-9 w-9 items-center justify-center rounded-xl" aria-label={t('nav.logout')}>
                <LogOut size={16} className="text-[var(--text-primary)]" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm text-gray-900 hover:scale-105">
                <LogIn size={14} /><span className="hidden sm:inline">{t('nav.login')}</span>
              </Link>
              <Link to="/register" className="liquid-glass hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-[var(--text-primary)] hover:scale-105">
                <Disc3 size={14} />{t('nav.register')}
              </Link>
            </>
          )}

          <button type="button" className="liquid-glass flex h-9 w-9 items-center justify-center rounded-xl lg:hidden" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X size={18} className="text-[var(--text-primary)]" /> : <Menu size={18} className="text-[var(--text-primary)]" />}
          </button>
        </div>
      </div>

      {!configured && (
        <div className="mt-3 mx-auto max-w-lg rounded-xl bg-amber-500/90 px-4 py-2 text-center text-xs text-white">
          {t('auth.supabaseNotConfigured')}
        </div>
      )}

      {menuOpen && (
        <div className="liquid-glass mx-4 mt-3 rounded-2xl p-2 lg:hidden">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="block rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-white/10" onClick={() => setMenuOpen(false)}>{item.label}</Link>
          ))}
          {profile && (
            <>
              <Link to="/upload" className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-primary)]" onClick={() => setMenuOpen(false)}><Upload size={14} />{t('nav.upload')}</Link>
              <Link to={`/studio/${profile.username}`} className="block rounded-xl px-4 py-3 text-sm" onClick={() => setMenuOpen(false)}>{t('nav.myStudio')}</Link>
              <Link to="/messages" className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" onClick={() => setMenuOpen(false)}><MessageCircle size={14} />{t('nav.messages')}</Link>
              <Link to="/dashboard" className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" onClick={() => setMenuOpen(false)}><BarChart3 size={14} />{t('nav.dashboard')}</Link>
              <Link to="/feed" className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" onClick={() => setMenuOpen(false)}><Rss size={14} />{t('nav.feed')}</Link>
              <Link to="/settings" className="block rounded-xl px-4 py-3 text-sm" onClick={() => setMenuOpen(false)}>{t('nav.settings')}</Link>
            </>
          )}
          {profile?.is_admin && (
            <Link to="/moderation" className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-amber-300" onClick={() => setMenuOpen(false)}><Shield size={14} />{t('nav.moderation')}</Link>
          )}
          <div className="flex items-center gap-2 px-4 py-3 md:hidden"><LanguageSwitcher /><ThemeToggle /></div>
          {user && (
            <button type="button" onClick={() => { signOut(); setMenuOpen(false); }} className="block w-full rounded-xl px-4 py-3 text-start text-sm">{t('nav.logout')}</button>
          )}
        </div>
      )}
    </header>
  );
}
