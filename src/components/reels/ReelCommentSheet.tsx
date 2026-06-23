import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Mic, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Song, SongComment } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { fetchSongComments, addSongComment } from '../../lib/api';
import { addAudioSongComment } from '../../lib/reelsFeatures/api';
import { uploadFile } from '../../lib/storage';

interface ReelCommentSheetProps {
  song: Song;
  open: boolean;
  onClose: () => void;
  onCountChange: (n: number) => void;
}

export default function ReelCommentSheet({ song, open, onClose, onCountChange }: ReelCommentSheetProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [comments, setComments] = useState<SongComment[]>([]);
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchSongComments(song.id).then((c) => {
      setComments(c as SongComment[]);
      onCountChange(c.length);
    });
  }, [open, song.id, onCountChange]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const ownerId = song.studio?.owner_id;
    await addSongComment(song.id, user.id, text.trim(), ownerId);
    setText('');
    const updated = await fetchSongComments(song.id);
    setComments(updated as SongComment[]);
    onCountChange(updated.length);
  };

  const startRecording = async () => {
    if (!user || recording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => chunksRef.current.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], 'comment.webm', { type: 'audio/webm' });
      const url = await uploadFile('songs', `comments/${user.id}/${Date.now()}.webm`, file);
      await addAudioSongComment(song.id, user.id, url, song.studio?.owner_id);
      const updated = await fetchSongComments(song.id);
      setComments(updated as SongComment[]);
      onCountChange(updated.length);
    };
    mediaRef.current = rec;
    rec.start();
    setRecording(true);
    setTimeout(() => {
      if (mediaRef.current?.state === 'recording') {
        mediaRef.current.stop();
        setRecording(false);
      }
    }, 8000);
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="reels-sheet max-h-[55vh] rounded-t-3xl bg-[#121218]/95 p-4 pb-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">{t('reels.comments')} ({comments.length})</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-white/60 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <div className="mb-3 max-h-[32vh] space-y-3 overflow-y-auto overscroll-contain">
          {comments.length === 0 ? (
            <p className="text-center text-xs text-white/50">{t('reels.noComments')}</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <span className="shrink-0 text-xs text-blue-400">@{c.author?.username}</span>
                {c.is_audio && c.audio_url ? (
                  <audio src={c.audio_url} controls className="h-8 max-w-[200px]" />
                ) : (
                  <p className="text-sm text-white/90">{c.content}</p>
                )}
              </div>
            ))
          )}
        </div>
        {user ? (
          <form onSubmit={submit} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('reels.commentPlaceholder')}
              className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
            />
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={`rounded-xl px-3 ${recording ? 'bg-red-600' : 'bg-white/10'} text-white`}
            >
              {recording ? <Square size={16} /> : <Mic size={16} />}
            </button>
            <button type="submit" className="rounded-xl bg-blue-700 px-4 text-sm text-white">{t('messages.send')}</button>
          </form>
        ) : (
          <Link to="/login" className="block text-center text-sm text-blue-400">{t('nav.login')}</Link>
        )}
      </div>
    </div>
  );
}
