import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLoadingScreen from './AppLoadingScreen';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, profileLoading } = useAuth();
  const { pathname } = useLocation();

  if (loading || profileLoading) return <AppLoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />;
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading, needsOnboarding } = useAuth();

  if (loading) return <AppLoadingScreen />;
  if (user && needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
