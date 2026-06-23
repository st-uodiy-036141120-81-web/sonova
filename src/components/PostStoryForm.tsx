import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { postStudioStory } from '../lib/platformApi';
import { uploadFile } from '../lib/storage';
import { getErrorMessage } from '../lib/errors';

interface PostStoryFormProps {
  studioId: string;
  onPosted: () => void;
}

export default function PostStoryForm({ studioId, onPosted }: PostStoryFormProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMedia = (file: File | null) => {
    setMedia(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!content.trim() && !media) {
      setError(t('create.storyNeedContent'));
      return;
    }
    setLoading(true);
    try {
      let mediaUrl: string | undefined;
      if (media) {
        mediaUrl = await uploadFile('songs', `${studioId}/stories/${Date.now()}-${media.name}`, media);
      }
      await postStudioStory(studioId, content.trim() || t('create.storyDefault'), mediaUrl);
      setContent('');
      handleMedia(null);
      onPosted();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="liquid-glass rounded-2xl p-4" style={{ background: 'var(--glass-bg)' }}>
      <h3 className="mb-3 flex items-center gap-2 text-sm text-[var(--text-primary)]">
        <BookOpen size={16} /> {t('create.storyFormTitle')}
      </h3>
      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('create.storyPlaceholder')}
          rows={3}
          maxLength={500}
          className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none"
        />
        <div>
          <input
            type="file"
            accept="image/*,video/mp4,.mp4"
            onChange={(e) => handleMedia(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-[var(--text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-purple-700 file:px-3 file:py-1.5 file:text-white"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('create.storyMediaHint')}</p>
        </div>
        {preview && (
          media?.type.startsWith('video') || media?.name.toLowerCase().endsWith('.mp4') ? (
            <video src={preview} controls className="max-h-48 w-full rounded-xl" />
          ) : (
            <img src={preview} alt="" className="max-h-48 w-full rounded-xl object-cover" />
          )
        )}
        <p className="text-xs text-[var(--text-muted)]">{t('create.storyExpires')}</p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || (!content.trim() && !media)}
          className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-2.5 text-sm text-white disabled:opacity-50"
        >
          {loading ? t('create.publishing') : t('create.storyPublish')}
        </button>
      </div>
    </form>
  );
}
