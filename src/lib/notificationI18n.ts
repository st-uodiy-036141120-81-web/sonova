import type { TFunction } from 'i18next';
import type { Notification, NotificationType } from './types';
import { supabase } from './supabase';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export const NotificationKeys = {
  like: {
    title: 'notifications.events.like.title',
    body: 'notifications.events.like.body',
  },
  transferRequest: {
    title: 'notifications.events.transferRequest.title',
    body: 'notifications.events.transferRequest.body',
  },
  transferAccepted: {
    title: 'notifications.events.transferAccepted.title',
    body: 'notifications.events.transferAccepted.body',
  },
  transferRejected: {
    title: 'notifications.events.transferRejected.title',
    body: 'notifications.events.transferRejected.body',
  },
  studioComment: {
    title: 'notifications.events.studioComment.title',
    body: 'notifications.events.studioComment.body',
  },
  songComment: {
    title: 'notifications.events.songComment.title',
    body: 'notifications.events.songComment.body',
  },
  follow: {
    title: 'notifications.events.follow.title',
    body: 'notifications.events.follow.body',
  },
  message: {
    title: 'notifications.events.message.title',
    body: 'notifications.events.message.body',
  },
} as const;

interface StoredNotificationBody {
  bodyKey: string;
  params?: Record<string, string | number>;
}

function encodeBody(bodyKey: string, params: Record<string, string | number>): string {
  return JSON.stringify({ bodyKey, params } satisfies StoredNotificationBody);
}

export async function createNotification(
  userId: string,
  type: NotificationType | string,
  titleKey: string,
  bodyKey: string,
  params: Record<string, string | number> = {},
  link?: string
) {
  const { fetchUserSettings } = await import('./userSettingsApi');
  const { shouldNotify } = await import('./userSettings');
  const settings = await fetchUserSettings(userId);
  if (!shouldNotify(settings, type)) return;

  await requireClient().rpc('notify_user', {
    p_user_id: userId,
    p_type: type,
    p_title: titleKey,
    p_body: encodeBody(bodyKey, params),
    p_link: link ?? null,
  });
}

export function translateNotification(
  notification: Notification,
  t: TFunction
): { title: string; body: string } {
  if (!notification.title.startsWith('notifications.')) {
    return { title: notification.title, body: notification.body };
  }

  let payload: StoredNotificationBody | null = null;
  try {
    payload = JSON.parse(notification.body) as StoredNotificationBody;
  } catch {
    return { title: t(notification.title), body: notification.body };
  }

  const params = payload.params ?? {};
  const bodyKey = payload.bodyKey ?? notification.title.replace(/\.title$/, '.body');

  return {
    title: t(notification.title, params),
    body: t(bodyKey, params),
  };
}
