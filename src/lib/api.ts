import { supabase } from './supabase';
import { uploadFile } from './storage';
import type {
  Notification,
  Playlist,
  Profile,
  Song,
  SongTransfer,
  Studio,
  StudioComment,
} from './types';

function requireClient() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  return supabase;
}

export { requireClient };

/** Safe columns — excludes totp_secret, daily_upload_count, upload_count_date */
export const PROFILE_SELECT =
  'id, username, display_name, bio, avatar_url, created_at, taste_tags, trust_score, referral_code, verified, is_admin, totp_enabled, settings';

function normalizeSong(row: Record<string, unknown>): Song {
  return {
    ...row,
    tags: (row.tags as string[]) ?? [],
    play_count: (row.play_count as number) ?? 0,
    download_count: (row.download_count as number) ?? 0,
    like_count: (row.like_count as number) ?? 0,
  } as Song;
}

// ── Blocks helper ──
export async function fetchBlockedIds(userId: string): Promise<Set<string>> {
  const { data } = await requireClient()
    .from('blocks')
    .select('blocked_id, blocker_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  const ids = new Set<string>();
  for (const row of data ?? []) {
    ids.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id);
  }
  return ids;
}

function filterBlocked<T extends { id?: string; owner_id?: string; user_id?: string }>(
  items: T[],
  blocked: Set<string>,
  idKey: keyof T = 'id'
): T[] {
  if (blocked.size === 0) return items;
  return items.filter((item) => {
    const id = item[idKey] as string | undefined;
    const ownerId = item.owner_id;
    const userId = item.user_id;
    return !(id && blocked.has(id)) && !(ownerId && blocked.has(ownerId)) && !(userId && blocked.has(userId));
  });
}

import { validateUsername } from './validators';
import { createNotification, NotificationKeys } from './notificationI18n';
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await requireClient().from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await requireClient()
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url' | 'taste_tags'>>
) {
  const { data, error } = await requireClient()
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateUsername(userId: string, username: string): Promise<string | null> {
  const validation = validateUsername(username);
  if (validation) return validation;
  const trimmed = username.trim();
  const available = await isUsernameAvailable(trimmed);
  if (!available) return 'USERNAME_TAKEN';
  const { error } = await requireClient().from('profiles').update({ username: trimmed }).eq('id', userId);
  if (error) return error.message;
  return null;
}

export async function searchProfiles(query: string, viewerId?: string): Promise<Profile[]> {
  const { data, error } = await requireClient()
    .from('profiles')
    .select(PROFILE_SELECT)
    .ilike('username', `%${query}%`)
    .limit(20);
  if (error) throw error;
  let results = data ?? [];
  if (viewerId) {
    const blocked = await fetchBlockedIds(viewerId);
    results = filterBlocked(results, blocked);
  }
  return results;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data } = await requireClient()
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  return !data;
}

export async function fetchFollowCounts(userId: string) {
  const client = requireClient();
  const [followers, following] = await Promise.all([
    client.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    client.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

// ── Studios ──
export async function fetchStudioByOwner(ownerId: string): Promise<Studio | null> {
  const { data, error } = await requireClient()
    .from('studios')
    .select('*, owner:profiles(*)')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchStudioByUsername(username: string): Promise<Studio | null> {
  const profile = await fetchProfileByUsername(username);
  if (!profile) return null;
  return fetchStudioByOwner(profile.id);
}

export async function updateStudio(
  studioId: string,
  updates: Partial<Pick<Studio, 'name' | 'description'>>
) {
  const { data, error } = await requireClient()
    .from('studios')
    .update(updates)
    .eq('id', studioId)
    .select('*, owner:profiles(*)')
    .single();
  if (error) throw error;
  return data as Studio;
}

// ── Songs ──
export async function fetchStudioSongs(studioId: string, viewerId?: string, ownerId?: string): Promise<Song[]> {
  const { data, error } = await requireClient()
    .from('songs')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  let songs = (data ?? []).map(normalizeSong);
  const isOwner = Boolean(viewerId && ownerId && viewerId === ownerId);

  if (!isOwner) {
    const { canAccessSong } = await import('./platformApi');
    let isFollower = false;
    if (viewerId && ownerId) {
      isFollower = await isFollowing(viewerId, ownerId);
    }
    const studioStub = { owner_id: ownerId ?? '' } as Studio;
    songs = (
      await Promise.all(
        songs.map(async (s) => {
          const ok = await canAccessSong({ ...s, studio: studioStub }, viewerId, isFollower);
          return ok ? s : null;
        })
      )
    ).filter((s): s is Song => s !== null);
  }

  if (viewerId) {
    const liked = await fetchUserLikes(viewerId, songs.map((s) => s.id));
    songs = songs.map((s) => ({ ...s, liked_by_me: liked.has(s.id) }));
  }
  return songs;
}

export async function searchSongs(query: string, tag?: string, viewerId?: string): Promise<Song[]> {
  let q = requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .limit(30);
  if (query.trim()) q = q.ilike('title', `%${query.trim()}%`);
  if (tag) q = q.contains('tags', [tag]);
  const { data, error } = await q;
  if (error) throw error;
  let songs = (data ?? []).map(normalizeSong);
  if (viewerId) {
    const blocked = await fetchBlockedIds(viewerId);
    songs = songs.filter((s) => !blocked.has(s.studio?.owner_id ?? ''));
    const liked = await fetchUserLikes(viewerId, songs.map((s) => s.id));
    songs = songs.map((s) => ({ ...s, liked_by_me: liked.has(s.id) }));
  }
  return songs;
}

export async function fetchRecentSongs(limit = 12, viewerId?: string): Promise<Song[]> {
  const { data, error } = await requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  let songs = (data ?? []).map(normalizeSong);
  if (viewerId) {
    const blocked = await fetchBlockedIds(viewerId);
    songs = songs.filter((s) => !blocked.has(s.studio?.owner_id ?? ''));
  }
  return songs;
}

export async function fetchFollowingFeed(userId: string, limit = 20): Promise<Song[]> {
  const { data: follows } = await requireClient()
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  const followingIds = (follows ?? []).map((f) => f.following_id);
  if (followingIds.length === 0) return [];

  const { data: studios } = await requireClient()
    .from('studios')
    .select('id')
    .in('owner_id', followingIds);
  const studioIds = (studios ?? []).map((s) => s.id);
  if (studioIds.length === 0) return [];

  const { data, error } = await requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .in('studio_id', studioIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(normalizeSong);
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;
  return uploadFile('avatars', path, file);
}

export async function uploadSong(
  studioId: string,
  file: File,
  title: string,
  fileType: 'mp3' | 'mp4',
  tags: string[] = [],
  audioFingerprint?: string,
  extras?: {
    waveformPeaks?: number[];
    originalSongId?: string;
    clipStart?: number;
    clipEnd?: number;
    durationSeconds?: number;
    clipLoopCount?: number;
    clipCoverUrl?: string | null;
    clipCaption?: string | null;
    clipScheduledAt?: string | null;
    moodTags?: string[];
    collabStudioId?: string | null;
    status?: 'draft' | 'scheduled' | 'published';
    publishAt?: string;
    description?: string;
    lyrics?: string;
    cityTag?: string;
    shoutoutUsername?: string;
    followersOnly?: boolean;
    earlyAccessHours?: number;
    isExclusive?: boolean;
  }
) {
  const path = `${studioId}/${Date.now()}-${file.name}`;
  const fileUrl = await uploadFile('songs', path, file);

  const earlyUntil = extras?.earlyAccessHours
    ? new Date(Date.now() + extras.earlyAccessHours * 3600_000).toISOString()
    : null;

  const { data, error } = await requireClient()
    .from('songs')
    .insert({
      studio_id: studioId,
      title,
      file_url: fileUrl,
      file_type: fileType,
      tags,
      audio_fingerprint: audioFingerprint ?? null,
      waveform_peaks: extras?.waveformPeaks ?? null,
      original_song_id: extras?.originalSongId ?? null,
      clip_start_seconds: extras?.clipEnd != null ? (extras.clipStart ?? 0) : 0,
      clip_end_seconds: extras?.clipEnd ?? null,
      clip_loop_count: extras?.clipLoopCount ?? 0,
      clip_cover_url: extras?.clipCoverUrl ?? null,
      clip_caption: extras?.clipCaption ?? null,
      clip_scheduled_at: extras?.clipScheduledAt ?? null,
      mood_tags: extras?.moodTags ?? [],
      collab_studio_id: extras?.collabStudioId ?? null,
      duration_seconds: extras?.durationSeconds ?? null,
      status: extras?.status ?? 'published',
      publish_at: extras?.publishAt ?? null,
      description: extras?.description ?? null,
      lyrics: extras?.lyrics ?? null,
      city_tag: extras?.cityTag ?? null,
      shoutout_username: extras?.shoutoutUsername ?? null,
      followers_only: extras?.followersOnly ?? false,
      early_access_until: earlyUntil,
      is_exclusive: extras?.isExclusive ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return normalizeSong(data);
}

export async function deleteSong(songId: string) {
  const { error } = await requireClient().from('songs').delete().eq('id', songId);
  if (error) throw error;
}

export async function updateSongReelClip(
  songId: string,
  clipStart: number | null,
  clipEnd: number | null
) {
  const { error } = await requireClient()
    .from('songs')
    .update({
      clip_start_seconds: clipStart ?? 0,
      clip_end_seconds: clipEnd,
    })
    .eq('id', songId);
  if (error) throw error;
}

export async function incrementPlayCount(songId: string) {
  await requireClient().rpc('increment_song_play_count', { p_song_id: songId });
}

export async function incrementDownloadCount(songId: string) {
  await requireClient().rpc('increment_song_download_count', { p_song_id: songId });
}

async function fetchUserLikes(userId: string, songIds: string[]): Promise<Set<string>> {
  if (songIds.length === 0) return new Set();
  const { data } = await requireClient()
    .from('song_likes')
    .select('song_id')
    .eq('user_id', userId)
    .in('song_id', songIds);
  return new Set((data ?? []).map((r) => r.song_id));
}

export async function toggleSongLike(userId: string, song: Song): Promise<boolean> {
  const client = requireClient();
  if (song.liked_by_me) {
    await client.from('song_likes').delete().eq('user_id', userId).eq('song_id', song.id);
    return false;
  }
  await client.from('song_likes').insert({ user_id: userId, song_id: song.id });
  const studio = await requireClient().from('studios').select('owner_id').eq('id', song.studio_id).single();
  if (studio.data && studio.data.owner_id !== userId) {
    await createNotification(
      studio.data.owner_id,
      'like',
      NotificationKeys.like.title,
      NotificationKeys.like.body,
      { songTitle: song.title },
      `/studio/${(await fetchProfile(userId))?.username}`
    );
  }
  return true;
}

// ── Transfers ──
export async function requestSongTransfer(
  songId: string,
  fromStudioId: string,
  toStudioId: string,
  requesterId: string,
  songTitle: string,
  _targetUsername: string
) {
  const client = requireClient();
  const { data: song } = await client.from('songs').select('studio_id').eq('id', songId).single();
  if (!song || song.studio_id !== fromStudioId) {
    throw new Error('SONG_NOT_OWNED');
  }
  const { data: studio } = await client.from('studios').select('owner_id').eq('id', fromStudioId).single();
  if (!studio || studio.owner_id !== requesterId) {
    throw new Error('NOT_STUDIO_OWNER');
  }
  if (fromStudioId === toStudioId) {
    throw new Error('SAME_STUDIO');
  }

  const { data, error } = await client
    .from('song_transfers')
    .insert({
      song_id: songId,
      from_studio_id: fromStudioId,
      to_studio_id: toStudioId,
      requested_by: requesterId,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;

  const targetStudio = await requireClient().from('studios').select('owner_id').eq('id', toStudioId).single();
  if (targetStudio.data) {
    await createNotification(
      targetStudio.data.owner_id,
      'transfer_request',
      NotificationKeys.transferRequest.title,
      NotificationKeys.transferRequest.body,
      { songTitle },
      '/notifications'
    );
  }
  return data as SongTransfer;
}

export async function fetchPendingTransfers(studioId: string): Promise<SongTransfer[]> {
  const { data, error } = await requireClient()
    .from('song_transfers')
    .select('*, song:songs(*), requester:profiles!song_transfers_requested_by_fkey(*)')
    .eq('to_studio_id', studioId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SongTransfer[];
}

export async function respondTransfer(transferId: string, accept: boolean, requesterId: string, songTitle: string) {
  const client = requireClient();
  const { data: transfer, error } = await client
    .from('song_transfers')
    .select('*')
    .eq('id', transferId)
    .single();
  if (error || !transfer) throw error ?? new Error('Not found');

  if (accept) {
    await client.from('songs').update({ studio_id: transfer.to_studio_id }).eq('id', transfer.song_id);
  }
  await client
    .from('song_transfers')
    .update({ status: accept ? 'accepted' : 'rejected', responded_at: new Date().toISOString() })
    .eq('id', transferId);

  const transferKeys = accept ? NotificationKeys.transferAccepted : NotificationKeys.transferRejected;
  await createNotification(
    requesterId,
    accept ? 'transfer_accepted' : 'transfer_rejected',
    transferKeys.title,
    transferKeys.body,
    { songTitle },
    '/notifications'
  );
}

// ── Comments ──
export async function fetchStudioComments(studioId: string, viewerId?: string): Promise<StudioComment[]> {
  const { data, error } = await requireClient()
    .from('studio_comments')
    .select('*, author:profiles(*)')
    .eq('studio_id', studioId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;

  let comments = (data ?? []) as StudioComment[];
  if (viewerId) {
    const blocked = await fetchBlockedIds(viewerId);
    comments = comments.filter((c) => !blocked.has(c.user_id));
  }
  const roots = comments.filter((c) => !c.parent_id);
  const byParent = new Map<string, StudioComment[]>();
  for (const c of comments) {
    if (c.parent_id) {
      const list = byParent.get(c.parent_id) ?? [];
      list.push(c);
      byParent.set(c.parent_id, list);
    }
  }
  return roots.map((r) => ({ ...r, replies: byParent.get(r.id) ?? [] }));
}

export async function addComment(
  studioId: string,
  userId: string,
  content: string,
  studioOwnerId: string,
  parentId?: string
) {
  const { data, error } = await requireClient()
    .from('studio_comments')
    .insert({ studio_id: studioId, user_id: userId, content, parent_id: parentId ?? null })
    .select('*, author:profiles(*)')
    .single();
  if (error) throw error;

  if (studioOwnerId !== userId) {
    const author = await fetchProfile(userId);
    await createNotification(
      studioOwnerId,
      'comment',
      NotificationKeys.studioComment.title,
      NotificationKeys.studioComment.body,
      { username: author?.username ?? '?' },
      `/studio/${author?.username}`
    );
  }
  return data as StudioComment;
}

export async function deleteComment(commentId: string) {
  const { error } = await requireClient().from('studio_comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function togglePinComment(commentId: string, pinned: boolean) {
  const { data, error } = await requireClient()
    .from('studio_comments')
    .update({ is_pinned: pinned })
    .eq('id', commentId)
    .select()
    .single();
  if (error) throw error;
  return data as StudioComment;
}

export async function reportComment(commentId: string, reporterId: string, reason: string) {
  const { error } = await requireClient()
    .from('comment_reports')
    .insert({ comment_id: commentId, reporter_id: reporterId, reason });
  if (error) throw error;
}

// ── Follow / Block ──
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await requireClient()
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  return !!data;
}

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const { data } = await requireClient()
    .from('blocks')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();
  return !!data;
}

export async function followUser(followerId: string, followingId: string, followerUsername: string) {
  const { error } = await requireClient()
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });
  if (error) throw error;
  await createNotification(
    followingId,
    'follow',
    NotificationKeys.follow.title,
    NotificationKeys.follow.body,
    { username: followerUsername },
    `/studio/${followerUsername}`
  );
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await requireClient()
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
}

export async function blockUser(blockerId: string, blockedId: string) {
  await unfollowUser(blockerId, blockedId).catch(() => {});
  await unfollowUser(blockedId, blockerId).catch(() => {});
  const { error } = await requireClient()
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await requireClient()
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function fetchBlockedUsers(blockerId: string): Promise<Profile[]> {
  const { data, error } = await requireClient()
    .from('blocks')
    .select('blocked:profiles!blocks_blocked_id_fkey(*)')
    .eq('blocker_id', blockerId);
  if (error) throw error;
  return (data ?? [])
    .map((r) => (r as unknown as { blocked: Profile }).blocked)
    .filter(Boolean);
}

// ── Playlists ──
export async function fetchPlaylists(studioId: string): Promise<Playlist[]> {
  const { data, error } = await requireClient()
    .from('playlists')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPlaylistWithSongs(playlistId: string): Promise<Playlist | null> {
  const { data: playlist, error } = await requireClient()
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .maybeSingle();
  if (error || !playlist) return null;

  const { data: links } = await requireClient()
    .from('playlist_songs')
    .select('position, song:songs(*)')
    .eq('playlist_id', playlistId)
    .order('position');

  const songs = (links ?? [])
    .map((l) => {
      const row = l as unknown as { song: Record<string, unknown> | null };
      return row.song ? normalizeSong(row.song) : null;
    })
    .filter((s): s is Song => s !== null);

  return { ...playlist, songs };
}

export async function createPlaylist(studioId: string, name: string) {
  const { data, error } = await requireClient()
    .from('playlists')
    .insert({ studio_id: studioId, name })
    .select()
    .single();
  if (error) throw error;
  return data as Playlist;
}

export async function addSongToPlaylist(playlistId: string, songId: string, position: number) {
  const { error } = await requireClient()
    .from('playlist_songs')
    .insert({ playlist_id: playlistId, song_id: songId, position });
  if (error) throw error;
}

export async function deletePlaylist(playlistId: string) {
  const { error } = await requireClient().from('playlists').delete().eq('id', playlistId);
  if (error) throw error;
}

// ── Notifications ──
export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await requireClient()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await requireClient()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string) {
  await requireClient().from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllNotificationsRead(userId: string) {
  await requireClient().from('notifications').update({ read: true }).eq('user_id', userId);
}

export const POPULAR_TAGS = ['ambient', 'drone', 'roots', 'nature', 'calm', 'electronic', 'acoustic'];

// ── Song comments (Reels) ──
export async function fetchSongComments(songId: string) {
  const { data, error } = await requireClient()
    .from('song_comments')
    .select('*, author:profiles(*)')
    .eq('song_id', songId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function addSongComment(songId: string, userId: string, content: string, ownerId?: string) {
  const { data, error } = await requireClient()
    .from('song_comments')
    .insert({ song_id: songId, user_id: userId, content })
    .select('*, author:profiles(*)')
    .single();
  if (error) throw error;

  if (ownerId && ownerId !== userId) {
    const author = await fetchProfile(userId);
    await createNotification(
      ownerId,
      'comment',
      NotificationKeys.songComment.title,
      NotificationKeys.songComment.body,
      { username: author?.username ?? '?', preview: content.slice(0, 60) },
      `/reels?song=${songId}`
    );
  }
  return data;
}

export async function deleteSongComment(commentId: string) {
  const { error } = await requireClient().from('song_comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function fetchReelsSongs(limit = 40, viewerId?: string): Promise<Song[]> {
  const { data, error } = await requireClient()
    .from('songs')
    .select('*, studio:studios(*, owner:profiles(*))')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  let songs = (data ?? []).map(normalizeSong);
  if (viewerId) {
    const blocked = await fetchBlockedIds(viewerId);
    songs = songs.filter((s) => !blocked.has(s.studio?.owner_id ?? ''));
    const liked = await fetchUserLikes(viewerId, songs.map((s) => s.id));
    songs = songs.map((s) => ({ ...s, liked_by_me: liked.has(s.id) }));
  }
  return songs;
}

/** جلب الأغاني المعجَب بها لبناء ملف الذوق */
export async function fetchUserLikedSongs(userId: string): Promise<Song[]> {
  const { data, error } = await requireClient()
    .from('song_likes')
    .select('song:songs(*, studio:studios(*, owner:profiles(*)))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const r = row as unknown as { song: Record<string, unknown> | null };
      return r.song ? normalizeSong(r.song) : null;
    })
    .filter((s): s is Song => s !== null);
}

/** جلب قائمة الفنانين المتابَعين */
export async function fetchFollowingOwnerIds(userId: string): Promise<string[]> {
  const { data, error } = await requireClient()
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  if (error) throw error;
  return (data ?? []).map((f) => f.following_id);
}

export async function fetchSongCommentCount(songId: string): Promise<number> {
  const { count } = await requireClient()
    .from('song_comments')
    .select('id', { count: 'exact', head: true })
    .eq('song_id', songId);
  return count ?? 0;
}
