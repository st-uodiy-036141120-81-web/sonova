interface ReelLyricsOverlayProps {
  lyrics: string | null | undefined;
  currentTime: number;
  clipStart: number;
  active: boolean;
}

export default function ReelLyricsOverlay({ lyrics, currentTime, clipStart, active }: ReelLyricsOverlayProps) {
  if (!lyrics?.trim() || !active) return null;
  const lines = lyrics.split('\n').filter(Boolean);
  const rel = Math.max(0, currentTime - clipStart);
  const idx = Math.min(lines.length - 1, Math.floor(rel / 4));
  return (
    <div className="pointer-events-none absolute bottom-48 left-4 right-4 z-20 text-center">
      <p className="text-sm font-medium text-white drop-shadow-lg animate-pulse">{lines[idx]}</p>
    </div>
  );
}
