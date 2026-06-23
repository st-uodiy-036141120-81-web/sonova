import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, FileEdit } from 'lucide-react';
import type { Song } from '../lib/types';
import { fetchStudioDrafts, publishDraft } from '../lib/platformApi';
import { getErrorMessage } from '../lib/errors';

interface StudioDraftsPanelProps {
  studioId: string;
  onUpdated: () => void;
}

export default function StudioDraftsPanel({ studioId, onUpdated }: StudioDraftsPanelProps) {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    fetchStudioDrafts(studioId)
      .then(setDrafts)
      .catch(() => setDrafts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [studioId]);

  const handlePublish = async (songId: string) => {
    setPublishingId(songId);
    setError('');
    try {
      await publishDraft(songId);
      load();
      onUpdated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPublishingId(null);
    }
  };

  if (loading || drafts.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 text-sm text-[var(--text-primary)]">
        <FileEdit size={16} /> {t('create.draftsTitle', { count: drafts.length })}
      </h2>
      <div className="space-y-2">
        {drafts.map((song) => (
          <div key={song.id} className="liquid-glass flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: 'var(--glass-bg)' }}>
            <div className="min-w-0">
              <p className="truncate text-sm text-[var(--text-primary)]">{song.title}</p>
              <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                {song.status === 'scheduled' && song.publish_at ? (
                  <><Clock size={12} /> {t('create.scheduledAt', { date: new Date(song.publish_at).toLocaleString() })}</>
                ) : (
                  t('create.draftStatus')
                )}
              </p>
            </div>
            {song.status === 'draft' && (
              <button
                type="button"
                disabled={publishingId === song.id}
                onClick={() => handlePublish(song.id)}
                className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
              >
                {publishingId === song.id ? t('create.publishing') : t('create.publishNow')}
              </button>
            )}
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </section>
  );
}
