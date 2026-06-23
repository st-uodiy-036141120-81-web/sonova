import { useEffect, useState } from 'react';
import { fetchPollForComment, votePoll } from '../lib/platformApi';
import { useAuth } from '../context/AuthContext';
import type { CommentPoll } from '../lib/types';

interface PollWidgetProps {
  commentId: string;
}

export default function PollWidget({ commentId }: PollWidgetProps) {
  const { user } = useAuth();
  const [poll, setPoll] = useState<CommentPoll | null>(null);

  useEffect(() => {
    fetchPollForComment(commentId).then(setPoll);
  }, [commentId]);

  if (!poll) return null;

  const options = poll.options as string[];
  const votes = poll.votes ?? {};
  const total = Object.keys(votes).length || 1;

  const vote = async (idx: number) => {
    if (!user) return;
    await votePoll(poll.id, user.id, idx);
    setPoll({ ...poll, votes: { ...votes, [user.id]: idx } });
  };

  return (
    <div className="mt-2 rounded-xl bg-white/5 p-3">
      <p className="text-xs text-[var(--text-primary)]">{poll.question}</p>
      <div className="mt-2 space-y-1">
        {options.map((opt, i) => {
          const count = Object.values(votes).filter((v) => v === i).length;
          const pct = Math.round((count / total) * 100);
          return (
            <button key={i} type="button" onClick={() => vote(i)} className="relative w-full overflow-hidden rounded-lg bg-white/10 px-3 py-1.5 text-start text-xs text-[var(--text-primary)]">
              <span className="absolute inset-y-0 left-0 bg-blue-700/30" style={{ width: `${pct}%` }} />
              <span className="relative">{opt} ({pct}%)</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
