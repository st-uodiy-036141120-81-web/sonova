import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  applyUserSettingsToDocument,
  loadLocalUserSettings,
  patchUserSettings,
  saveLocalUserSettings,
  type UserSettings,
} from '../lib/userSettings';
import { fetchUserSettings, saveUserSettings as persistUserSettings } from '../lib/userSettingsApi';
import { setPlaybackSpeed } from '../lib/localFeatures';

interface UserSettingsContextValue {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(() => loadLocalUserSettings());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyUserSettingsToDocument(settings);
    setPlaybackSpeed(settings.defaultSpeed);
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (user) {
          const remote = await fetchUserSettings(user.id);
          if (!cancelled) {
            setSettings(remote);
            saveLocalUserSettings(remote);
          }
        } else if (!cancelled) {
          setSettings(loadLocalUserSettings());
        }
      } catch {
        if (!cancelled) setSettings(loadLocalUserSettings());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      setSettings((prev) => {
        const next = patchUserSettings(prev, patch);
        if (user) {
          void persistUserSettings(user.id, next)
            .then((saved) => {
              setSettings(saved);
              saveLocalUserSettings(saved);
            })
            .catch(() => {});
        }
        return next;
      });
    },
    [user]
  );

  const resetSettings = useCallback(async () => {
    const { DEFAULT_USER_SETTINGS: defaults } = await import('../lib/userSettings');
    setSettings(defaults);
    saveLocalUserSettings(defaults);
    applyUserSettingsToDocument(defaults);
    if (user) await persistUserSettings(user.id, defaults);
  }, [user]);

  const value = useMemo(
    () => ({ settings, loading, updateSettings, resetSettings }),
    [settings, loading, updateSettings, resetSettings]
  );

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) throw new Error('useUserSettings must be used within UserSettingsProvider');
  return ctx;
}
