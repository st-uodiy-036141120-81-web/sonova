import type { Song } from '../lib/types';

interface StatsChartProps {
  songs: Song[];
  labelKey: 'play_count' | 'download_count' | 'like_count';
}

export default function StatsChart({ songs, labelKey }: StatsChartProps) {
  if (songs.length === 0) return null;
  const max = Math.max(...songs.map((s) => s[labelKey]), 1);

  return (
    <div className="space-y-3">
      {songs.map((song) => {
        const val = song[labelKey];
        const pct = (val / max) * 100;
        return (
          <div key={song.id}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="truncate text-white/80">{song.title}</span>
              <span className="text-white/50">{val}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-blue-700 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
