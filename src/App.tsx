import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './lib/i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PlayerProvider, GlobalPlayer } from './context/PlayerContext';
import { UserSettingsProvider } from './context/UserSettingsContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudioPage from './pages/StudioPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import FeedPage from './pages/FeedPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import MessagesPage from './pages/MessagesPage';
import DashboardPage from './pages/DashboardPage';
import ModerationPage from './pages/ModerationPage';
import OnboardingPage from './pages/OnboardingPage';
import ReelsPage from './pages/ReelsPage';
import SongPage from './pages/SongPage';
import EmbedPage from './pages/EmbedPage';
import FocusPage from './pages/FocusPage';
import LivePage from './pages/LivePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DiscoverPage from './pages/DiscoverPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TasteReportPage from './pages/TasteReportPage';
import ListenLikePage from './pages/ListenLikePage';
import HookChallengePage from './pages/HookChallengePage';
import TasteTwinPage from './pages/TasteTwinPage';
import ListeningRoomPage from './pages/ListeningRoomPage';
import ClipAnalyticsPage from './pages/ClipAnalyticsPage';
import SavedPage from './pages/SavedPage';
import LegalPage from './pages/LegalPage';
import CookieConsent from './components/CookieConsent';
import AppLoadingScreen from './components/AppLoadingScreen';
import RequireAuth, { GuestOnly } from './components/RequireAuth';

function EmailVerificationGuard({ children }: { children: ReactNode }) {
  const { user, emailVerified, loading, profileLoading } = useAuth();
  const { pathname } = useLocation();
  const publicPaths = ['/login', '/register', '/verify-email', '/onboarding'];
  if (loading || (profileLoading && !publicPaths.includes(pathname))) return <AppLoadingScreen />;
  if (user && !emailVerified && !publicPaths.includes(pathname)) {
    return <Navigate to="/verify-email" replace />;
  }
  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: ReactNode }) {
  const { user, loading, needsOnboarding, profileLoading } = useAuth();
  const { pathname } = useLocation();
  const skipProfileWait = ['/onboarding', '/login', '/register', '/verify-email'].includes(pathname);
  if (loading || (profileLoading && !skipProfileWait)) return <AppLoadingScreen />;
  if (user && needsOnboarding && pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

const HIDE_PLAYER = ['/reels', '/focus', '/embed'];

function ConditionalGlobalPlayer() {
  const { pathname } = useLocation();
  if (HIDE_PLAYER.some((p) => pathname.startsWith(p))) return null;
  return <GlobalPlayer />;
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <EmailVerificationGuard>
            <OnboardingGuard>
              <UserSettingsProvider>
              <PlayerProvider>
                <Routes>
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/" element={<HomePage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/reels" element={<ReelsPage />} />
                  <Route path="/focus" element={<FocusPage />} />
                  <Route path="/song/:id" element={<SongPage />} />
                  <Route path="/embed/:id" element={<EmbedPage />} />
                  <Route path="/live/:username" element={<LivePage />} />
                  <Route path="/listen-like/:username" element={<ListenLikePage />} />
                  <Route path="/saved" element={<RequireAuth><SavedPage /></RequireAuth>} />
                  <Route path="/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
                  <Route path="/taste-report" element={<RequireAuth><TasteReportPage /></RequireAuth>} />
                  <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
                  <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
                  <Route path="/studio/:username" element={<StudioPage />} />
                  <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/feed" element={<FeedPage />} />
                  <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
                  <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                  <Route path="/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
                  <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
                  <Route path="/moderation" element={<RequireAuth><ModerationPage /></RequireAuth>} />
                  <Route path="/hook-challenge" element={<HookChallengePage />} />
                  <Route path="/taste-twin" element={<TasteTwinPage />} />
                  <Route path="/room/:id" element={<ListeningRoomPage />} />
                  <Route path="/clip-analytics/:songId" element={<RequireAuth><ClipAnalyticsPage /></RequireAuth>} />
                  <Route path="/legal/:doc" element={<LegalPage />} />
                  <Route path="/legal" element={<Navigate to="/legal/privacy" replace />} />
                </Routes>
                <ConditionalGlobalPlayer />
                <CookieConsent />
              </PlayerProvider>
              </UserSettingsProvider>
            </OnboardingGuard>
            </EmailVerificationGuard>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </I18nextProvider>
  );
}
