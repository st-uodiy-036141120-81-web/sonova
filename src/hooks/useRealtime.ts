import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeNotifications(userId: string | undefined, onNew: () => void) {
  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => onNew()
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [userId, onNew]);
}

export function useRealtimeMessages(
  userId: string | undefined,
  partnerId: string | undefined,
  onNew: () => void
) {
  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase
      .channel(`dm-${userId}-${partnerId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const row = payload.new as { sender_id: string; receiver_id: string };
          if (row.sender_id === userId || row.receiver_id === userId) onNew();
        }
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [userId, partnerId, onNew]);
}
