export default function SonovaLogo({ className = 'fill-white' }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14" className="fill-white/20" />
      <ellipse cx="16" cy="17" rx="8" ry="6" className={className} />
      <circle cx="16" cy="17" r="2.5" fill="#1d4ed8" />
    </svg>
  );
}
