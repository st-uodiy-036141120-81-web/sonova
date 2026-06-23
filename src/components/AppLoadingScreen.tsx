export default function AppLoadingScreen() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4"
      style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}
    >
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
        aria-hidden
      />
      <p className="text-sm">Sonova</p>
    </div>
  );
}
