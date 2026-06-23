/** Client-side helpers + localStorage fallbacks */
const SLEEP_KEY = 'sonova-sleep-until';
const SPEED_KEY = 'sonova-playback-speed';
const BG_UPLOAD_KEY = 'sonova-bg-uploads';

export function getPlaybackSpeed(): number {
  return parseFloat(localStorage.getItem(SPEED_KEY) ?? '1') || 1;
}

export function setPlaybackSpeed(s: number) {
  localStorage.setItem(SPEED_KEY, String(s));
}

export function getSleepUntil(): number | null {
  const v = localStorage.getItem(SLEEP_KEY);
  return v ? parseInt(v, 10) : null;
}

export function setSleepTimer(minutes: number) {
  localStorage.setItem(SLEEP_KEY, String(Date.now() + minutes * 60_000));
}

export function clearSleepTimer() {
  localStorage.removeItem(SLEEP_KEY);
}

export interface BgUploadJob {
  id: string;
  studioId: string;
  title: string;
  status: 'queued' | 'done' | 'failed';
  createdAt: number;
}

export function queueBgUpload(job: Omit<BgUploadJob, 'createdAt' | 'status'>) {
  const jobs = loadBgUploads();
  jobs.push({ ...job, status: 'queued', createdAt: Date.now() });
  localStorage.setItem(BG_UPLOAD_KEY, JSON.stringify(jobs));
}

export function loadBgUploads(): BgUploadJob[] {
  try {
    return JSON.parse(localStorage.getItem(BG_UPLOAD_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function markBgUploadDone(id: string) {
  const jobs = loadBgUploads().map((j) => (j.id === id ? { ...j, status: 'done' as const } : j));
  localStorage.setItem(BG_UPLOAD_KEY, JSON.stringify(jobs));
}

export const MOOD_TAGS: Record<string, string[]> = {
  study: ['ambient', 'calm', 'acoustic'],
  night: ['ambient', 'drone', 'electronic'],
  workout: ['electronic', 'roots'],
};

export const EXPLORE_EVERY_N = 5;
