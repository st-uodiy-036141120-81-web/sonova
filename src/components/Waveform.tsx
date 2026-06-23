interface WaveformProps {
  seed?: string;
  active?: boolean;
  className?: string;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export default function Waveform({ seed = 'default', active = false, className = '' }: WaveformProps) {
  const bars = 24;
  const base = hash(seed);

  return (
    <div className={`flex h-6 items-end gap-[2px] ${className}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => {
        const h = 20 + ((base + i * 17) % 80);
        return (
          <span
            key={i}
            className={`w-[3px] rounded-full transition-all duration-300 ${
              active ? 'bg-blue-500 animate-pulse' : 'bg-white/30'
            }`}
            style={{ height: `${h}%`, animationDelay: active ? `${i * 40}ms` : undefined }}
          />
        );
      })}
    </div>
  );
}
