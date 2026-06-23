import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { normalizeLang } from '../lib/i18n';
import { translateNotification } from '../lib/notificationI18n';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/api';
import type { Notification } from '../lib/types';

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications(user.id).then(setItems);
  }, [user]);

  const handleRead = async (n: Notification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  const locale = normalizeLang(i18n.language) === 'ar' ? 'ar' : normalizeLang(i18n.language) === 'fr' ? 'fr' : 'en';

  return (
    <PageLayout className="mx-auto max-w-lg px-4 pb-32 pt-28 sm:pt-36">
      <div className="flex items-center justify-between">
        <h1 className="animate-fade-up flex items-center gap-2 text-2xl text-white">
          <Bell size={22} /> {t('notifications.title')}
        </h1>
        {items.some((i) => !i.read) && (
          <button type="button" onClick={markAll} className="text-xs text-blue-300 hover:text-blue-200">
            {t('notifications.markAll')}
          </button>
        )}
      </div>

      <div className="animate-fade-up delay-1 mt-6 space-y-2">
        {items.length === 0 ? (
          <p className="text-white/50">{t('notifications.empty')}</p>
        ) : (
          items.map((n) => {
            const text = translateNotification(n, t);
            return (
            <button
              key={n.id}
              type="button"
              onClick={() => handleRead(n)}
              className={`liquid-glass w-full rounded-xl p-4 text-start transition-colors hover:bg-white/10 ${
                n.read ? 'opacity-60' : 'ring-1 ring-blue-500/30'
              }`}
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <p className="text-sm text-white">{text.title}</p>
              <p className="mt-1 text-xs text-white/60">{text.body}</p>
              <p className="mt-1 text-[10px] text-white/40">{new Date(n.created_at).toLocaleString(locale)}</p>
            </button>
            );
          })
        )}
      </div>

      <Link to="/" className="mt-8 block text-center text-sm text-blue-300">{t('notifications.homeLink')}</Link>
    </PageLayout>
  );
}
