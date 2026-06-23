import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { uploadSong, POPULAR_TAGS } from '../lib/api';
import { checkDuplicateFingerprint } from '../lib/apiExtended';
import { computeAudioFingerprint } from '../lib/fingerprint';
import { extractWaveformPeaks } from '../lib/realWaveform';
import { getFileType, isValidAudioFile, getMediaDurationSeconds, validateSongDuration } from '../lib/validators';
import { checkUploadRateLimit, incrementUploadCount } from '../lib/platformApi';
import { queueBgUpload } from '../lib/localFeatures';
import { useAuth } from '../context/AuthContext';
import { useUserSettings } from '../context/UserSettingsContext';
import ReelClipEditor, { type ExtraClipDraft } from './ReelClipEditor';
import { defaultClipRange, validateReelClip } from '../lib/reelClip';
import { saveSongReelClips } from '../lib/reelsFeatures/api';
import { uploadFile } from '../lib/storage';

import { getErrorMessage } from '../lib/errors';

interface UploadSongFormProps {
  studioId: string;
  onUploaded: () => void;
  variant?: 'simple' | 'full';
  mode?: 'song' | 'reel';
}

export default function UploadSongForm({ studioId, onUploaded, variant = 'full', mode = 'song' }: UploadSongFormProps) {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[] | undefined>();
  const [tags, setTags] = useState<string[]>(settings.defaultTags);
  const [originalSongId, setOriginalSongId] = useState('');
  const isReelMode = mode === 'reel';
  const effectiveVariant = isReelMode ? 'simple' : variant;
  const [reelClipEnabled, setReelClipEnabled] = useState(isReelMode);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(30);
  const [loopCount, setLoopCount] = useState(0);
  const [caption, setCaption] = useState('');
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [clipScheduleAt, setClipScheduleAt] = useState('');
  const [collabStudioId, setCollabStudioId] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [extraClips, setExtraClips] = useState<ExtraClipDraft[]>([]);
  const [clipError, setClipError] = useState('');
  const [quality, setQuality] = useState<'128' | '320' | 'flac'>('320');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [cityTag, setCityTag] = useState(settings.defaultCity);
  const [shoutout, setShoutout] = useState('');
  const [isDraft, setIsDraft] = useState(effectiveVariant === 'full' ? settings.defaultUploadDraft : false);
  const [showAdvanced, setShowAdvanced] = useState(isReelMode || effectiveVariant === 'full');
  const [scheduleAt, setScheduleAt] = useState('');
  const [followersOnly, setFollowersOnly] = useState(false);
  const [earlyAccess, setEarlyAccess] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      setFileDuration(null);
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    getMediaDurationSeconds(file)
      .then((sec) => {
        setFileDuration(sec);
        const d = defaultClipRange(sec);
        setClipStart(d.start);
        setClipEnd(d.end);
      })
      .catch(() => setFileDuration(null));
    extractWaveformPeaks(file).then(setWaveformPeaks).catch(() => setWaveformPeaks(undefined));
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setClipError('');
    if (!file || !title.trim()) return;
    if (!isValidAudioFile(file)) {
      setError(t('upload.invalidFormat'));
      return;
    }
    const fileType = getFileType(file);
    if (!fileType) {
      setError(t('upload.invalidFormat'));
      return;
    }

    if (user && !(await checkUploadRateLimit(user.id))) {
      setError(t('upload.rateLimit'));
      return;
    }

    if (!navigator.onLine) {
      queueBgUpload({ id: crypto.randomUUID(), studioId, title: title.trim() });
      setError(t('upload.queuedOffline'));
      return;
    }

    setLoading(true);
    try {
      let durationSec: number;
      try {
        durationSec = await getMediaDurationSeconds(file);
      } catch {
        setError(t('upload.durationUnknown'));
        return;
      }
      const durationErr = validateSongDuration(durationSec);
      if (durationErr) {
        setError(durationErr);
        return;
      }

      if (reelClipEnabled) {
        const clipErr = validateReelClip(clipStart, clipEnd, durationSec, t);
        if (clipErr) {
          setClipError(clipErr);
          return;
        }
      }

      const [fingerprint, peaks] = await Promise.all([
        computeAudioFingerprint(file),
        extractWaveformPeaks(file).catch(() => undefined),
      ]);
      const duplicate = await checkDuplicateFingerprint(fingerprint);
      if (duplicate) {
        setError(t('song.duplicate'));
        return;
      }

      let coverUrl: string | null = null;
      if (coverFile && user) {
        coverUrl = await uploadFile('songs', `${studioId}/covers/${Date.now()}-${coverFile.name}`, coverFile);
      }

      const allTags = [...tags, `q${quality}`];
      const song = await uploadSong(studioId, file, title.trim(), fileType, allTags, fingerprint, {
        waveformPeaks: peaks ?? waveformPeaks,
        originalSongId: originalSongId.trim() || undefined,
        clipStart: reelClipEnabled ? clipStart : undefined,
        clipEnd: reelClipEnabled ? clipEnd : undefined,
        durationSeconds: durationSec,
        clipLoopCount: reelClipEnabled ? loopCount : 0,
        clipCoverUrl: coverUrl,
        clipCaption: caption.trim() || null,
        clipScheduledAt: clipScheduleAt || null,
        moodTags,
        collabStudioId: collabStudioId.trim() || null,
        status: isReelMode ? 'published' : isDraft ? 'draft' : scheduleAt ? 'scheduled' : 'published',
        publishAt: scheduleAt || undefined,
        description: description.trim() || undefined,
        lyrics: lyrics.trim() || undefined,
        cityTag: cityTag.trim() || undefined,
        shoutoutUsername: shoutout.trim() || undefined,
        followersOnly,
        earlyAccessHours: earlyAccess ? 48 : undefined,
        isExclusive,
      });

      if (reelClipEnabled && extraClips.length) {
        await saveSongReelClips(song.id, [
          { label: 'A', start_seconds: clipStart, end_seconds: clipEnd, is_primary: true, loop_count: loopCount, cover_url: coverUrl },
          ...extraClips.map((c) => ({ ...c, is_primary: false, loop_count: 0, cover_url: null })),
        ]);
      }

      if (user) await incrementUploadCount(user.id);
      setTitle('');
      setFile(null);
      onUploaded();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fileTypeLabel = file ? getFileType(file)?.toUpperCase() : null;

  return (
    <form onSubmit={handleSubmit} className="liquid-glass rounded-2xl p-4" style={{ background: 'var(--glass-bg)' }}>
      <h3 className="mb-3 flex items-center gap-2 text-sm text-[var(--text-primary)]">
        <Upload size={16} /> {isReelMode ? t('create.reelFormTitle') : effectiveVariant === 'simple' ? t('upload.publishBtn') : t('studio.upload')}
      </h3>
      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('studio.songTitle')} required className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
        <div>
          <input
            type="file"
            accept=".mp3,.mp4,audio/mpeg,audio/mp3,video/mp4,audio/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required={effectiveVariant === 'simple'}
            className="w-full text-sm text-[var(--text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-1.5 file:text-white"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('upload.formatsHint')}</p>
          {fileTypeLabel && (
            <p className="mt-1 text-xs text-green-400">{t('upload.selectedFormat', { format: fileTypeLabel })}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TAGS.map((tag) => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`rounded-lg px-2.5 py-1 text-xs ${tags.includes(tag) ? 'bg-blue-700 text-white' : 'bg-white/10 text-[var(--text-muted)]'}`}>#{tag}</button>
          ))}
        </div>
        {effectiveVariant === 'simple' && !isReelMode && (
          <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="text-xs text-blue-400">
            {showAdvanced ? t('upload.hideAdvanced') : t('upload.showAdvanced')}
          </button>
        )}
        {showAdvanced && (
          <>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('upload.description')} rows={2} className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
            <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder={t('upload.lyrics')} rows={3} className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
            <ReelClipEditor
              enabled={reelClipEnabled}
              onEnabledChange={setReelClipEnabled}
              startSeconds={clipStart}
              endSeconds={clipEnd}
              onStartChange={setClipStart}
              onEndChange={setClipEnd}
              durationSeconds={fileDuration}
              previewUrl={previewUrl}
              waveformPeaks={waveformPeaks}
              loopCount={loopCount}
              onLoopCountChange={setLoopCount}
              caption={caption}
              onCaptionChange={setCaption}
              moodTags={moodTags}
              onMoodTagsChange={setMoodTags}
              scheduleAt={clipScheduleAt}
              onScheduleAtChange={setClipScheduleAt}
              collabStudioId={collabStudioId}
              onCollabStudioIdChange={setCollabStudioId}
              coverFile={coverFile}
              onCoverFileChange={setCoverFile}
              extraClips={extraClips}
              onExtraClipsChange={setExtraClips}
              title={title}
              tags={tags}
              error={clipError}
            />
            <input value={originalSongId} onChange={(e) => setOriginalSongId(e.target.value)} placeholder={t('song.originalId')} className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
            <input value={cityTag} onChange={(e) => setCityTag(e.target.value)} placeholder={t('upload.city')} className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
            <input value={shoutout} onChange={(e) => setShoutout(e.target.value)} placeholder={t('upload.shoutout')} className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
            <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
            <div className="flex flex-wrap gap-2">
              {(['128', '320', 'flac'] as const).map((q) => (
                <button key={q} type="button" onClick={() => setQuality(q)} className={`rounded-lg px-2.5 py-1 text-xs ${quality === q ? 'bg-blue-700 text-white' : 'bg-white/10 text-[var(--text-muted)]'}`}>{q}k</button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><input type="checkbox" checked={isDraft} onChange={(e) => setIsDraft(e.target.checked)} />{t('upload.draft')}</label>
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><input type="checkbox" checked={followersOnly} onChange={(e) => setFollowersOnly(e.target.checked)} />{t('upload.followersOnly')}</label>
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><input type="checkbox" checked={earlyAccess} onChange={(e) => setEarlyAccess(e.target.checked)} />{t('upload.earlyAccess')}</label>
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><input type="checkbox" checked={isExclusive} onChange={(e) => setIsExclusive(e.target.checked)} />{t('upload.exclusive')}</label>
          </>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="submit" disabled={loading || !file || !title.trim()} className="w-full rounded-xl bg-white py-2.5 text-sm text-gray-900 disabled:opacity-50">
          {loading ? t('upload.uploading') : isReelMode ? t('create.reelPublish') : effectiveVariant === 'simple' ? t('upload.publishBtn') : t('studio.upload')}
        </button>
      </div>
    </form>
  );
}
