import { useEffect, useState } from 'react';
import { UserPlus, UserMinus, Ban, ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { followUser, unfollowUser, blockUser, unblockUser, isFollowing, isBlocked } from '../lib/api';

interface FollowBlockButtonsProps {
  viewerId: string | undefined;
  targetId: string;
  viewerUsername: string;
  isSelf: boolean;
}

export default function FollowBlockButtons({
  viewerId,
  targetId,
  viewerUsername,
  isSelf,
}: FollowBlockButtonsProps) {
  const { t } = useTranslation();
  const [following, setFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!viewerId || isSelf) return;
    Promise.all([isFollowing(viewerId, targetId), isBlocked(viewerId, targetId)]).then(([f, b]) => {
      setFollowing(f);
      setBlocked(b);
    });
  }, [viewerId, targetId, isSelf]);

  if (!viewerId || isSelf) return null;

  const toggleFollow = async () => {
    setLoading(true);
    try {
      if (following) {
        await unfollowUser(viewerId, targetId);
        setFollowing(false);
      } else {
        await followUser(viewerId, targetId, viewerUsername);
        setFollowing(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async () => {
    if (!confirm(blocked ? t('follow.confirmUnblock') : t('follow.confirmBlock'))) return;
    setLoading(true);
    try {
      if (blocked) {
        await unblockUser(viewerId, targetId);
        setBlocked(false);
      } else {
        await blockUser(viewerId, targetId);
        setBlocked(true);
        setFollowing(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!blocked && (
        <button
          type="button"
          disabled={loading}
          onClick={toggleFollow}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-transform duration-200 hover:scale-105 active:scale-95 ${
            following ? 'liquid-glass text-white' : 'bg-white text-gray-900'
          }`}
        >
          {following ? <UserMinus size={14} /> : <UserPlus size={14} />}
          {following ? t('follow.unfollow') : t('follow.follow')}
        </button>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={toggleBlock}
        className="liquid-glass flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-red-200 transition-transform duration-200 hover:scale-105"
      >
        {blocked ? <ShieldOff size={14} /> : <Ban size={14} />}
        {blocked ? t('follow.unblock') : t('follow.block')}
      </button>
    </div>
  );
}
