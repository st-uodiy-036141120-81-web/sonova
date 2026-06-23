import type { NotificationType } from './types';

export type DmPolicy = 'everyone' | 'following' | 'none';
export type StudioVisibility = 'public' | 'followers' | 'private';
export type ShoutoutPolicy = 'allow' | 'approval' | 'deny';
export type AudioQuality = 'high' | 'medium' | 'data-saver';
export type UserStatus = 'available' | 'busy' | 'no-dms';
export type HomeLayout = 'reels' | 'feed' | 'discover';
export type FontScale = 'sm' | 'md' | 'lg';
export type TransferAutoAccept = 'none' | 'trusted';

export interface UserSettings {
  dmPolicy: DmPolicy;
  studioVisibility: StudioVisibility;
  hideListeningActivity: boolean;
  hideFollowLists: boolean;
  voiceDmEnabled: boolean;
  shoutoutPolicy: ShoutoutPolicy;

  notifyLike: boolean;
  notifyComment: boolean;
  notifyFollow: boolean;
  notifyMessage: boolean;
  notifyTransfer: boolean;
  notifyLive: boolean;
  notifyEmailDigest: boolean;
  notifyInApp: boolean;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  liveAlertsOnlyFollowing: boolean;

  defaultSpeed: number;
  audioQuality: AudioQuality;
  reelsAutoplay: boolean;
  reelsMuted: boolean;
  crossfadeSeconds: number;
  loudnessNormalize: boolean;
  defaultSleepMinutes: number;
  feedAutoplay: boolean;

  explorationLevel: number;
  hideRemixes: boolean;
  hideLongSongs: boolean;
  hideFollowersOnly: boolean;

  defaultUploadDraft: boolean;
  defaultTags: string[];
  defaultCity: string;
  allowDownloads: boolean;
  allowEmbed: boolean;
  autoAcceptTransfers: TransferAutoAccept;
  timezone: string;
  liveNotifyFollowers: boolean;
  liveRecordSession: boolean;
  liveCommentsEnabled: boolean;

  status: UserStatus;
  autoReplyEnabled: boolean;
  autoReplyMessage: string;
  tipsEnabled: boolean;
  tipsMinAmount: number;
  tipsThankYou: string;

  fontScale: FontScale;
  reduceMotion: boolean;
  highContrast: boolean;
  homeLayout: HomeLayout;
  keyboardShortcuts: boolean;

  cacheLimitMb: number;
  wifiOnlyDownload: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  dmPolicy: 'everyone',
  studioVisibility: 'public',
  hideListeningActivity: false,
  hideFollowLists: false,
  voiceDmEnabled: true,
  shoutoutPolicy: 'allow',

  notifyLike: true,
  notifyComment: true,
  notifyFollow: true,
  notifyMessage: true,
  notifyTransfer: true,
  notifyLive: true,
  notifyEmailDigest: false,
  notifyInApp: true,
  dndEnabled: false,
  dndStart: '23:00',
  dndEnd: '08:00',
  liveAlertsOnlyFollowing: true,

  defaultSpeed: 1,
  audioQuality: 'high',
  reelsAutoplay: true,
  reelsMuted: false,
  crossfadeSeconds: 0,
  loudnessNormalize: true,
  defaultSleepMinutes: 0,
  feedAutoplay: false,

  explorationLevel: 15,
  hideRemixes: false,
  hideLongSongs: false,
  hideFollowersOnly: false,

  defaultUploadDraft: false,
  defaultTags: [],
  defaultCity: '',
  allowDownloads: true,
  allowEmbed: true,
  autoAcceptTransfers: 'none',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  liveNotifyFollowers: true,
  liveRecordSession: false,
  liveCommentsEnabled: true,

  status: 'available',
  autoReplyEnabled: false,
  autoReplyMessage: '',
  tipsEnabled: true,
  tipsMinAmount: 1,
  tipsThankYou: '',

  fontScale: 'md',
  reduceMotion: false,
  highContrast: false,
  homeLayout: 'discover',
  keyboardShortcuts: true,

  cacheLimitMb: 500,
  wifiOnlyDownload: false,
};

const LOCAL_KEY = 'sonova-user-settings';

export function mergeUserSettings(raw: Partial<UserSettings> | null | undefined): UserSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_USER_SETTINGS };
  return { ...DEFAULT_USER_SETTINGS, ...raw };
}

export function loadLocalUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { ...DEFAULT_USER_SETTINGS };
    return mergeUserSettings(JSON.parse(raw) as Partial<UserSettings>);
  } catch {
    return { ...DEFAULT_USER_SETTINGS };
  }
}

export function saveLocalUserSettings(settings: UserSettings) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
}

export function applyUserSettingsToDocument(settings: UserSettings) {
  const root = document.documentElement;
  root.dataset.fontScale = settings.fontScale;
  root.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false';
  root.dataset.highContrast = settings.highContrast ? 'true' : 'false';
}

function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function isInDndWindow(settings: UserSettings, now = new Date()): boolean {
  if (!settings.dndEnabled) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(settings.dndStart);
  const end = parseTimeToMinutes(settings.dndEnd);
  if (start <= end) return current >= start && current < end;
  return current >= start || current < end;
}

const NOTIFY_MAP: Record<string, keyof UserSettings> = {
  like: 'notifyLike',
  comment: 'notifyComment',
  follow: 'notifyFollow',
  message: 'notifyMessage',
  transfer_request: 'notifyTransfer',
  transfer_accepted: 'notifyTransfer',
  transfer_rejected: 'notifyTransfer',
  live: 'notifyLive',
  tip: 'notifyLike',
};

export function shouldNotify(settings: UserSettings, type: NotificationType | string): boolean {
  if (!settings.notifyInApp) return false;
  if (isInDndWindow(settings)) return false;
  const key = NOTIFY_MAP[type];
  if (!key) return true;
  return Boolean(settings[key as keyof UserSettings]);
}

export function filterSongsForReels<T extends { original_song_id?: string | null; duration_seconds?: number | null; followers_only?: boolean }>(
  songs: T[],
  settings: UserSettings
): T[] {
  return songs.filter((song) => {
    if (settings.hideRemixes && song.original_song_id) return false;
    if (settings.hideLongSongs && (song.duration_seconds ?? 0) > 10800) return false;
    if (settings.hideFollowersOnly && song.followers_only) return false;
    return true;
  });
}

export function patchUserSettings(current: UserSettings, patch: Partial<UserSettings>): UserSettings {
  const next = { ...current, ...patch };
  saveLocalUserSettings(next);
  applyUserSettingsToDocument(next);
  return next;
}
