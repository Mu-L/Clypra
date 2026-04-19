/**
 * TimelineContainer - Main container component that wires all timeline components together
 *
 * This component serves as the integration point for:
 * - Timeline store state management
 * - Keyboard shortcuts
 * - Playhead synchronization with video player
 * - Canvas-based video preview (CanvasRenderer)
 * - All child timeline components
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COLORS } from "../../../constants/colors";
import { VIDEO_CONFIG } from "../../../constants/config";
import { clamp } from "../../../lib/utils";
import { CoordinateSystem } from "../utils/coordinateSystem";
import { useTimelineStore } from "../store/timelineStore";
import { useTimelineKeyboardShortcuts, type ToolMode } from "../hooks/useTimelineKeyboardShortcuts";
import { TimelineToolbar } from "./TimelineToolbar";
import { TimelineTrackHeaders } from "./TimelineTrackHeaders";
import { TimeRuler } from "./TimeRuler";
import { ScreenReaderAnnouncer } from "./ScreenReaderAnnouncer";
import { TimelineTracks } from "./TimelineTracks";
import { Playhead } from "./Playhead";

export interface TimelineContainerProps {
  /** Video duration in seconds */
  duration: number;
  /** Current playhead position in seconds */
  playhead: number;
  /** Callback to seek video to a specific time */
  onSeek: (time: number) => void;
  /** @deprecated Not used with store-based timeline */
  trimStart?: number;
  /** @deprecated Not used with store-based timeline */
  trimEnd?: number;
  /** @deprecated Not used with store-based timeline */
  videoUrl?: string | null;
  /** @deprecated Not used with store-based timeline */
  sourcePath?: string | null;
  /** @deprecated Not used with store-based timeline */
  videoRef?: React.RefObject<HTMLVideoElement>;
}

/**
 * TimelineContainer component
 *
 * Integrates all timeline components and manages:
 * - Store state synchronization
 * - Keyboard shortcuts
 */
export function TimelineContainer({ duration, playhead, onSeek, trimStart: _trimStart, trimEnd: _trimEnd, videoUrl: _videoUrl, sourcePath: _sourcePath, videoRef: _videoRef }: TimelineContainerProps) {
  const [toolMode, setToolMode] = useState<ToolMode>("selection");
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [pxPerSec, setPxPerSec] = useState(VIDEO_CONFIG.ZOOM.DEFAULT_PX_PER_SEC);
  const [snapMain, setSnapMain] = useState(true);
  const [snapAuto, setSnapAuto] = useState(true);
  const [snapLink, setSnapLink] = useState(true);

  const pxPerSecRef = useRef(pxPerSec);
  pxPerSecRef.current = pxPerSec;

  // Create coordinate system for Playhead component
  const coords = useMemo(() => new CoordinateSystem(pxPerSec), [pxPerSec]);
  const { tracks, addTrack, setPlayhead: setStorePlayhead, setZoom, setScroll, setIsPlaying, isPlaying, playhead: storePlayhead } = useTimelineStore();

  // Create a stable play/pause toggle handler
  const handlePlayPauseToggle = useCallback(() => {
    const currentIsPlaying = useTimelineStore.getState().isPlaying;
    setIsPlaying(!currentIsPlaying);
  }, [setIsPlaying]);

  useTimelineKeyboardShortcuts({
    onPlayPauseToggle: handlePlayPauseToggle,
    toolMode,
    onToolModeChange: setToolMode,
    fps: VIDEO_CONFIG.FPS,
  });

  // Only sync when NOT playing (during playback, CanvasRenderer controls the playhead)
  useEffect(() => {
    if (!isPlaying) {
      setStorePlayhead(playhead);
    }
  }, [playhead, setStorePlayhead, isPlaying]);

  // Sync external playhead prop when store playhead changes during playback
  useEffect(() => {
    if (isPlaying && storePlayhead !== playhead) {
      onSeek(storePlayhead);
    }
  }, [storePlayhead, isPlaying, playhead, onSeek]);

  useEffect(() => {
    setZoom(pxPerSec);
  }, [pxPerSec, setZoom]);

  // Initialize sample tracks when video is loaded
  useEffect(() => {
    if (duration > 0 && tracks.size === 0) {
      // Add a text/captions track
      addTrack({
        id: "track-text-1",
        name: "Captions",
        type: "text",
        order: 0,
        height: 36,
        locked: false,
        visible: true,
        muted: false,
        color: "#ea580c",
      });

      // Add a video track
      addTrack({
        id: "track-video-1",
        name: "Main Video",
        type: "video",
        order: 1,
        height: 148,
        locked: false,
        visible: true,
        muted: false,
        color: "#1e40af",
      });
    }
  }, [duration, tracks.size, addTrack]);

  /** Timeline width in px — maps 1:1 to duration at current zoom. */
  const contentW = useMemo(() => {
    if (duration <= 0) return 400;
    return Math.max(120, duration * pxPerSec);
  }, [duration, pxPerSec]);

  /**
   * Handle click/drag on timeline to seek
   */
  const onTimelinePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (duration <= 0) return;
      if (e.button !== 0) return;

      // Pause if playing
      if (isPlaying) {
        setIsPlaying(false);
      }

      // Calculate time from click position
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const t = clamp(x / pxPerSec, 0, duration);
      setStorePlayhead(t);

      const move = (ev: PointerEvent) => {
        const moveX = ev.clientX - rect.left;
        const moveT = clamp(moveX / pxPerSec, 0, duration);
        setStorePlayhead(moveT);
      };

      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [duration, isPlaying, pxPerSec, setIsPlaying, setStorePlayhead],
  );

  /** Trackpad pinch zoom (Chrome / WebKit: wheel + ctrl). Zooms toward cursor; keeps time under pointer stable. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      // Get cursor position relative to scroll container
      const rect = el.getBoundingClientRect();
      const cursorX = clamp(e.clientX - rect.left, 0, rect.width);

      const factor = Math.exp(-e.deltaY * 0.009);

      const coords = new CoordinateSystem(pxPerSecRef.current);
      const { newPxPerSec, newScrollLeft } = coords.zoomToCursor(cursorX, el.scrollLeft, factor, VIDEO_CONFIG.ZOOM.MIN_PX_PER_SEC, VIDEO_CONFIG.ZOOM.MAX_PX_PER_SEC);

      // Update zoom level
      setPxPerSec(newPxPerSec);

      requestAnimationFrame(() => {
        const sc = scrollRef.current;
        if (!sc) return;
        sc.scrollLeft = clamp(newScrollLeft, 0, Math.max(0, sc.scrollWidth - sc.clientWidth));
        setScrollLeft(sc.scrollLeft);
        setScroll(sc.scrollLeft, sc.scrollTop);
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [duration, setScroll]);

  const onScrollPaneScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      setScrollLeft(el.scrollLeft);
      setScroll(el.scrollLeft, el.scrollTop);
    }
  }, [setScroll]);

  const debouncedScroll = useMemo(() => {
    let timeoutId: number | null = null;
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      // Immediate update for scroll position (for playhead visibility)
      const el = scrollRef.current;
      if (el) {
        setScrollLeft(el.scrollLeft);
      }
      // Debounced update for store (reduces render frequency)
      timeoutId = window.setTimeout(() => {
        onScrollPaneScroll();
      }, 16); // ~60fps
    };
  }, [onScrollPaneScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || duration <= 0) return;
    const x = playhead * pxPerSec;
    const vis = el.clientWidth;
    const left = el.scrollLeft;
    const margin = vis * 0.15;
    if (x < left + margin || x > left + vis - margin) {
      el.scrollLeft = clamp(x - vis / 2, 0, Math.max(0, el.scrollWidth - vis));
    }
  }, [playhead, pxPerSec, duration]);

  /** Keep overlay playhead aligned after zoom / layout. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) setScrollLeft(el.scrollLeft);
  }, [pxPerSec, contentW]);

  useEffect(() => {
    if (duration <= 0) return;
    const el = scrollRef.current;
    if (el) setScrollLeft(el.scrollLeft);
  }, [duration]);

  if (duration <= 0) {
    return (
      <div className="flex flex-1 flex-col rounded-lg border" style={{ backgroundColor: COLORS.BG, borderColor: COLORS.BORDER }}>
        <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-zinc-500">Import a video to see the CapCut-style timeline (ruler, tracks, filmstrip, waveform).</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border overflow-x-visible overflow-y-hidden" style={{ backgroundColor: COLORS.BG, borderColor: COLORS.BORDER }} role="region" aria-label="Video timeline editor">
      {/* Screen reader announcements */}
      <ScreenReaderAnnouncer />

      <TimelineToolbar snapMain={snapMain} snapAuto={snapAuto} snapLink={snapLink} pxPerSec={pxPerSec} isPlaying={isPlaying} onPlayPauseToggle={handlePlayPauseToggle} onSnapMainToggle={() => setSnapMain((v) => !v)} onSnapAutoToggle={() => setSnapAuto((v) => !v)} onSnapLinkToggle={() => setSnapLink((v) => !v)} onZoomChange={setPxPerSec} minZoom={VIDEO_CONFIG.ZOOM.MIN_PX_PER_SEC} maxZoom={VIDEO_CONFIG.ZOOM.MAX_PX_PER_SEC} />

      <div className="flex min-h-0 flex-1">
        <TimelineTrackHeaders />

        {/* Scroll viewport + playhead overlay */}
        <div className="relative min-h-0 flex-1 overflow-x-visible overflow-y-hidden">
          <div ref={scrollRef} onScroll={debouncedScroll} className="min-h-0 h-full overflow-x-auto overflow-y-auto" style={{ backgroundColor: COLORS.BG }} data-timeline-scroll-area role="application" aria-label="Timeline tracks and clips">
            <div ref={timelineContentRef} className="relative cursor-ew-resize" style={{ width: contentW, minHeight: 168 }} onPointerDown={onTimelinePointerDown} role="group" aria-label="Timeline content area">
              {/* Ruler */}
              <TimeRuler duration={duration} pxPerSec={pxPerSec} fps={VIDEO_CONFIG.FPS} />

              {/* Tracks from store - using proper component hierarchy */}
              <TimelineTracks pxPerSec={pxPerSec} scrollLeft={scrollLeft} viewportWidth={scrollRef.current?.clientWidth || 800} contentWidth={contentW} />
            </div>
          </div>

          {/* Playhead - using proper component with click/drag handling */}
          <Playhead coords={coords} scrollLeft={scrollLeft} />
        </div>
      </div>
    </div>
  );
}
