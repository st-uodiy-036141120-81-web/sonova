import i18n from './i18n';

/** اسم المستخدم: حروف/أرقام إنجليزية فقط، 7 أحرف كحد أقصى */
const USERNAME_RE = /^[a-zA-Z0-9]{1,7}$/;
export const USERNAME_MAX_LENGTH = 7;
export const MAX_SONG_DURATION_SECONDS = 3 * 60 * 60;

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (trimmed.length === 0) return i18n.t('validation.usernameRequired');
  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return i18n.t('validation.usernameMax', { count: trimmed.length });
  }
  if (!USERNAME_RE.test(trimmed)) return i18n.t('validation.usernameFormat');
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (password !== confirm) return i18n.t('validation.passwordMismatch');
  if (password.length < 6) return i18n.t('validation.passwordShort');
  return null;
}

export function isValidAudioFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'mp3' || ext === 'mp4' || file.type.startsWith('audio/') || file.type.startsWith('video/');
}

export function getFileType(file: File): 'mp3' | 'mp4' | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'mp3' || file.type.includes('audio')) return 'mp3';
  if (ext === 'mp4' || file.type.includes('video')) return 'mp4';
  return null;
}

export function getMediaDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.includes('video') || file.name.toLowerCase().endsWith('.mp4');
    const media = document.createElement(isVideo ? 'video' : 'audio');
    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (!isFinite(media.duration)) reject(new Error('DURATION_UNKNOWN'));
      else resolve(media.duration);
    };
    media.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('DURATION_UNKNOWN'));
    };
    media.src = url;
  });
}

export function validateSongDuration(seconds: number): string | null {
  if (seconds > MAX_SONG_DURATION_SECONDS) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return i18n.t('validation.durationMax', { hours, mins });
  }
  return null;
}
