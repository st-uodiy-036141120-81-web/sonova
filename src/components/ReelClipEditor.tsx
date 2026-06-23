import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Sparkles, Plus, Trash2 } from 'lucide-react';
import {
  DEFAULT_REEL_CLIP_SECONDS,
  formatClipTime,
  MAX_REEL_CLIP_SECONDS,
  MIN_REEL_CLIP_SECONDS,
} from '../lib/reelClip';
import { suggestClipFromPeaks } from '../lib/reelsFeatures/clipSuggest';
import { suggestClipCaption } from '../lib/reelsFeatures/aiCaption';

export interface ExtraClipDraft {
  label: string;
  start_seconds: number;
  end_seconds: number;
}

interface ReelClipEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  startSeconds: number;
  endSeconds: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  durationSeconds: number | null;
  previewUrl?: string | null;
  waveformPeaks?: number[];
  loopCount: number;
  onLoopCountChange: (n: number) => void;
  caption: string;
  onCaptionChange: (s: string) => void;
  moodTags: string[];
  onMoodTagsChange: (tags: string[]) => void;
  scheduleAt: string;
  onScheduleAtChange: (s: string) => void;
  collabStudioId: string;
  onCollabStudioIdChange: (s: string) => void;
  coverFile: File | null;
  onCoverFileChange: (f: File | null) => void;
  extraClips: ExtraClipDraft[];
  onExtraClipsChange: (clips: ExtraClipDraft[]) => void;
  title?: string;
  tags?: string[];
  error?: string;
}

const MOOD_OPTIONS = ['focus', 'energy', 'night', 'calm', 'workout', 'sad'];

export default function ReelClipEditor(props: ReelClipEditorProps) {
  const {
    enabled, onEnabledChange, startSeconds, endSeconds, onStartChange, onEndChange,
    durationSeconds, previewUrl, waveformPeaks, loopCount, onLoopCountChange,
    caption, onCaptionChange, moodTags, onMoodTagsChange, scheduleAt, onScheduleAtChange,
    collabStudioId, onCollabStudioIdChange, coverFile, onCoverFileChange,
    extraClips, onExtraClipsChange, title, tags, error,
  } = props;
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const clipLength = Math.max(0, endSeconds - startSeconds);
  const maxStart = durationSeconds != null ? Math.max(0, durationSeconds - MIN_REEL_CLIP_SECONDS) : undefined;

  const togglePreview = () => {
    if (!previewUrl) return;
    if (!audioRef.current) audioRef.current = new Audio(previewUrl);
    const a = audioRef.current;
    if (previewing) {
      a.pause();
      setPreviewing(false);
      return;
    }
    a.currentTime = startSeconds;
    a.play().then(() => setPreviewing(true)).catch(() => {});
    const onTime = () => {
      if (a.currentTime >= endSeconds) {
        a.pause();
        setPreviewing(false);
        a.removeEventListener('timeupdate', onTime);
      }
    };
    a.addEventListener('timeupdate', onTime);
  };

  useEffect(() => () => audioRef.current?.pause(), []);

  const autoSuggest = () => {
    if (waveformPeaks?.length && durationSeconds) {
      const s = suggestClipFromPeaks(waveformPeaks, durationSeconds);
      onStartChange(s.start);
      onEndChange(s.end);
    }
  };

  const autoCaption = () => {
    onCaptionChange(suggestClipCaption({ title: title ?? '', tags: tags ?? [], mood_tags: moodTags }));
  };

  const toggleMood = (m: string) => {
    onMoodTagsChange(moodTags.includes(m) ? moodTags.filter((x) => x !== m) : [...moodTags, m]);
  };

  const addExtraClip = () => {
    onExtraClipsChange([
      ...extraClips,
      { label: `B${extraClips.length + 1}`, start_seconds: startSeconds, end_seconds: endSeconds },
    ]);
  };

  return (
    <div className="rounded-xl bg-white/5 p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={enabled} onChange={(e) => onEnabledChange(e.target.checked)} className="mt-1 h-4 w-4 accent-blue-600" />
        <span>
          <span className="block text-sm text-[var(--text-primary)]">{t('reelsClip.enable')}</span>
          <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{t('reelsClip.enableHint')}</span>
        </span>
      </label>

      {enabled && (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap gap-2">
            {previewUrl && (
              <button type="button" onClick={togglePreview} className="flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs text-white">
                {previewing ? <Pause size={12} /> : <Play size={12} />} {t('reelsFeatures.clipPreview')}
              </button>
            )}
            {waveformPeaks?.length ? (
              <button type="button" onClick={autoSuggest} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white">
                <Sparkles size={12} /> {t('reelsFeatures.autoSuggest')}
              </button>
            ) : null}
            <button type="button" onClick={autoCaption} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white">{t('reelsFeatures.aiCaption')}</button>
          </div>

          {durationSeconds != null && (
            <p className="text-xs text-[var(--text-muted)]">{t('reelsClip.trackDuration')}: {formatClipTime(durationSeconds)}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)]">{t('reelsClip.start')}</label>
              <input type="range" min={0} max={maxStart ?? Math.max(endSeconds - MIN_REEL_CLIP_SECONDS, 0)} step={1} value={startSeconds}
                onChange={(e) => { const n = Number(e.target.value); onStartChange(n); if (endSeconds <= n) onEndChange(n + DEFAULT_REEL_CLIP_SECONDS); }}
                className="mt-1 w-full accent-blue-600" />
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{formatClipTime(startSeconds)}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">{t('reelsClip.end')}</label>
              <input type="range" min={startSeconds + MIN_REEL_CLIP_SECONDS}
                max={durationSeconds != null ? Math.min(durationSeconds, startSeconds + MAX_REEL_CLIP_SECONDS) : startSeconds + MAX_REEL_CLIP_SECONDS}
                step={1} value={endSeconds} onChange={(e) => onEndChange(Number(e.target.value))} className="mt-1 w-full accent-blue-600" />
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{formatClipTime(endSeconds)}</p>
            </div>
          </div>

          <p className="text-xs text-blue-300">{t('reelsClip.previewLength', { length: formatClipTime(clipLength) })}</p>

          <label className="text-xs text-[var(--text-muted)]">{t('reelsFeatures.loopCount')}</label>
          <input type="range" min={0} max={3} value={loopCount} onChange={(e) => onLoopCountChange(Number(e.target.value))} className="w-full accent-blue-600" />

          <input value={caption} onChange={(e) => onCaptionChange(e.target.value)} placeholder={t('reelsFeatures.captionPlaceholder')} className="w-full rounded-lg bg-white/10 px-3 py-2 text-xs text-white outline-none" />

          <div className="flex flex-wrap gap-1">
            {MOOD_OPTIONS.map((m) => (
              <button key={m} type="button" onClick={() => toggleMood(m)} className={`rounded-lg px-2 py-0.5 text-[10px] ${moodTags.includes(m) ? 'bg-blue-700 text-white' : 'bg-white/10 text-white/70'}`}>#{m}</button>
            ))}
          </div>

          <input type="file" accept="image/*" onChange={(e) => onCoverFileChange(e.target.files?.[0] ?? null)} className="w-full text-xs text-white/60 file:mr-2 file:rounded file:bg-blue-700 file:px-2 file:py-1 file:text-white" />
          {coverFile && <p className="text-[10px] text-white/50">{coverFile.name}</p>}

          <input type="datetime-local" value={scheduleAt} onChange={(e) => onScheduleAtChange(e.target.value)} className="w-full rounded-lg bg-white/10 px-3 py-2 text-xs text-white outline-none" />
          <input value={collabStudioId} onChange={(e) => onCollabStudioIdChange(e.target.value)} placeholder={t('reelsFeatures.collabStudioId')} className="w-full rounded-lg bg-white/10 px-3 py-2 text-xs text-white outline-none" />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-white/70">{t('reelsFeatures.extraClips')}</span>
              <button type="button" onClick={addExtraClip} className="text-blue-400"><Plus size={14} /></button>
            </div>
            {extraClips.map((c, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input value={c.label} onChange={(e) => { const n = [...extraClips]; n[i] = { ...c, label: e.target.value }; onExtraClipsChange(n); }} className="w-16 rounded bg-white/10 px-2 py-1 text-xs text-white" />
                <input type="number" value={c.start_seconds} onChange={(e) => { const n = [...extraClips]; n[i] = { ...c, start_seconds: Number(e.target.value) }; onExtraClipsChange(n); }} className="w-16 rounded bg-white/10 px-2 py-1 text-xs text-white" />
                <input type="number" value={c.end_seconds} onChange={(e) => { const n = [...extraClips]; n[i] = { ...c, end_seconds: Number(e.target.value) }; onExtraClipsChange(n); }} className="w-16 rounded bg-white/10 px-2 py-1 text-xs text-white" />
                <button type="button" onClick={() => onExtraClipsChange(extraClips.filter((_, j) => j !== i))}><Trash2 size={14} className="text-red-400" /></button>
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
