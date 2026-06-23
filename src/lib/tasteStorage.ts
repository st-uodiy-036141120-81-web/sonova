const STORAGE_KEY = 'sonova-taste';

export interface LocalTasteData {
  tags: Record<string, number>;
  artists: Record<string, number>;
  skipped: string[];
  watched: string[];
}

function key(userId?: string) {
  return userId ? `${STORAGE_KEY}-${userId}` : `${STORAGE_KEY}-guest`;
}

function empty(): LocalTasteData {
  return { tags: {}, artists: {}, skipped: [], watched: [] };
}

export function loadLocalTaste(userId?: string): LocalTasteData {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as LocalTasteData;
    return {
      tags: parsed.tags ?? {},
      artists: parsed.artists ?? {},
      skipped: parsed.skipped ?? [],
      watched: parsed.watched ?? [],
    };
  } catch {
    return empty();
  }
}

function save(userId: string | undefined, data: LocalTasteData) {
  const trimmed: LocalTasteData = {
    tags: data.tags,
    artists: data.artists,
    skipped: data.skipped.slice(-200),
    watched: data.watched.slice(-200),
  };
  localStorage.setItem(key(userId), JSON.stringify(trimmed));
}

export function resetLocalTaste(userId?: string) {
  localStorage.removeItem(key(userId));
}

/** مشاهدة إيجابية (>8 ثوانٍ) — تعزيز الذوق */
export function recordPositiveWatch(songId: string, tags: string[], artistId: string | undefined, userId?: string) {
  const data = loadLocalTaste(userId);
  if (!data.watched.includes(songId)) data.watched.push(songId);

  for (const tag of tags) {
    data.tags[tag] = Math.min((data.tags[tag] ?? 0) + 0.15, 3);
  }
  if (artistId) {
    data.artists[artistId] = Math.min((data.artists[artistId] ?? 0) + 0.12, 3);
  }
  save(userId, data);
}

/** تخطّي سريع (<2 ثانية) — تخفيف الذوق */
export function recordSkip(songId: string, tags: string[], artistId: string | undefined, userId?: string) {
  const data = loadLocalTaste(userId);
  if (!data.skipped.includes(songId)) data.skipped.push(songId);

  for (const tag of tags) {
    data.tags[tag] = Math.max((data.tags[tag] ?? 0) - 0.08, 0);
  }
  if (artistId) {
    data.artists[artistId] = Math.max((data.artists[artistId] ?? 0) - 0.06, 0);
  }
  save(userId, data);
}

/** إعجاب — تعزيز قوي */
export function recordLikeBoost(tags: string[], artistId: string | undefined, userId?: string) {
  const data = loadLocalTaste(userId);
  for (const tag of tags) {
    data.tags[tag] = Math.min((data.tags[tag] ?? 0) + 0.35, 3);
  }
  if (artistId) {
    data.artists[artistId] = Math.min((data.artists[artistId] ?? 0) + 0.4, 3);
  }
  save(userId, data);
}
