export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
  taste_tags?: string[];
  trust_score?: number;
  referral_code?: string | null;
  verified?: boolean;
  totp_enabled?: boolean;
  settings?: Record<string, unknown>;
  created_at: string;
  follower_count?: number;
  following_count?: number;
}

export interface Studio {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  owner?: Profile;
  live?: LiveSession | null;
}

export interface Song {
  id: string;
  studio_id: string;
  title: string;
  file_url: string;
  file_type: 'mp3' | 'mp4';
  duration_seconds: number | null;
  tags: string[];
  play_count: number;
  download_count: number;
  like_count: number;
  audio_fingerprint?: string | null;
  waveform_peaks?: number[] | null;
  original_song_id?: string | null;
  clip_start_seconds?: number;
  clip_end_seconds?: number | null;
  clip_loop_count?: number;
  clip_cover_url?: string | null;
  clip_caption?: string | null;
  clip_scheduled_at?: string | null;
  mood_tags?: string[];
  collab_studio_id?: string | null;
  reel_clips?: ReelClipVariant[];
  created_at: string;
  studio?: Studio;
  liked_by_me?: boolean;
  original?: { id: string; title: string } | null;
  status?: 'draft' | 'scheduled' | 'published';
  publish_at?: string | null;
  description?: string | null;
  lyrics?: string | null;
  is_exclusive?: boolean;
  followers_only?: boolean;
  early_access_until?: string | null;
  city_tag?: string | null;
  shoutout_username?: string | null;
  saved_by_me?: boolean;
}

export interface LiveSession {
  id: string;
  studio_id: string;
  host_id: string;
  title: string;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  host?: Profile;
  studio?: Studio;
}

export interface SongAppeal {
  id: string;
  user_id: string;
  song_id: string | null;
  comment_id: string | null;
  reason: string;
  status: string;
  created_at: string;
}

export interface SongComment {
  id: string;
  song_id: string;
  user_id: string;
  content: string;
  audio_url?: string | null;
  is_audio?: boolean;
  created_at: string;
  author?: Profile;
}

export type SongReactionType = 'fire' | 'headphones' | 'vinyl';

export interface SongReactionCounts {
  fire: number;
  headphones: number;
  vinyl: number;
  mine: SongReactionType[];
}

export interface ReelClipVariant {
  id: string;
  song_id: string;
  label: string;
  start_seconds: number;
  end_seconds: number;
  cover_url?: string | null;
  loop_count?: number;
  is_primary?: boolean;
  scheduled_at?: string | null;
  collab_studio_id?: string | null;
  created_at?: string;
}

export interface ClipRepost {
  id: string;
  user_id: string;
  source_song_id: string;
  clip_start: number;
  clip_end: number;
  caption: string;
  created_at: string;
  source?: Song;
  author?: Profile;
}

export interface HookChallenge {
  id: string;
  hashtag: string;
  title: string;
  starts_at: string;
  ends_at: string;
}

export interface ListeningRoom {
  id: string;
  host_id: string;
  song_id: string | null;
  title: string;
  is_active: boolean;
  created_at: string;
  host?: Profile;
  song?: Song;
}

export interface StudioComment {
  id: string;
  studio_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author?: Profile;
  replies?: StudioComment[];
}

export interface Playlist {
  id: string;
  studio_id: string;
  name: string;
  created_at: string;
  songs?: Song[];
  collaborators?: PlaylistCollaborator[];
}

export interface PlaylistCollaborator {
  playlist_id: string;
  user_id: string;
  role: 'owner' | 'editor';
  profile?: Profile;
}

export interface SongTransfer {
  id: string;
  song_id: string;
  from_studio_id: string;
  to_studio_id: string;
  requested_by: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  responded_at: string | null;
  song?: Song;
  from_studio?: Studio;
  to_studio?: Studio;
  requester?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Conversation {
  partner: Profile;
  lastMessage: DirectMessage;
  unread: number;
}

export interface CommentReport {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  comment?: StudioComment;
  reporter?: Profile;
}

export interface DashboardStats {
  totalPlays: number;
  totalDownloads: number;
  totalLikes: number;
  topSongs: Song[];
}

export interface PlayerTrack {
  id: string;
  title: string;
  file_url: string;
  file_type: 'mp3' | 'mp4';
  artist: string;
  startAt?: number;
}

export type NotificationType =
  | 'comment'
  | 'transfer_request'
  | 'transfer_accepted'
  | 'transfer_rejected'
  | 'follow'
  | 'like'
  | 'message'
  | 'live'
  | 'tip';

export interface SavedSong {
  user_id: string;
  song_id: string;
  created_at: string;
}

export interface SongChapter {
  id: string;
  song_id: string;
  title: string;
  start_seconds: number;
  end_seconds: number | null;
}

export interface SongCredit {
  id: string;
  song_id: string;
  role: string;
  name: string;
  profile_id: string | null;
}

export interface Album {
  id: string;
  studio_id: string;
  title: string;
  cover_url: string | null;
  created_at: string;
  songs?: { song: Song }[];
}

export interface StudioStory {
  id: string;
  studio_id: string;
  content: string;
  media_url: string | null;
  expires_at: string;
  created_at: string;
}

export interface CommentPoll {
  id: string;
  comment_id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
}

export interface FanClub {
  id: string;
  studio_id: string;
  name: string;
  max_members: number;
  members?: { count: number }[];
}

export interface VoiceMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  audio_url: string;
  duration_seconds: number | null;
  read: boolean;
  created_at: string;
}

export interface Tip {
  id: string;
  sender_id: string | null;
  receiver_id: string;
  amount_cents: number;
  currency: string;
  message: string | null;
  status: string;
  created_at: string;
}

export interface ListenCompletion {
  id: string;
  user_id: string | null;
  song_id: string;
  completion_ratio: number;
  created_at: string;
}

export interface AdvancedStats {
  avgCompletion: number;
  peakHour: number;
  hourCounts: number[];
  topFanIds: [string, number][];
  songs: { id: string; title: string; play_count: number }[];
}
