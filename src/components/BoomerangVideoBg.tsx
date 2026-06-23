import { useEffect, useRef, useState } from 'react';

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260611_183632_c311af08-e4b7-458f-81e7-79847a49b3d3.mp4';

const MAX_WIDTH = 960;
const FPS = 30;

type RvfcCallback = (now: DOMHighResTimeStamp, metadata: { mediaTime: number }) => void;

interface VideoRVFC {
  requestVideoFrameCallback(cb: RvfcCallback): number;
  cancelVideoFrameCallback(id: number): void;
}

function hasRVFC(el: HTMLVideoElement): el is HTMLVideoElement & VideoRVFC {
  return typeof (el as unknown as VideoRVFC).requestVideoFrameCallback === 'function';
}

export default function BoomerangVideoBg() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const framesRef = useRef<ImageData[]>([]);
  const rafRef = useRef<number>(0);
  const rvfcIdRef = useRef<number>(0);
  const frameIndexRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);
  const lastFrameTimeRef = useRef(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  // Resolve canvas dimensions once metadata is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const ratio = video.videoHeight / video.videoWidth;
      const w = Math.min(video.videoWidth, MAX_WIDTH);
      const h = Math.round(w * ratio);
      setDimensions({ w, h });

      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      offscreenRef.current = offscreen;
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, []);

  // Capture frames while video plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video || dimensions.w === 0) return;

    const offscreen = offscreenRef.current;
    if (!offscreen) return;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let rafCaptureId = 0;

    const captureFrame = () => {
      if (video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
      framesRef.current.push(ctx.getImageData(0, 0, offscreen.width, offscreen.height));
    };

    if (hasRVFC(video)) {
      const rvfcLoop: RvfcCallback = () => {
        captureFrame();
        rvfcIdRef.current = (video as HTMLVideoElement & VideoRVFC).requestVideoFrameCallback(rvfcLoop);
      };
      rvfcIdRef.current = (video as HTMLVideoElement & VideoRVFC).requestVideoFrameCallback(rvfcLoop);
    } else {
      const rafLoop = () => {
        captureFrame();
        rafCaptureId = requestAnimationFrame(rafLoop);
      };
      rafCaptureId = requestAnimationFrame(rafLoop);
    }

    const handleEnded = () => {
      if (hasRVFC(video)) {
        (video as HTMLVideoElement & VideoRVFC).cancelVideoFrameCallback(rvfcIdRef.current);
      } else {
        cancelAnimationFrame(rafCaptureId);
      }
      setVideoEnded(true);
    };

    video.addEventListener('ended', handleEnded);
    video.play().catch(() => {});

    return () => {
      video.removeEventListener('ended', handleEnded);
      if (hasRVFC(video)) {
        (video as HTMLVideoElement & VideoRVFC).cancelVideoFrameCallback(rvfcIdRef.current);
      } else {
        cancelAnimationFrame(rafCaptureId);
      }
    };
  }, [dimensions]);

  // Ping-pong playback
  useEffect(() => {
    if (!videoEnded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frames = framesRef.current;
    if (frames.length === 0) return;

    const interval = 1000 / FPS;

    const tick = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= interval) {
        lastFrameTimeRef.current = timestamp;

        const frame = frames[frameIndexRef.current];
        if (frame) ctx.putImageData(frame, 0, 0);

        frameIndexRef.current += directionRef.current;

        if (frameIndexRef.current >= frames.length - 1) {
          frameIndexRef.current = frames.length - 1;
          directionRef.current = -1;
        } else if (frameIndexRef.current <= 0) {
          frameIndexRef.current = 0;
          directionRef.current = 1;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoEnded]);

  return (
    <div className="absolute inset-0 z-0 scale-[1.08] origin-center overflow-hidden">
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        crossOrigin="anonymous"
        preload="auto"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          videoEnded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />

      {videoEnded && dimensions.w > 0 && (
        <canvas
          ref={canvasRef}
          width={dimensions.w}
          height={dimensions.h}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
}
