import type { Song } from '../types';

/** Client-side caption suggestion from title, tags, mood */
export function suggestClipCaption(song: Pick<Song, 'title' | 'tags' | 'mood_tags' | 'city_tag'>): string {
  const tags = [...(song.tags ?? []), ...(song.mood_tags ?? [])].slice(0, 3);
  const tagStr = tags.length ? tags.map((t) => `#${t}`).join(' ') : '';
  const city = song.city_tag ? ` · ${song.city_tag}` : '';
  return `${song.title}${city}${tagStr ? ` ${tagStr}` : ''} 🎧`;
}
