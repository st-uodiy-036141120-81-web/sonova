import { useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { uploadFile } from '../lib/storage';
import { sendVoiceMessage } from '../lib/platformApi';

interface VoiceRecorderProps {
  senderId: string;
  receiverId: string;
  onSent?: () => void;
}

export default function VoiceRecorder({ senderId, receiverId, onSent }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => chunksRef.current.push(e.data);
    rec.onstop = async () => {
      setUploading(true);
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const url = await uploadFile('songs', `voice/${senderId}/${file.name}`, file);
        const duration = Math.round((Date.now() - startRef.current) / 1000);
        await sendVoiceMessage(senderId, receiverId, url, duration);
        onSent?.();
      } finally {
        setUploading(false);
        stream.getTracks().forEach((t) => t.stop());
      }
    };
    mediaRef.current = rec;
    startRef.current = Date.now();
    rec.start();
    setRecording(true);
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return (
    <button
      type="button"
      disabled={uploading}
      onClick={recording ? stop : start}
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/80 text-white"
    >
      {recording ? <Square size={14} /> : <Mic size={14} />}
    </button>
  );
}
