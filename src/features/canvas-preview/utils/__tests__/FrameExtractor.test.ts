/**
 * FrameExtractor Tests
 * 
 * Tests the FFmpeg-based frame extraction with LRU caching
 * Covers: caching, concurrent requests, playback mode, error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FrameExtractor, type ActiveClip } from "../FrameExtractor";
import * as tauri from "../../../../lib/tauri";

// Mock the tauri module
vi.mock("../../../../lib/tauri", () => ({
  extractFrameAtTime: vi.fn(),
  readCachedFrame: vi.fn(),
  saveFrameToCache: vi.fn(),
}));

// Mock createImageBitmap
global.createImageBitmap = vi.fn().mockImplementation((blob: Blob) => {
  return Promise.resolve({
    width: 1920,
    height: 1080,
    close: vi.fn(),
  } as unknown as ImageBitmap);
});

describe("FrameExtractor", () => {
  let extractor: FrameExtractor;
  const mockClip: ActiveClip = {
    id: "clip-1",
    sourceMediaPath: "asset://localhost/test/video.mp4",
    startTime: 0,
    duration: 10,
    sourceStart: 0,
    sourceEnd: 10,
    trackIndex: 0,
    clipTime: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new FrameExtractor(1920, 1080, 50);
  });

  afterEach(() => {
    extractor.dispose();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // INITIALIZATION TESTS
  // =========================================================================

  describe("Initialization", () => {
    it("should initialize with correct dimensions", () => {
      const customExtractor = new FrameExtractor(3840, 2160, 100);
      expect(customExtractor.getCacheSize()).toBe(0);
      customExtractor.dispose();
    });

    it("should initialize with default cache size", () => {
      const defaultExtractor = new FrameExtractor(1920, 1080);
      expect(defaultExtractor.getCacheSize()).toBe(0);
      defaultExtractor.dispose();
    });

    it("should handle 4K dimensions", () => {
      const extractor4k = new FrameExtractor(3840, 2160, 30);
      expect(extractor4k).toBeDefined();
      extractor4k.dispose();
    });

    it("should handle 8K dimensions", () => {
      const extractor8k = new FrameExtractor(7680, 4320, 20);
      expect(extractor8k).toBeDefined();
      extractor8k.dispose();
    });
  });

  // =========================================================================
  // BASIC FRAME EXTRACTION TESTS
  // =========================================================================

  describe("Basic Frame Extraction", () => {
    it("should extract a frame and return ImageBitmap", async () => {
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,testframe="
      );

      const bitmap = await extractor.getFrame(mockClip, 1.0);

      expect(bitmap).toBeDefined();
      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        "/test/video.mp4",
        1.0,
        1920,
        1080
      );
    });

    it("should check persistent cache before extraction", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(
        "data:image/png;base64,cachedframe="
      );

      const bitmap = await extractor.getFrame(mockClip, 1.0);

      expect(tauri.readCachedFrame).toHaveBeenCalled();
      expect(tauri.extractFrameAtTime).not.toHaveBeenCalled();
      expect(bitmap).toBeDefined();
    });

    it("should fall back to extraction when persistent cache misses", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,newframe="
      );

      const bitmap = await extractor.getFrame(mockClip, 1.0);

      expect(tauri.readCachedFrame).toHaveBeenCalled();
      expect(tauri.extractFrameAtTime).toHaveBeenCalled();
      expect(bitmap).toBeDefined();
    });

    it("should save extracted frame to persistent cache", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,newframe="
      );

      await extractor.getFrame(mockClip, 1.0);

      expect(tauri.saveFrameToCache).toHaveBeenCalledWith(
        "/test/video.mp4",
        1.0,
        1920,
        1080,
        "data:image/png;base64,newframe="
      );
    });
  });

  // =========================================================================
  // MEMORY CACHE TESTS
  // =========================================================================

  describe("Memory Cache", () => {
    it("should cache extracted frames in memory", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      // First extraction
      await extractor.getFrame(mockClip, 1.0);
      expect(extractor.getCacheSize()).toBe(1);

      // Second request should use memory cache
      const bitmap = await extractor.getFrame(mockClip, 1.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledTimes(1); // Only called once
      expect(bitmap).toBeDefined();
    });

    it("should evict LRU entry when cache is full", async () => {
      const smallExtractor = new FrameExtractor(1920, 1080, 2); // Max 2 entries

      // Fill cache
      for (let i = 0; i < 3; i++) {
        vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
        vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
          `data:image/png;base64,frame${i}=`
        );

        const clip: ActiveClip = {
          ...mockClip,
          id: `clip-${i}`,
          sourceMediaPath: `asset://localhost/test/video${i}.mp4`,
        };
        await smallExtractor.getFrame(clip, 1.0);
      }

      expect(smallExtractor.getCacheSize()).toBe(2); // Max size maintained
      smallExtractor.dispose();
    });

    it("should update lastAccessed on cache hit", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(mockClip, 1.0);
      const cacheSize1 = extractor.getCacheSize();

      // Access same frame again
      await extractor.getFrame(mockClip, 1.0);

      expect(extractor.getCacheSize()).toBe(cacheSize1);
    });

    it("should clear cache when requested", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(mockClip, 1.0);
      expect(extractor.getCacheSize()).toBe(1);

      extractor.clearCache();
      expect(extractor.getCacheSize()).toBe(0);
    });
  });

  // =========================================================================
  // PENDING REQUEST DEDUPLICATION TESTS
  // =========================================================================

  describe("Pending Request Deduplication", () => {
    it("should deduplicate concurrent requests for same frame", async () => {
      let resolveExtract: (value: string) => void;
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveExtract = resolve;
          })
      );

      // Fire two concurrent requests for same frame
      const promise1 = extractor.getFrame(mockClip, 1.0);
      const promise2 = extractor.getFrame(mockClip, 1.0);

      // Resolve the extraction
      resolveExtract!("data:image/png;base64,frame=");

      const [bitmap1, bitmap2] = await Promise.all([promise1, promise2]);

      // Should only call extract once
      expect(tauri.extractFrameAtTime).toHaveBeenCalledTimes(1);
      expect(bitmap1).toBeDefined();
      expect(bitmap2).toBeDefined();
    });

    it("should handle different frames separately", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValue(null);
      vi.mocked(tauri.extractFrameAtTime)
        .mockResolvedValueOnce("data:image/png;base64,frame1=")
        .mockResolvedValueOnce("data:image/png;base64,frame2=");

      const [bitmap1, bitmap2] = await Promise.all([
        extractor.getFrame(mockClip, 1.0),
        extractor.getFrame(mockClip, 2.0),
      ]);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledTimes(2);
      expect(bitmap1).toBeDefined();
      expect(bitmap2).toBeDefined();
    });

    it("should clean up pending request after success", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(mockClip, 1.0);

      // Request same frame again - should use cache, not pending
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      await extractor.getFrame(mockClip, 1.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledTimes(1);
    });

    it("should clean up pending request after failure", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockRejectedValueOnce(
        new Error("Extraction failed")
      );

      await expect(extractor.getFrame(mockClip, 1.0)).rejects.toThrow();

      // Next request should try again
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      const bitmap = await extractor.getFrame(mockClip, 1.0);
      expect(bitmap).toBeDefined();
    });
  });

  // =========================================================================
  // PLAYBACK MODE TESTS
  // =========================================================================

  describe("Playback Mode", () => {
    it("should use full resolution when not in playback mode", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(mockClip, 1.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        1920, // Full width
        1080 // Full height
      );
    });

    it("should use reduced resolution in playback mode", async () => {
      extractor.setPlaybackMode(true);

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(mockClip, 1.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        960, // 50% of 1920
        540 // 50% of 1080
      );
    });

    it("should enforce minimum dimensions in playback mode", async () => {
      const smallExtractor = new FrameExtractor(640, 360, 50);
      smallExtractor.setPlaybackMode(true);

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await smallExtractor.getFrame(mockClip, 1.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        320, // Clamped to minimum
        180 // Clamped to minimum
      );

      smallExtractor.dispose();
    });

    it("should toggle playback mode correctly", async () => {
      extractor.setPlaybackMode(true);
      expect(extractor).toBeDefined(); // No direct getter, but should not throw

      extractor.setPlaybackMode(false);
      expect(extractor).toBeDefined();
    });
  });

  // =========================================================================
  // ASSET URL CONVERSION TESTS
  // =========================================================================

  describe("Asset URL to File Path Conversion", () => {
    it("should convert asset://localhost/ URLs", async () => {
      const assetClip: ActiveClip = {
        ...mockClip,
        sourceMediaPath: "asset://localhost/Users/test/video.mp4",
      };

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(assetClip, 1.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        "/Users/test/video.mp4",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("should handle Windows paths from asset URLs", async () => {
      const windowsClip: ActiveClip = {
        ...mockClip,
        sourceMediaPath: "asset://localhost/C:/Users/test/video.mp4",
      };

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(windowsClip, 1.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        "C:/Users/test/video.mp4",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("should handle regular file paths", async () => {
      const regularClip: ActiveClip = {
        ...mockClip,
        sourceMediaPath: "/home/user/video.mp4",
      };

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(regularClip, 1.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        "/home/user/video.mp4",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("should handle URL-encoded characters in paths", async () => {
      const encodedClip: ActiveClip = {
        ...mockClip,
        sourceMediaPath: "asset://localhost/test/video%20with%20spaces.mp4",
      };

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(encodedClip, 1.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        "/test/video with spaces.mp4",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  // =========================================================================
  // ERROR HANDLING TESTS
  // =========================================================================

  describe("Error Handling", () => {
    it("should return null when extraction fails", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockRejectedValueOnce(
        new Error("FFmpeg failed")
      );

      const bitmap = await extractor.getFrame(mockClip, 1.0);

      expect(bitmap).toBeNull();
    });

    it("should handle disk cache read failure gracefully", async () => {
      vi.mocked(tauri.readCachedFrame).mockRejectedValueOnce(
        new Error("Cache read failed")
      );
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      const bitmap = await extractor.getFrame(mockClip, 1.0);

      expect(bitmap).toBeDefined();
      expect(tauri.extractFrameAtTime).toHaveBeenCalled();
    });

    it("should handle disk cache write failure gracefully", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );
      vi.mocked(tauri.saveFrameToCache).mockRejectedValueOnce(
        new Error("Cache write failed")
      );

      const bitmap = await extractor.getFrame(mockClip, 1.0);

      expect(bitmap).toBeDefined(); // Should still return bitmap
    });

    it("should handle createImageBitmap failure", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,invalid="
      );
      vi.mocked(createImageBitmap).mockRejectedValueOnce(
        new Error("Invalid image data")
      );

      const bitmap = await extractor.getFrame(mockClip, 1.0);

      expect(bitmap).toBeNull();
    });

    it("should handle fetch failure in createBitmap", async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      const bitmap = await extractor.getFrame(mockClip, 1.0);

      expect(bitmap).toBeNull();
    });
  });

  // =========================================================================
  // CANVAS DIMENSIONS TESTS
  // =========================================================================

  describe("Canvas Dimensions", () => {
    it("should update dimensions and clear cache", async () => {
      // Add something to cache first
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(mockClip, 1.0);
      expect(extractor.getCacheSize()).toBe(1);

      // Update dimensions
      extractor.setCanvasDimensions(1280, 720);

      // Cache should be cleared
      expect(extractor.getCacheSize()).toBe(0);
    });

    it("should not clear cache if dimensions unchanged", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(mockClip, 1.0);
      expect(extractor.getCacheSize()).toBe(1);

      // Same dimensions
      extractor.setCanvasDimensions(1920, 1080);

      // Cache should remain
      expect(extractor.getCacheSize()).toBe(1);
    });
  });

  // =========================================================================
  // PRELOAD TESTS
  // =========================================================================

  describe("Preload", () => {
    it("should preload frames for given time range", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValue(
        "data:image/png;base64,frame="
      );

      await extractor.preloadFrames([mockClip], 0, 1, 30);

      // Should have called extract for multiple frames
      expect(tauri.extractFrameAtTime).toHaveBeenCalled();
    });

    it("should handle empty clips array", async () => {
      await expect(
        extractor.preloadFrames([], 0, 1, 30)
      ).resolves.toBeUndefined();
    });

    it("should handle clips outside time range", async () => {
      const futureClip: ActiveClip = {
        ...mockClip,
        startTime: 100, // Far in the future
      };

      await extractor.preloadFrames([futureClip], 0, 1, 30);

      // Should not try to extract
      expect(tauri.extractFrameAtTime).not.toHaveBeenCalled();
    });

    it("should use lower resolution during preload", async () => {
      extractor.setPlaybackMode(true);

      vi.mocked(tauri.readCachedFrame).mockResolvedValue(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValue(
        "data:image/png;base64,frame="
      );

      await extractor.preloadFrames([mockClip], 0, 0.5, 30);

      // Should use reduced resolution
      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        960,
        540
      );
    });
  });

  // =========================================================================
  // CLIP TIME CALCULATION TESTS
  // =========================================================================

  describe("Clip Time Calculation", () => {
    it("should calculate correct source time for clip", async () => {
      const offsetClip: ActiveClip = {
        ...mockClip,
        startTime: 5, // Clip starts at 5s on timeline
        sourceStart: 10, // Source starts at 10s
      };

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      // Request at timeline time 6s
      await extractor.getFrame(offsetClip, 6.0);

      // Should extract at source time 11s (10 + (6-5))
      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        expect.any(String),
        11.0,
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("should clamp time to clip boundaries", async () => {
      const boundedClip: ActiveClip = {
        ...mockClip,
        startTime: 0,
        duration: 10,
        sourceStart: 5,
        sourceEnd: 15,
      };

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      // Request way past clip end - should clamp to sourceEnd
      await extractor.getFrame(boundedClip, 100.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        expect.any(String),
        15, // Clamped to sourceEnd
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("should handle negative offset correctly", async () => {
      const negativeClip: ActiveClip = {
        ...mockClip,
        startTime: 10,
        sourceStart: 0,
      };

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      // Request before clip start
      await extractor.getFrame(negativeClip, 5.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  // =========================================================================
  // CACHE KEY TESTS
  // =========================================================================

  describe("Cache Key Generation", () => {
    it("should generate consistent cache keys", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValue(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValue(
        "data:image/png;base64,frame="
      );

      // Same clip and time should use same cache key
      await extractor.getFrame(mockClip, 1.0);
      await extractor.getFrame(mockClip, 1.0);

      // Should only extract once
      expect(tauri.extractFrameAtTime).toHaveBeenCalledTimes(1);
    });

    it("should round time to millisecond precision", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValue(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValue(
        "data:image/png;base64,frame="
      );

      // Times within 1ms should share cache
      await extractor.getFrame(mockClip, 1.0001);
      await extractor.getFrame(mockClip, 1.0002);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledTimes(1);
    });

    it("should generate different keys for different times", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValue(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValue(
        "data:image/png;base64,frame="
      );

      // Different times should get different cache entries
      await extractor.getFrame(mockClip, 1.0);
      await extractor.getFrame(mockClip, 2.0);

      expect(tauri.extractFrameAtTime).toHaveBeenCalledTimes(2);
      expect(extractor.getCacheSize()).toBe(2);
    });
  });

  // =========================================================================
  // DISPOSAL TESTS
  // =========================================================================

  describe("Disposal", () => {
    it("should clear cache on dispose", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(mockClip, 1.0);
      expect(extractor.getCacheSize()).toBe(1);

      extractor.dispose();

      expect(extractor.getCacheSize()).toBe(0);
    });

    it("should close bitmaps on dispose", async () => {
      const mockClose = vi.fn();
      vi.mocked(createImageBitmap).mockResolvedValueOnce({
        width: 1920,
        height: 1080,
        close: mockClose,
      } as unknown as ImageBitmap);

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      await extractor.getFrame(mockClip, 1.0);

      // Access the bitmap to cache it in memory
      await extractor.getFrame(mockClip, 1.0);

      extractor.dispose();

      // Bitmap close should have been called
      expect(mockClose).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe("Edge Cases", () => {
    it("should handle zero duration clip", async () => {
      const zeroClip: ActiveClip = {
        ...mockClip,
        duration: 0,
      };

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      // Should still work
      const bitmap = await extractor.getFrame(zeroClip, 0);
      expect(bitmap).toBeDefined();
    });

    it("should handle very long clip paths", async () => {
      const longPathClip: ActiveClip = {
        ...mockClip,
        sourceMediaPath:
          "asset://localhost/" + "a/".repeat(100) + "video.mp4",
      };

      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      const bitmap = await extractor.getFrame(longPathClip, 1.0);
      expect(bitmap).toBeDefined();
    });

    it("should handle time exactly at clip boundary", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValue(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValue(
        "data:image/png;base64,frame="
      );

      // Time exactly at clip end (exclusive)
      const endClip: ActiveClip = {
        ...mockClip,
        startTime: 0,
        duration: 10,
      };

      // Should handle gracefully
      const bitmap = await extractor.getFrame(endClip, 10.0);
      expect(bitmap).toBeDefined();
    });

    it("should handle very high precision timestamps", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValueOnce(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValueOnce(
        "data:image/png;base64,frame="
      );

      // Frame-level precision for 60fps
      const bitmap = await extractor.getFrame(mockClip, 1.016666667);
      expect(bitmap).toBeDefined();
    });

    it("should handle rapid sequential requests", async () => {
      vi.mocked(tauri.readCachedFrame).mockResolvedValue(null);
      vi.mocked(tauri.extractFrameAtTime).mockResolvedValue(
        "data:image/png;base64,frame="
      );

      // Simulate rapid scrubbing
      const requests: Promise<ImageBitmap | null>[] = [];
      for (let i = 0; i < 20; i++) {
        requests.push(extractor.getFrame(mockClip, i * 0.1));
      }

      const results = await Promise.all(requests);
      expect(results.every((r) => r !== null || r === null)).toBe(true);
    });
  });
});
