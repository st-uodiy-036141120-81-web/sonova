export function SettingToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start justify-between gap-4 rounded-xl bg-white/5 px-4 py-3 ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-white/10'}`}>
      <span>
        <span className="block text-sm text-[var(--text-primary)]">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
      />
    </label>
  );
}

export function SettingSelect<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <span className="block text-sm text-[var(--text-primary)]">{label}</span>
      {description && <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{description}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-2 w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-gray-900">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingRange({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[var(--text-primary)]">{label}</span>
        <span className="text-xs text-blue-400">
          {value}
          {unit}
        </span>
      </div>
      {description && <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{description}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-blue-600"
      />
    </div>
  );
}

export function SettingText({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const cls = 'mt-2 w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-500';
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <span className="block text-sm text-[var(--text-primary)]">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

export function SettingGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {title && <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{title}</h3>}
      {children}
    </div>
  );
}

export function SettingsTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav className="sticky top-24 z-10 -mx-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
      <div className="flex min-w-max gap-2 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-full px-4 py-2 text-sm whitespace-nowrap transition-all duration-200 ${
              active === tab.id
                ? 'bg-white text-gray-900 shadow-md scale-[1.02]'
                : 'liquid-glass text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
