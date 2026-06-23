import { useState } from 'react';
import { Pin, Reply, Trash2, Send, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StudioComment } from '../lib/types';
import { addComment, deleteComment, togglePinComment, reportComment } from '../lib/api';

interface CommentSectionProps {
  studioId: string;
  userId: string | undefined;
  studioOwnerId: string;
  isStudioOwner: boolean;
  comments: StudioComment[];
  onUpdate: () => void;
}

function CommentItem({
  comment,
  userId,
  isStudioOwner,
  studioId,
  studioOwnerId,
  onUpdate,
  depth = 0,
}: {
  comment: StudioComment;
  userId?: string;
  isStudioOwner: boolean;
  studioId: string;
  studioOwnerId: string;
  onUpdate: () => void;
  depth?: number;
}) {
  const { t } = useTranslation();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const canModerate = isStudioOwner || userId === comment.user_id;

  const handleReply = async () => {
    if (!userId || !replyText.trim()) return;
    await addComment(studioId, userId, replyText.trim(), studioOwnerId, comment.id);
    setReplyText('');
    setReplying(false);
    onUpdate();
  };

  const handleReport = async () => {
    if (!userId) return;
    const reason = prompt(t('comments.reportReason'));
    if (!reason?.trim()) return;
    await reportComment(comment.id, userId, reason.trim());
    alert(t('comments.reported'));
  };

  return (
    <div className={depth > 0 ? 'mr-6 mt-2 border-r border-white/10 pr-4' : ''}>
      <div className={`rounded-xl p-3 ${comment.is_pinned ? 'bg-white/15 ring-1 ring-blue-400/40' : 'bg-white/5'}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-blue-300">@{comment.author?.username}</p>
            <p className="mt-1 text-sm text-white/90">{comment.content}</p>
          </div>
          {comment.is_pinned && <Pin size={14} className="shrink-0 text-blue-400" />}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {userId && (
            <button type="button" onClick={() => setReplying(!replying)} className="flex items-center gap-1 text-xs text-white/60 hover:text-white">
              <Reply size={12} /> {t('comments.reply')}
            </button>
          )}
          {userId && userId !== comment.user_id && (
            <button type="button" onClick={handleReport} className="flex items-center gap-1 text-xs text-amber-300/80 hover:text-amber-200">
              <Flag size={12} /> {t('comments.report')}
            </button>
          )}
          {canModerate && (
            <>
              {isStudioOwner && (
                <button type="button" onClick={() => togglePinComment(comment.id, !comment.is_pinned).then(onUpdate)} className="text-xs text-white/60 hover:text-white">
                  {comment.is_pinned ? t('comments.unpin') : t('comments.pin')}
                </button>
              )}
              <button type="button" onClick={() => deleteComment(comment.id).then(onUpdate)} className="flex items-center gap-1 text-xs text-red-300">
                <Trash2 size={12} /> {t('comments.delete')}
              </button>
            </>
          )}
        </div>
        {replying && (
          <div className="mt-2 flex gap-2">
            <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={t('comments.replyPlaceholder')} className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white outline-none" />
            <button type="button" onClick={handleReply} className="rounded-lg bg-blue-700 px-3 text-white"><Send size={14} /></button>
          </div>
        )}
      </div>
      {comment.replies?.map((r) => (
        <CommentItem key={r.id} comment={r} userId={userId} isStudioOwner={isStudioOwner} studioId={studioId} studioOwnerId={studioOwnerId} onUpdate={onUpdate} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function CommentSection({ studioId, userId, studioOwnerId, isStudioOwner, comments, onUpdate }: CommentSectionProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !text.trim()) return;
    await addComment(studioId, userId, text.trim(), studioOwnerId);
    setText('');
    onUpdate();
  };

  return (
    <section className="mt-8">
      <h3 className="mb-4 text-lg text-white">{t('studio.comments')}</h3>
      {userId ? (
        <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('comments.studioPlaceholder')} className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none" />
          <button type="submit" className="rounded-xl bg-blue-700 px-4 text-sm text-white">{t('comments.send')}</button>
        </form>
      ) : (
        <p className="mb-4 text-sm text-white/60">{t('comments.loginRequired')}</p>
      )}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-white/50">{t('comments.empty')}</p>
        ) : (
          comments.map((c) => (
            <CommentItem key={c.id} comment={c} userId={userId} isStudioOwner={isStudioOwner} studioId={studioId} studioOwnerId={studioOwnerId} onUpdate={onUpdate} />
          ))
        )}
      </div>
    </section>
  );
}
