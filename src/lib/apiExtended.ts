import { supabase } from './supabase';
import type {
  CommentReport,
  Conversation,
  DashboardStats,
  DirectMessage,
  Profile,
  Song,
} from './types';
import { requireClient, isFollowing } from './api';
import { createNotification, NotificationKeys } from './notificationI18n';
import { fetchUserSettings } from './userSettingsApi';

export async function checkDuplicateFingerprint(fingerprint: string): Promise<Song | null> {
  const { data } = await requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .eq('audio_fingerprint', fingerprint)
    .maybeSingle();
  if (data) return data as Song;

  // Partial match: first 16 chars prefix
  const prefix = fingerprint.slice(0, 16);
  if (prefix.length >= 8) {
    const { data: partial } = await requireClient()
      .from('songs')
      .select('*, studio:studios(*, owner:profiles(*))')
      .like('audio_fingerprint', `${prefix}%`)
      .limit(1)
      .maybeSingle();
    if (partial) return partial as Song;
  }
  return null;
}

export async function createOAuthProfile(
  userId: string,
  username: string,
  displayName: string
): Promise<Profile> {
  const client = requireClient();
  const { data: profile, error } = await client
    .from('profiles')
    .insert({ id: userId, username, display_name: displayName })
    .select()
    .single();
  if (error) throw error;
  await client.from('studios').insert({
    owner_id: userId,
    name: `${displayName}'s Studio`,
    description: '',
  });
  return profile as Profile;
}

export async function sendMessage(senderId: string, receiverId: string, content: string) {
  const receiverSettings = await fetchUserSettings(receiverId);
  if (receiverSettings.status === 'no-dms') {
    throw new Error('DM_DISABLED');
  }
  if (receiverSettings.dmPolicy === 'none') {
    throw new Error('DM_DISABLED');
  }
  if (receiverSettings.dmPolicy === 'following') {
    const allowed = await isFollowing(receiverId, senderId);
    if (!allowed) throw new Error('DM_FOLLOWERS_ONLY');
  }

  const { data, error } = await requireClient()
    .from('direct_messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, content })
    .select('*, sender:profiles!direct_messages_sender_id_fkey(*), receiver:profiles!direct_messages_receiver_id_fkey(*)')
    .single();
  if (error) throw error;

  await createNotification(
    receiverId,
    'message',
    NotificationKeys.message.title,
    NotificationKeys.message.body,
    { preview: content.slice(0, 80) },
    `/messages?user=${senderId}`
  );

  return data as DirectMessage;
}

export async function fetchConversation(userId: string, partnerId: string): Promise<DirectMessage[]> {
  const { data, error } = await requireClient()
    .from('direct_messages')
    .select('*, sender:profiles!direct_messages_sender_id_fkey(*), receiver:profiles!direct_messages_receiver_id_fkey(*)')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
    )
    .order('created_at', { ascending: true });
  if (error) throw error;

  await requireClient()
    .from('direct_messages')
    .update({ read: true })
    .eq('sender_id', partnerId)
    .eq('receiver_id', userId)
    .eq('read', false);

  return (data ?? []) as DirectMessage[];
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await requireClient()
    .from('direct_messages')
    .select('*, sender:profiles!direct_messages_sender_id_fkey(*), receiver:profiles!direct_messages_receiver_id_fkey(*)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  const msgs = (data ?? []) as DirectMessage[];
  const map = new Map<string, Conversation>();

  for (const m of msgs) {
    const partnerId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    const partner = m.sender_id === userId ? m.receiver! : m.sender!;
    if (!map.has(partnerId)) {
      const unread = msgs.filter(
        (x) => x.sender_id === partnerId && x.receiver_id === userId && !x.read
      ).length;
      map.set(partnerId, { partner, lastMessage: m, unread });
    }
  }
  return Array.from(map.values());
}

export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  const { data: studio } = await requireClient()
    .from('studios')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();
  if (!studio) return { totalPlays: 0, totalDownloads: 0, totalLikes: 0, topSongs: [] };

  const { data: songs } = await requireClient()
    .from('songs')
    .select('*')
    .eq('studio_id', studio.id);

  const list = (songs ?? []) as Song[];
  return {
    totalPlays: list.reduce((s, x) => s + (x.play_count ?? 0), 0),
    totalDownloads: list.reduce((s, x) => s + (x.download_count ?? 0), 0),
    totalLikes: list.reduce((s, x) => s + (x.like_count ?? 0), 0),
    topSongs: [...list].sort((a, b) => b.play_count - a.play_count).slice(0, 5),
  };
}

export async function fetchPendingReports(): Promise<CommentReport[]> {
  const { data, error } = await requireClient()
    .from('comment_reports')
    .select('*, comment:studio_comments(*, author:profiles(*)), reporter:profiles!comment_reports_reporter_id_fkey(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CommentReport[];
}

export async function resolveReport(
  reportId: string,
  adminId: string,
  action: 'resolved' | 'dismissed',
  deleteComment?: boolean,
  commentId?: string
) {
  const client = requireClient();
  await client
    .from('comment_reports')
    .update({ status: action, resolved_by: adminId, resolved_at: new Date().toISOString() })
    .eq('id', reportId);
  if (deleteComment && commentId) {
    await client.from('studio_comments').delete().eq('id', commentId);
  }
}

export async function addPlaylistCollaborator(playlistId: string, userId: string) {
  const { error } = await requireClient()
    .from('playlist_collaborators')
    .insert({ playlist_id: playlistId, user_id: userId, role: 'editor' });
  if (error) throw error;
}

export async function fetchPlaylistCollaborators(playlistId: string) {
  const { data, error } = await requireClient()
    .from('playlist_collaborators')
    .select('*, profile:profiles(*)')
    .eq('playlist_id', playlistId);
  if (error) throw error;
  return data ?? [];
}

export async function resendVerificationEmail(email: string) {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}
