import { extractFrameAtTime } from "../../../lib/tauri";

/**
 * Fixed thumbnail dimensions (CapCut-style)
 * Thumbnails are always 80px wide on screen regardless of zoom
 */
export const THUMBNAIL_WIDTH = 80;
export const THUMBNAIL_HEIGHT = 60;

/**
 * Cached frame data - keyed by timestamp (seconds)
 */
interface CachedFrame {
  time: number;
  dataUrl: string;
  timestamp: number; // cache timestamp
}

/**
 * Cache for a specific video
 */
interface VideoCache {
  frames: Map<number, CachedFrame>; // time -> frame
  lastAccessed: number;
}

/**
 * ThumbnailEngine - Manages time-sampled frame extraction with multi-resolution caching
 *
 * Core principle: Global time-grid sampling with fixed thumbnail width
 * - Thumbnail width is CONSTANT (80px)
 * - Time per thumbnail varies with zoom: timePerThumb = 80 / pxPerSec
 * - Thumbnails are sampled at global time intervals aligned to a grid
 * - Each thumbnail is positioned absolutely by its time value
 */
export class ThumbnailEngine {
  private cache = new Map<string, VideoCache>(); // videoPath -> VideoCache
  private maxCacheSize = 500; // max frames per video
  private abortControllers = new Map<string, AbortController>();

  /**
   * Get or create cache entry for video
   */
  private getVideoCache(videoPath: string): VideoCache {
    if (!this.cache.has(videoPath)) {
      this.cache.set(videoPath, {
        frames: new Map(),
        lastAccessed: Date.now(),
      });
    }
    return this.cache.get(videoPath)!;
  }

  /**
   * Calculate time per thumbnail based on zoom level
   * CapCut: timePerThumb = THUMB_WIDTH / pxPerSec
   * This gives the time interval needed for 80px at current zoom
   */
  calculateTimePerThumbnail(pxPerSec: number): number {
    return THUMBNAIL_WIDTH / pxPerSec;
  }

  /**
   * Generate timestamps on a global time grid aligned to timePerThumb intervals
   *
   * This ensures:
   * - Thumbnails align to a global grid (no jitter when scrolling)
   * - Consistent sampling density across all clips
   * - Can overdraw beyond clip bounds for smooth edges
   *
   * @param visibleStart - Global visible start time in seconds
   * @param visibleEnd - Global visible end time in seconds
   * @param timePerThumb - Time interval between thumbnails (from calculateTimePerThumbnail)
   * @param _clipStart - Clip start time (for filtering)
   * @param _clipEnd - Clip end time (for filtering)
   * @returns Array of timestamp objects with time and x position
   */
  generateTimestampGrid(visibleStart: number, visibleEnd: number, timePerThumb: number, _clipStart: number, _clipEnd: number): Array<{ time: number; x: number }> {
    const timestamps: Array<{ time: number; x: number }> = [];

    // Align to global grid: find first thumbnail at or before visible start
    const firstThumbTime = Math.floor(visibleStart / timePerThumb) * timePerThumb;

    // Generate timestamps across visible range
    // Include thumbnails that overlap clip boundaries (overdraw for smooth edges)
    const bufferTime = timePerThumb; // One extra thumbnail worth of buffer
    const gridStart = firstThumbTime - bufferTime;
    const gridEnd = visibleEnd + bufferTime;

    for (let t = gridStart; t <= gridEnd; t += timePerThumb) {
      // Round to avoid floating point issues
      const time = Math.round(t * 1000) / 1000;

      // Calculate x position: x = (time - visibleStart) * pxPerSec
      // But we use timePerThumb to calculate position: x = (time - visibleStart) / timePerThumb * THUMB_WIDTH
      const x = ((time - visibleStart) / timePerThumb) * THUMBNAIL_WIDTH;

      timestamps.push({ time, x });
    }

    return timestamps;
  }

  /**
   * Generate thumbnails using global time-grid sampling (CapCut algorithm)
   *
   * Core principle:
   * - Global time per thumbnail: timePerThumb = 80 / pxPerSec
   * - Sample on aligned time grid for consistent positioning
   * - Thumbnails positioned absolutely by time value
   *
   * @param videoPath - Path to video file
   * @param clipStartTime - Clip start time in seconds
   * @param clipEndTime - Clip end time in seconds
   * @param pxPerSec - Pixels per second (zoom level)
   * @param scrollLeftPx - Horizontal scroll position in pixels
   * @param viewportWidthPx - Viewport/container width in pixels
   * @returns Array of { time, dataUrl, x } for absolute positioning
   */
  async generateThumbnails(videoPath: string, clipStartTime: number, clipEndTime: number, pxPerSec: number, scrollLeftPx: number, viewportWidthPx: number): Promise<Array<{ time: number; dataUrl: string; x: number }>> {
    const videoCache = this.getVideoCache(videoPath);
    videoCache.lastAccessed = Date.now();

    // Step 1: Calculate global time per thumbnail
    const timePerThumb = this.calculateTimePerThumbnail(pxPerSec);

    // Step 2: Calculate visible time range from pixel coordinates
    const visibleStartSec = scrollLeftPx / pxPerSec;
    const visibleEndSec = (scrollLeftPx + viewportWidthPx) / pxPerSec;

    // Step 3: Generate timestamp grid
    const timeGrid = this.generateTimestampGrid(visibleStartSec, visibleEndSec, timePerThumb, clipStartTime, clipEndTime);

    // Step 4: Filter to only times within clip bounds (but keep the calculated x positions)
    const clipTimePoints = timeGrid.filter((point) => point.time >= clipStartTime && point.time < clipEndTime);

    // If no thumbnails in clip bounds, return empty
    if (clipTimePoints.length === 0) {
      return [];
    }

    // Step 5: Abort any previous extraction for this video
    const cacheKey = `${videoPath}:${clipStartTime}:${clipEndTime}`;
    this.abortControllers.get(cacheKey)?.abort();
    const controller = new AbortController();
    this.abortControllers.set(cacheKey, controller);

    // Step 6: Check cache and collect missing times
    const results: Array<{ time: number; dataUrl: string; x: number }> = [];
    const missingItems: Array<{ time: number; x: number }> = [];

    for (const item of clipTimePoints) {
      const cached = videoCache.frames.get(item.time);
      if (cached && Date.now() - cached.timestamp < 300000) {
        // 5min cache validity
        results.push({ time: item.time, dataUrl: cached.dataUrl, x: item.x });
      } else {
        missingItems.push(item);
      }
    }

    // Step 7: Extract missing frames in parallel batches
    if (missingItems.length > 0 && !controller.signal.aborted) {
      const CONCURRENCY = 4;

      for (let i = 0; i < missingItems.length && !controller.signal.aborted; i += CONCURRENCY) {
        const batch = missingItems.slice(i, i + CONCURRENCY);

        const batchResults = await Promise.allSettled(
          batch.map(async (item) => {
            const frameData = await extractFrameAtTime(videoPath, item.time, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
            return { time: item.time, x: item.x, frameData };
          }),
        );

        for (const result of batchResults) {
          if (result.status === "fulfilled" && !controller.signal.aborted) {
            const { time, x, frameData } = result.value;
            videoCache.frames.set(time, {
              time,
              dataUrl: frameData,
              timestamp: Date.now(),
            });
            results.push({ time, dataUrl: frameData, x });
          } else if (result.status === "rejected") {
            console.error(`[ThumbnailEngine] Failed to extract frame:`, result.reason);
          }
        }

        this.evictIfNeeded(videoCache);
      }
    }

    // Sort by time
    results.sort((a, b) => a.time - b.time);
    return results;
  }

  /**
   * Evict oldest frames if cache exceeds max size
   */
  private evictIfNeeded(cache: { frames: Map<number, CachedFrame>; lastAccessed: number }) {
    if (cache.frames.size > this.maxCacheSize) {
      const entries = Array.from(cache.frames.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = Math.floor(this.maxCacheSize * 0.2);
      for (let i = 0; i < toRemove; i++) {
        cache.frames.delete(entries[i][0]);
      }
    }
  }

  /**
   * Clear cache for a video (e.g., when video is removed)
   */
  clearVideoCache(videoPath: string) {
    this.cache.delete(videoPath);
    const cacheKey = `${videoPath}:0:Infinity`;
    this.abortControllers.get(cacheKey)?.abort();
    this.abortControllers.delete(cacheKey);
  }

  /**
   * Clear all caches
   */
  dispose() {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
    this.cache.clear();
  }
}

// Singleton instance
let globalThumbnailEngine: ThumbnailEngine | null = null;

export function getThumbnailEngine(): ThumbnailEngine {
  if (!globalThumbnailEngine) {
    globalThumbnailEngine = new ThumbnailEngine();
  }
  return globalThumbnailEngine;
}

export function disposeThumbnailEngine() {
  globalThumbnailEngine?.dispose();
  globalThumbnailEngine = null;
}
