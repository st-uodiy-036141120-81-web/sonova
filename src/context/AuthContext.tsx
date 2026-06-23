import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchProfile } from '../lib/api';
import type { Profile } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  profileLoading: boolean;
  configured: boolean;
  emailVerified: boolean;
  needsOnboarding: boolean;
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signInWithApple: () => Promise<string | null>;
  resendVerification: (email?: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  updateEmail: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const p = await fetchProfile(userId);
      setProfile(p);
      if (p) {
        void (async () => {
          const ref = sessionStorage.getItem('sonova-ref');
          try {
            const { applyReferral, ensureReferralCode } = await import('../lib/featuresApi');
            if (ref) {
              await applyReferral(userId, ref).catch(() => {});
              sessionStorage.removeItem('sonova-ref');
            }
            await ensureReferralCode(userId, p.username).catch(() => {});
          } catch {
            /* non-blocking */
          }
        })();
      }
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      if (!cancelled) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) void loadProfile(sess.user.id);
      else setProfile(null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(
    async (email: string, password: string, username: string, displayName: string) => {
      if (!supabase) return 'SUPABASE_NOT_CONFIGURED';
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username, display_name: displayName },
          emailRedirectTo: `${window.location.origin}/login?verified=1`,
        },
      });
      if (error) return error.message;
      if (data.user && !data.session) {
        return null;
      }
      return null;
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'SUPABASE_NOT_CONFIGURED';
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) return 'EMAIL_NOT_CONFIRMED';
      return error.message;
    }
    const verified = Boolean(data.user?.email_confirmed_at ?? data.user?.confirmed_at);
    if (!verified) {
      await supabase.auth.signOut();
      return 'EMAIL_NOT_CONFIRMED';
    }
    return null;
  }, []);

  const oauth = useCallback(async (provider: 'google' | 'apple') => {
    if (!supabase) return 'SUPABASE_NOT_CONFIGURED';
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });
    return error?.message ?? null;
  }, []);

  const signInWithGoogle = useCallback(() => oauth('google'), [oauth]);
  const signInWithApple = useCallback(() => oauth('apple'), [oauth]);

  const resendVerification = useCallback(async (email?: string) => {
    if (!supabase) return 'SUPABASE_NOT_CONFIGURED';
    const target = email?.trim() || user?.email;
    if (!target) return 'NO_EMAIL';
    const { error } = await supabase.auth.resend({ type: 'signup', email: target });
    return error?.message ?? null;
  }, [user]);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return 'SUPABASE_NOT_CONFIGURED';
    const { error } = await supabase.auth.updateUser({ password });
    return error?.message ?? null;
  }, []);

  const updateEmail = useCallback(async (email: string) => {
    if (!supabase) return 'SUPABASE_NOT_CONFIGURED';
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const emailVerified = Boolean(user?.email_confirmed_at ?? user?.confirmed_at);
  const needsOnboarding = Boolean(user && !profile && !profileLoading);

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      loading,
      profileLoading,
      configured: isSupabaseConfigured,
      emailVerified,
      needsOnboarding,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithApple,
      resendVerification,
      updatePassword,
      updateEmail,
      signOut,
      refreshProfile,
    }),
    [
      user,
      profile,
      session,
      loading,
      profileLoading,
      emailVerified,
      needsOnboarding,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithApple,
      resendVerification,
      updatePassword,
      updateEmail,
      signOut,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
