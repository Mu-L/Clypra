/**
 * SimpleProgramPreview - GPU-accelerated PixiRenderer-based preview
 *
 * This uses the SAME architecture as ComplexProgramPreview:
 * - PlaybackClock for time management
 * - syncPreviewMedia for video element management
 * - requestAnimationFrame render loop
 *
 * The ONLY difference: replaces CPU rasterizer with GPU PixiRenderer
 *
 * Architecture:
 * - Uses PixiRenderer directly (same as Transition Lab Console)
 * - GPU-accelerated WebGL rendering
 * - Proven timing and sync logic from ComplexProgramPreview
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { getSharedPixiRenderer } from "@/core/render/sharedPixiRenderer";
import { PixiRenderer } from "@clypra/engine";
import { useProjectStore } from "@/store/projectStore";
import { useTimelineStore } from "@/store/timelineStore";
import { getActiveSessionOrNull } from "@/core/runtime/ProjectSession";
import { usePlaybackClock, usePlaybackControls, useTransportControls, getPlaybackClock } from "@/hooks/usePlaybackClock";

export const SimpleProgramPreview: React.FC = () => {
  // =========================================================================
  // 1. SELECTORS & STATE (using same pattern as ComplexProgramPreview)
  // =========================================================================
  const project = useProjectStore((s) => s.project);
  const mediaAssets = useProjectStore((s) => s.mediaAssets);
  const clips = useTimelineStore((s) => s.clips);
  const tracks = useTimelineStore((s) => s.tracks);
  const epoch = useTimelineStore((s) => s.epoch);

  // =========================================================================
  // 2. PLAYBACK HOOKS (same as ComplexProgramPreview)
  // =========================================================================
  const clockState = usePlaybackClock();
  const clock = getPlaybackClock();
  const { seek, setDuration, setFrameRate } = usePlaybackControls();
  const { play: transportPlay, pause: transportPause, setActiveContext } = useTransportControls();

  // =========================================================================
  // 3. LOCAL STATE
  // =========================================================================
  const [fitMode, setFitMode] = useState<"stretch" | "fit" | "crop">("fit");
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);

  // =========================================================================
  // 4. REFS
  // =========================================================================
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixiRendererRef = useRef<PixiRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isMutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);

  // Sync refs
  isMutedRef.current = isMuted;
  volumeRef.current = volume;

  const renderStateRef = useRef({
    clips,
    tracks,
    mediaAssets,
    project,
    epoch,
    clock,
    clockState,
  });

  renderStateRef.current.clips = clips;
  renderStateRef.current.tracks = tracks;
  renderStateRef.current.mediaAssets = mediaAssets;
  renderStateRef.current.project = project;
  renderStateRef.current.epoch = epoch;
  renderStateRef.current.clock = clock;
  renderStateRef.current.clockState = clockState;

  // Use fixed canvas dimensions like Transition Lab (16:9 landscape)
  const renderWidth = 1280;
  const renderHeight = 720;

  // =========================================================================
  // 5. SET ACTIVE TRANSPORT CONTEXT (same as ComplexProgramPreview)
  // =========================================================================
  useEffect(() => {
    setActiveContext("program");
  }, [setActiveContext]);

  // =========================================================================
  // 6. INITIALIZE PIXIRENDERER (async wait pattern)
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;



    let isActive = true;

    const renderer = getSharedPixiRenderer(canvas, renderWidth, renderHeight);

    const waitForInit = async () => {
      if (renderer.isReady) {
        if (isActive) {
          canvas.style.width = "100%";
          canvas.style.height = "100%";
          pixiRendererRef.current = renderer;
        }
        return;
      }

      const startTime = Date.now();
      while (!renderer.isReady && Date.now() - startTime < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (isActive && renderer.isReady) {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        pixiRendererRef.current = renderer;
      } else if (isActive) {
        console.error("[SimpleProgramPreview] PixiRenderer initialization timeout");
      }
    };

    void waitForInit();

    return () => {
      isActive = false;
    };
  }, [renderWidth, renderHeight]);

  // =========================================================================
  // 7. SYNC DURATION & FRAMERATE (same as ComplexProgramPreview)
  // =========================================================================
  useEffect(() => {
    const duration = project?.duration ?? 10;
    const frameRate = project?.frameRate ?? 30;
    setDuration(duration);
    setFrameRate(frameRate);
  }, [project?.duration, project?.frameRate, setDuration, setFrameRate]);

  // =========================================================================
  // 8. MAIN RENDER LOOP (ported from ComplexProgramPreview)
  // =========================================================================
  useEffect(() => {
    const renderer = pixiRendererRef.current;
    if (!renderer || !renderer.isReady) return;

    let isActive = true;

    const render = () => {
      if (!isActive) return;

      const state = renderStateRef.current;
      const currentTime = state.clockState.time;
      const isPlaying = state.clockState.state === "playing";

      // Sync preview media (SAME as ComplexProgramPreview)
      const session = getActiveSessionOrNull();
      if (session) {
        try {
          session.syncPreviewMedia(state.clips, state.mediaAssets, state.tracks, {
            time: currentTime,
            state: isPlaying ? "playing" : "paused",
            speed: state.clockState.speed,
            muted: isMutedRef.current,
            volume: volumeRef.current,
            frameRate: state.project?.frameRate ?? 30,
          });
        } catch (error) {
          console.error("[SimpleProgramPreview] syncPreviewMedia error:", error);
        }
      }

      // Find active video clip (SAME logic as ComplexProgramPreview)
      const videoTracks = state.tracks.filter((t) => t.type === "video" && (t.visible ?? true));
      const videoTrackIds = new Set(videoTracks.map((t) => t.id));

      const activeClips = state.clips
        .filter((c) => c.kind === "video" && videoTrackIds.has(c.trackId))
        .filter((c) => c.startTime <= currentTime && currentTime < c.startTime + c.duration)
        .sort((a, b) => {
          const trackAIndex = videoTracks.findIndex((t) => t.id === a.trackId);
          const trackBIndex = videoTracks.findIndex((t) => t.id === b.trackId);
          return trackAIndex - trackBIndex;
        });

      const activeClip = activeClips[0];

      // Get video element from session
      let videoElement: HTMLVideoElement | null = null;
      if (session && activeClip) {
        const videoElements = session.getPreviewVideoElements();
        const key = `${activeClip.id}-${activeClip.mediaId}`;
        videoElement = videoElements.get(key) ?? null;
      }

      // Render with PixiRenderer (GPU path)
      renderer.setFitMode(fitMode);

      if (videoElement && videoElement.readyState > 2) {
        renderer.setVideoSource(videoElement);
      }

      renderer.render();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isActive = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [fitMode]); // Only depend on fitMode, everything else via refs

  // =========================================================================
  // 9. EVENT HANDLERS
  // =========================================================================
  const togglePlay = useCallback(() => {
    if (clockState.state === "playing") {
      transportPause();
    } else {
      transportPlay();
    }
  }, [clockState.state, transportPlay, transportPause]);

  const skipBackward = useCallback(() => {
    seek(Math.max(0, clockState.time - 5));
  }, [clockState.time, seek]);

  const skipForward = useCallback(() => {
    seek(clockState.time + 5);
  }, [clockState.time, seek]);

  const cycleFitMode = useCallback(() => {
    setFitMode((prev) => {
      if (prev === "fit") return "crop";
      if (prev === "crop") return "stretch";
      return "fit";
    });
  }, []);

  const handleTimelineScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = parseFloat(e.target.value);
      seek(newTime);
    },
    [seek],
  );

  // =========================================================================
  // 10. RENDER UI
  // =========================================================================
  const isPlaying = clockState.state === "playing";
  const currentTime = clockState.time;
  const duration = project?.duration ?? 10;

  return (
    <div className="flex flex-col w-full h-full bg-bg-base">
      {/* Canvas Container */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <canvas ref={canvasRef} width={renderWidth} height={renderHeight} className="w-full h-full object-contain" />

        {/* Debug Overlay */}
        <div className="absolute top-4 left-4 bg-black/80 text-white px-4 py-2 rounded font-mono text-sm">
          <div>Time: {currentTime.toFixed(2)}s</div>
          <div>Mode: {fitMode}</div>
          <div>
            Render: {renderWidth}x{renderHeight}
          </div>
          <div>Clips: {clips.length}</div>
          <div>State: {clockState.state}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-4 bg-bg-elevated border-t border-border-subtle">
        <button onClick={skipBackward} className="p-2 rounded hover:bg-bg-hover transition-colors" title="Skip backward 5s">
          <SkipBack className="w-5 h-5" />
        </button>

        <button onClick={togglePlay} className="p-3 rounded-full bg-accent-primary hover:bg-accent-primary-hover transition-colors" title={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>

        <button onClick={skipForward} className="p-2 rounded hover:bg-bg-hover transition-colors" title="Skip forward 5s">
          <SkipForward className="w-5 h-5" />
        </button>

        <div className="mx-4 h-6 w-px bg-border-subtle" />

        <button onClick={cycleFitMode} className="px-4 py-2 rounded bg-bg-subtle hover:bg-bg-hover transition-colors text-sm" title="Cycle fit mode">
          {fitMode === "fit" ? "Fit (Letterbox)" : fitMode === "crop" ? "Cover (Crop)" : "Stretch"}
        </button>
      </div>

      {/* Simple Timeline Scrubber */}
      <div className="px-4 py-2 bg-bg-elevated border-t border-border-subtle">
        <input type="range" min={0} max={duration} step={0.01} value={currentTime} onChange={handleTimelineScrub} className="w-full" />
      </div>
    </div>
  );
};
