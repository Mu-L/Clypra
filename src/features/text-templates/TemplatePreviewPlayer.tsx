import React, {
  useEffect, useRef, useImperativeHandle,
  forwardRef, useState
} from 'react';

export interface TemplatePreviewPlayerHandle {
  play:        () => void;
  pause:       () => void;
  stop:        () => void;
  goToFrame:   (frame: number) => void;
  getAnimation: () => any;
}

export interface TemplatePreviewPlayerProps {
  lottieData:   any | null; // Represents TextTemplate payload
  autoplay?:    boolean;
  loop?:        boolean;
  speed?:       number;
  initialFrame?: number;
  width?:       number | string;
  height?:      number | string;
  onReady?:     () => void;
  onComplete?:  () => void;
  onError?:     (error: string) => void;
  className?:   string;
  onFrameChange?: (currentFrame: number, totalFrames: number) => void;
}

export const TemplatePreviewPlayer = forwardRef<TemplatePreviewPlayerHandle, TemplatePreviewPlayerProps>(
  ({
    lottieData: template,
    autoplay  = true,
    loop      = true,
    speed     = 1,
    initialFrame,
    width     = '100%',
    height    = '100%',
    onReady,
    onComplete,
    onError,
    className,
    onFrameChange,
  }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(autoplay);

    const onReadyRef = useRef(onReady);
    const onCompleteRef = useRef(onComplete);
    const onFrameChangeRef = useRef(onFrameChange);

    useEffect(() => {
      onReadyRef.current = onReady;
      onCompleteRef.current = onComplete;
      onFrameChangeRef.current = onFrameChange;
    });

    // Expose Lottie player compatible controller handles
    useImperativeHandle(ref, () => ({
      play: () => {
        setIsPlaying(true);
      },
      pause: () => {
        setIsPlaying(false);
      },
      stop: () => {
        setIsPlaying(false);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
        }
      },
      goToFrame: (frame: number) => {
        setIsPlaying(false);
        if (template && videoRef.current) {
          const fps = template.fps || 30;
          videoRef.current.currentTime = frame / fps;
        }
      },
      getAnimation: () => ({
        totalFrames: template ? Math.round((template.duration || 4) * (template.fps || 30)) : 0,
        frameRate: template?.fps || 30,
        isLoaded: !!template,
      }),
    }));

    // Trigger ready callback on mount if data is present
    useEffect(() => {
      if (template && videoRef.current) {
        onReadyRef.current?.();
      }
    }, [template]);

    // Apply speed
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.playbackRate = speed;
      }
    }, [speed]);

    // Control video playback based on isPlaying state
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      if (isPlaying) {
        video.play().catch((err) => {
          console.warn("Video play failed:", err);
        });
      } else {
        video.pause();
      }
    }, [isPlaying]);

    // Apply initial frame once template is loaded
    useEffect(() => {
      if (template && initialFrame !== undefined && videoRef.current) {
        const fps = template.fps || 30;
        videoRef.current.currentTime = initialFrame / fps;
      }
    }, [template, initialFrame]);

    if (!template) {
      return (
        <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666677', fontSize: 12 }}>
          No template loaded
        </div>
      );
    }

    const previewUrl =
      template.preview ||
      `https://clypra-worker-api.abdulkabirmusa.com/media/text-templates/${template.category}/${template.id}.webm`;

    return (
      <div className={className} style={{ position: 'relative', width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          src={previewUrl}
          loop={loop}
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onLoadedData={() => {
            onReadyRef.current?.();
          }}
          onEnded={() => {
            if (!loop) {
              setIsPlaying(false);
              onCompleteRef.current?.();
            }
          }}
          onTimeUpdate={() => {
            const video = videoRef.current;
            if (video && template) {
              const fps = template.fps || 30;
              const totalFrames = Math.round((template.duration || 4) * fps);
              const currentFrame = Math.round(video.currentTime * fps);
              onFrameChangeRef.current?.(currentFrame, totalFrames);
            }
          }}
        />
      </div>
    );
  }
);

TemplatePreviewPlayer.displayName = 'TemplatePreviewPlayer';
export default TemplatePreviewPlayer;
