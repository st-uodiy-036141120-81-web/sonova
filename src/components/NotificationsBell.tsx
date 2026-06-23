import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchUnreadCount } from '../lib/api';
import { useRealtimeNotifications } from '../hooks/useRealtime';

export default function NotificationsBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!user) return;
    fetchUnreadCount(user.id).then(setCount).catch(() => {});
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  useRealtimeNotifications(user?.id, refresh);

  if (!user) return null;

  return (
    <Link to="/notifications" className="liquid-glass relative flex h-9 w-9 items-center justify-center rounded-xl hover:scale-105" aria-label="Notifications">
      <Bell size={16} className="text-[var(--text-primary)]" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-700 px-1 text-[10px] text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
