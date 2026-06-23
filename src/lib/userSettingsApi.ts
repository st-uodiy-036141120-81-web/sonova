import { requireClient, PROFILE_SELECT } from './api';
import {
  mergeUserSettings,
  type UserSettings,
} from './userSettings';

export async function fetchUserSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await requireClient()
    .from('profiles')
    .select('settings')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return mergeUserSettings((data?.settings as Partial<UserSettings>) ?? null);
}

export async function saveUserSettings(userId: string, settings: UserSettings): Promise<UserSettings> {
  const { data, error } = await requireClient()
    .from('profiles')
    .update({ settings })
    .eq('id', userId)
    .select('settings')
    .single();
  if (error) throw error;
  return mergeUserSettings(data.settings as Partial<UserSettings>);
}

export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const client = requireClient();
  const profileRes = await client.from('profiles').select(PROFILE_SELECT).eq('id', userId).single();
  const studioRes = await client.from('studios').select('*').eq('owner_id', userId).maybeSingle();
  let songs: unknown[] = [];
  if (studioRes.data?.id) {
    const songsRes = await client.from('songs').select('*').eq('studio_id', studioRes.data.id);
    songs = songsRes.data ?? [];
  }
  const [notifications, messages] = await Promise.all([
    client.from('notifications').select('*').eq('user_id', userId).limit(500),
    client
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .limit(500),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: profileRes.data,
    studio: studioRes.data,
    songs,
    notifications: notifications.data ?? [],
    messages: messages.data ?? [],
    settings: mergeUserSettings((profileRes.data?.settings as Partial<UserSettings>) ?? null),
  };
}

export async function deleteOwnAccount(): Promise<void> {
  const { error } = await requireClient().rpc('delete_own_account');
  if (error) throw error;
}

export function downloadJsonExport(data: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type { UserSettings };
