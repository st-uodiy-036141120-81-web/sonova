const OFFLINE_KEY = 'sonova_offline_clips';

export interface OfflineClipEntry {
  songId: string;
  title: string;
  fileUrl: string;
  clipStart: number;
  clipEnd: number;
  savedAt: string;
}

export function getOfflineClips(): OfflineClipEntry[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) ?? '[]') as OfflineClipEntry[];
  } catch {
    return [];
  }
}

export function saveOfflineClip(entry: OfflineClipEntry): void {
  const list = getOfflineClips().filter((c) => c.songId !== entry.songId);
  list.unshift(entry);
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(list.slice(0, 20)));
}

export function removeOfflineClip(songId: string): void {
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(getOfflineClips().filter((c) => c.songId !== songId)));
}
