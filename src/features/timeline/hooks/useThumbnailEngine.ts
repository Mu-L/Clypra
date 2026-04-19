import { useEffect, useState, useRef, useMemo } from "react";
import { getThumbnailEngine, THUMBNAIL_WIDTH } from "../utils/ThumbnailEngine";
import { useTimelineStore } from "../store/timelineStore";

interface Thumbnail {
  time: number;
  dataUrl: string;
  x: number; // Absolute x position relative to viewport
}

interface UseThumbnailEngineOptions {
  videoPath: string;
  clipStartTime: number;
  clipEndTime: number;
  viewportWidth?: number; // Actual viewport width in pixels
}

/**
 * Hook for CapCut-style thumbnail generation
 *
 * Core principle: Global time-grid sampling with absolute positioning
 * - timePerThumb = 80 / pxPerSec (global, not per-clip)
 * - Thumbnails sampled at aligned time intervals
 * - Each thumbnail has absolute x position: x = (time - visibleStart) / timePerThumb * 80
 * - Thumbnails are positioned absolutely within clip, no stretching
 */
export function useThumbnailEngine(options: UseThumbnailEngineOptions) {
  const { videoPath, clipStartTime, clipEndTime, viewportWidth = 2000 } = options;
  const pxPerSec = useTimelineStore((state) => state.pxPerSec);
  const scrollLeft = useTimelineStore((state) => state.scrollLeft);

  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const engineRef = useRef(getThumbnailEngine());
  const prevCountRef = useRef(0);

  // Calculate global time per thumbnail
  const timePerThumb = useMemo(() => {
    return THUMBNAIL_WIDTH / pxPerSec;
  }, [pxPerSec]);

  // Generate thumbnails when zoom or scroll changes
  useEffect(() => {
    if (!videoPath) return;

    const engine = engineRef.current;
    let cancelled = false;

    // Debounce generation for smooth scrolling
    const timeoutId = setTimeout(async () => {
      setLoading(true);

      try {
        // Generate thumbnails with global time-grid sampling
        const results = await engine.generateThumbnails(videoPath, clipStartTime, clipEndTime, pxPerSec, scrollLeft, viewportWidth);

        if (!cancelled) {
          setThumbnails(results);
          prevCountRef.current = results.length;
        }
      } catch (error) {
        console.error("[useThumbnailEngine] Generation failed:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [videoPath, clipStartTime, clipEndTime, pxPerSec, scrollLeft, viewportWidth, timePerThumb]);

  return {
    thumbnails,
    loading,
    timePerThumb,
    thumbnailWidth: THUMBNAIL_WIDTH,
    thumbCount: thumbnails.length,
  };
}
