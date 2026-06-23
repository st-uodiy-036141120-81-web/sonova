import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchSongById } from '../lib/featuresApi';
import { getReelClipBounds } from '../lib/reelClip';
import type { Song } from '../lib/types';

export default function EmbedPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const clipMode = params.get('clip') === '1';
  const [song, setSong] = useState<Song | null>(null);

  useEffect(() => {
    if (id) fetchSongById(id).then(setSong);
  }, [id]);

  if (!song) return <div className="flex h-32 items-center justify-center bg-black text-white/50 text-sm">Sonova</div>;

  const { clipStart, clipEnd } = getReelClipBounds(song, false);

  const play = () => {
    const a = new Audio(song.file_url);
    if (clipMode && clipEnd != null) {
      a.currentTime = clipStart;
      a.play();
      a.ontimeupdate = () => {
        if (a.currentTime >= clipEnd) { a.pause(); a.currentTime = clipStart; }
      };
    } else {
      a.play();
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#0a0a0f] p-3 font-sans">
      <button type="button" onClick={play} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white text-lg">▶</button>
      <div className="min-w-0">
        <p className="truncate text-sm text-white">{song.title}{clipMode ? ' · clip' : ''}</p>
        <a href={`${window.location.origin}/reels?song=${song.id}&clip=1`} target="_blank" rel="noreferrer" className="text-xs text-blue-400">
          @{song.studio?.owner?.username} · Sonova
        </a>
      </div>
    </div>
  );
}
