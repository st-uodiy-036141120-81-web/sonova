interface RealWaveformProps {
  peaks: number[];
  className?: string;
  active?: boolean;
}

export default function RealWaveform({ peaks, className = '', active = false }: RealWaveformProps) {
  const max = Math.max(...peaks, 0.01);
  return (
    <div className={`flex items-end gap-0.5 ${className}`}>
      {peaks.map((p, i) => (
        <span
          key={i}
          className={`flex-1 rounded-full transition-all duration-150 ${active ? 'bg-blue-400' : 'bg-white/30'}`}
          style={{ height: `${Math.max(8, (p / max) * 100)}%`, minHeight: 4 }}
        />
      ))}
    </div>
  );
}
