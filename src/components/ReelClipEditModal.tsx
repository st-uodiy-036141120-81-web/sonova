import { useEffect, useState } from 'react';
import { X, Scissors } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReelClipEditor, { type ExtraClipDraft } from './ReelClipEditor';
import { updateSongReelClip } from '../lib/api';
import { updateSongClipExtras } from '../lib/reelsFeatures/api';
import type { Song } from '../lib/types';
import { defaultClipRange, hasReelClip, validateReelClip } from '../lib/reelClip';

interface ReelClipEditModalProps {
  song: Song;
  onClose: () => void;
  onSaved: () => void;
}

export default function ReelClipEditModal({ song, onClose, onSaved }: ReelClipEditModalProps) {
  const { t } = useTranslation();
  const duration = song.duration_seconds ?? null;
  const initial = hasReelClip(song)
    ? { start: song.clip_start_seconds ?? 0, end: song.clip_end_seconds ?? 30 }
    : defaultClipRange(duration);

  const [enabled, setEnabled] = useState(hasReelClip(song));
  const [startSeconds, setStartSeconds] = useState(initial.start);
  const [endSeconds, setEndSeconds] = useState(initial.end);
  const [loopCount, setLoopCount] = useState(song.clip_loop_count ?? 0);
  const [caption, setCaption] = useState(song.clip_caption ?? '');
  const [moodTags, setMoodTags] = useState<string[]>(song.mood_tags ?? []);
  const [scheduleAt, setScheduleAt] = useState(song.clip_scheduled_at?.slice(0, 16) ?? '');
  const [collabStudioId, setCollabStudioId] = useState(song.collab_studio_id ?? '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [extraClips, setExtraClips] = useState<ExtraClipDraft[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (enabled && !hasReelClip(song)) {
      const d = defaultClipRange(duration);
      setStartSeconds(d.start);
      setEndSeconds(d.end);
    }
  }, [enabled, song, duration]);

  const handleSave = async () => {
    setError('');
    if (!enabled) {
      setSaving(true);
      try {
        await updateSongReelClip(song.id, 0, null);
        onSaved();
        onClose();
      } catch {
        setError(t('reelsClip.saveFailed'));
      } finally {
        setSaving(false);
      }
      return;
    }
    const validation = validateReelClip(startSeconds, endSeconds, duration, t);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    try {
      await updateSongReelClip(song.id, startSeconds, endSeconds);
      await updateSongClipExtras(song.id, {
        clipLoopCount: loopCount,
        clipCaption: caption.trim() || null,
        clipScheduledAt: scheduleAt || null,
        moodTags,
        collabStudioId: collabStudioId.trim() || null,
      });
      onSaved();
      onClose();
    } catch {
      setError(t('reelsClip.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={onClose}>
      <div className="liquid-glass w-full max-w-md rounded-2xl p-5 max-h-[90vh] overflow-y-auto" style={{ background: 'rgba(20,20,30,0.95)' }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg text-white"><Scissors size={18} /> {t('reelsClip.editTitle')}</h3>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white"><X size={20} /></button>
        </div>
        <p className="mb-4 text-sm text-white/70">{song.title}</p>
        <ReelClipEditor
          enabled={enabled}
          onEnabledChange={setEnabled}
          startSeconds={startSeconds}
          endSeconds={endSeconds}
          onStartChange={setStartSeconds}
          onEndChange={setEndSeconds}
          durationSeconds={duration}
          previewUrl={song.file_url}
          waveformPeaks={song.waveform_peaks ?? undefined}
          loopCount={loopCount}
          onLoopCountChange={setLoopCount}
          caption={caption}
          onCaptionChange={setCaption}
          moodTags={moodTags}
          onMoodTagsChange={setMoodTags}
          scheduleAt={scheduleAt}
          onScheduleAtChange={setScheduleAt}
          collabStudioId={collabStudioId}
          onCollabStudioIdChange={setCollabStudioId}
          coverFile={coverFile}
          onCoverFileChange={setCoverFile}
          extraClips={extraClips}
          onExtraClipsChange={setExtraClips}
          title={song.title}
          tags={song.tags}
          error={error}
        />
        <button type="button" onClick={handleSave} disabled={saving} className="mt-4 w-full rounded-xl bg-blue-700 py-2.5 text-sm text-white disabled:opacity-50">
          {saving ? t('profile.saving') : t('studioPage.save')}
        </button>
      </div>
    </div>
  );
}
