/**
 * FrameResolver Tests
 * 
 * Tests the active clip resolution logic
 * Covers: clip activation, time calculation, track ordering
 */

import { describe, it, expect } from "vitest";
import { FrameResolver } from "../FrameResolver";
import type { Clip, Track } from "../../../timeline/types/core";

describe("FrameResolver", () => {
  // Helper to create test clips
  const createClip = (
    id: string,
    trackId: string,
    startTime: number,
    duration: number,
    overrides: Partial<Clip> = {}
  ): Clip => ({
    id,
    trackId,
    startTime,
    duration,
    sourceMediaPath: "/test/video.mp4",
    sourceStart: 0,
    sourceEnd: duration,
    type: "video",
    filmstripUrl: null,
    waveformPeaks: null,
    name: `Clip ${id}`,
    locked: false,
    muted: false,
    ...overrides,
  });

  // Helper to create test tracks
  const createTrack = (
    id: string,
    order: number,
    visible: boolean = true,
    overrides: Partial<Track> = {}
  ): Track => ({
    id,
    name: `Track ${id}`,
    type: "video",
    order,
    height: 100,
    locked: false,
    visible,
    muted: false,
    color: "#000000",
    ...overrides,
  });

  // =========================================================================
  // BASIC CLIP ACTIVATION TESTS
  // =========================================================================

  describe("Basic Clip Activation", () => {
    it("should return active clip when time is within clip bounds", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 0, 10)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip-1");
    });

    it("should return empty array when time is before clip", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 10, 5)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(0);
    });

    it("should return empty array when time is after clip", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 0, 5)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(10.0);

      expect(activeClips).toHaveLength(0);
    });

    it("should handle clip start boundary (inclusive)", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 5, 10)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip-1");
    });

    it("should handle clip end boundary (exclusive)", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 0, 10)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      // At exactly end time - should be inactive (end is exclusive)
      const activeClips = resolver.getActiveClips(10.0);

      expect(activeClips).toHaveLength(0);
    });

    it("should handle time just before clip end", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 0, 10)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(9.999);

      expect(activeClips).toHaveLength(1);
    });
  });

  // =========================================================================
  // MULTIPLE CLIPS TESTS
  // =========================================================================

  describe("Multiple Clips", () => {
    it("should return multiple active clips at same time (different tracks)", () => {
      const clips = new Map([
        ["clip-1", createClip("clip-1", "track-1", 0, 10)],
        ["clip-2", createClip("clip-2", "track-2", 0, 10)],
      ]);
      const tracks = new Map([
        ["track-1", createTrack("track-1", 0)],
        ["track-2", createTrack("track-2", 1)],
      ]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(2);
    });

    it("should handle overlapping clips on same track (both active)", () => {
      const clips = new Map([
        ["clip-1", createClip("clip-1", "track-1", 0, 10)],
        ["clip-2", createClip("clip-2", "track-1", 5, 10)], // Overlaps clip-1
      ]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(7.0);

      // Both clips are active at this time
      expect(activeClips).toHaveLength(2);
    });

    it("should return clips sorted by track order", () => {
      const clips = new Map([
        ["clip-1", createClip("clip-1", "track-top", 0, 10)],
        ["clip-2", createClip("clip-2", "track-bottom", 0, 10)],
      ]);
      const tracks = new Map([
        ["track-top", createTrack("track-top", 5)],
        ["track-bottom", createTrack("track-bottom", 0)],
      ]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(2);
      expect(activeClips[0].trackIndex).toBe(0); // Bottom track first
      expect(activeClips[1].trackIndex).toBe(5); // Top track second
    });

    it("should handle many clips efficiently", () => {
      const clips = new Map<string, Clip>();
      const tracks = new Map<string, Track>();

      for (let i = 0; i < 100; i++) {
        clips.set(`clip-${i}`, createClip(`clip-${i}`, `track-${i}`, i * 10, 10));
        tracks.set(`track-${i}`, createTrack(`track-${i}`, i));
      }

      const resolver = new FrameResolver(clips, tracks);

      // Should only return clip at this time
      const activeClips = resolver.getActiveClips(55.0);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip-5");
    });
  });

  // =========================================================================
  // CLIP TIME CALCULATION TESTS
  // =========================================================================

  describe("Clip Time Calculation", () => {
    it("should calculate clipTime equal to timeline time at clip start", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 10, 10)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(10.0);

      expect(activeClips[0].clipTime).toBe(0);
    });

    it("should calculate correct clipTime with offset", () => {
      const clips = new Map([
        ["clip-1", createClip("clip-1", "track-1", 10, 10, { sourceStart: 5 })],
      ]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      // 2 seconds into clip, sourceStart is 5
      const activeClips = resolver.getActiveClips(12.0);

      // clipTime = sourceStart + (timelineTime - clip.startTime)
      // = 5 + (12 - 10) = 7
      expect(activeClips[0].clipTime).toBe(7);
    });

    it("should handle clip with source trim", () => {
      const clips = new Map([
        [
          "clip-1",
          createClip("clip-1", "track-1", 0, 10, { sourceStart: 100, sourceEnd: 110 }),
        ],
      ]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      // 5 seconds into timeline, source starts at 100
      expect(activeClips[0].clipTime).toBe(105);
    });

    it("should clamp clipTime to source boundaries", () => {
      const clips = new Map([
        [
          "clip-1",
          createClip("clip-1", "track-1", 0, 100, { sourceStart: 10, sourceEnd: 20 }),
        ],
      ]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      // Way past source end
      const activeClips = resolver.getActiveClips(50.0);

      // Should clamp to sourceEnd (20)
      expect(activeClips[0].clipTime).toBe(20);
    });

    it("should never return negative clipTime", () => {
      const clips = new Map([
        [
          "clip-1",
          createClip("clip-1", "track-1", 10, 10, { sourceStart: 0, sourceEnd: 20 }),
        ],
      ]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      // Timeline time is before clip start
      const activeClips = resolver.getActiveClips(5.0);

      // This clip shouldn't be active at all (time < clip.startTime)
      expect(activeClips).toHaveLength(0);
    });
  });

  // =========================================================================
  // TRACK VISIBILITY TESTS
  // =========================================================================

  describe("Track Visibility", () => {
    it("should exclude clips on invisible tracks", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 0, 10)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0, false)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(0);
    });

    it("should include clips on visible tracks", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 0, 10)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0, true)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(1);
    });

    it("should handle mixed visible and invisible tracks", () => {
      const clips = new Map([
        ["clip-1", createClip("clip-1", "track-1", 0, 10)],
        ["clip-2", createClip("clip-2", "track-2", 0, 10)],
        ["clip-3", createClip("clip-3", "track-3", 0, 10)],
      ]);
      const tracks = new Map([
        ["track-1", createTrack("track-1", 0, true)],
        ["track-2", createTrack("track-2", 1, false)],
        ["track-3", createTrack("track-3", 2, true)],
      ]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(2);
      expect(activeClips.map((c) => c.id)).toContain("clip-1");
      expect(activeClips.map((c) => c.id)).not.toContain("clip-2");
      expect(activeClips.map((c) => c.id)).toContain("clip-3");
    });
  });

  // =========================================================================
  // MISSING TRACK TESTS
  // =========================================================================

  describe("Missing Track Handling", () => {
    it("should skip clips with missing track", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "missing-track", 0, 10)]]);
      const tracks = new Map<string, Track>(); // Empty tracks
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(0);
    });

    it("should handle some clips with missing tracks", () => {
      const clips = new Map([
        ["clip-1", createClip("clip-1", "track-1", 0, 10)],
        ["clip-2", createClip("clip-2", "missing-track", 0, 10)],
      ]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip-1");
    });
  });

  // =========================================================================
  // EDGE CASE TESTS
  // =========================================================================

  describe("Edge Cases", () => {
    it("should handle empty clips map", () => {
      const clips = new Map<string, Clip>();
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(0);
    });

    it("should handle empty tracks map", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 0, 10)]]);
      const tracks = new Map<string, Track>();
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(0);
    });

    it("should handle negative time", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 0, 10)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(-5.0);

      expect(activeClips).toHaveLength(0);
    });

    it("should handle zero time", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 0, 10)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(0);

      expect(activeClips).toHaveLength(1);
    });

    it("should handle very large time values", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 0, 10)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      // 3+ hour video
      const activeClips = resolver.getActiveClips(10800.0);

      expect(activeClips).toHaveLength(0);
    });

    it("should handle zero duration clip", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 5, 0)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      // Clip has zero duration, should not be active
      const activeClips = resolver.getActiveClips(5.0);

      // Zero duration means startTime == endTime, so at exactly 5s it's not active
      // (end is exclusive)
      expect(activeClips).toHaveLength(0);
    });

    it("should handle very short duration clip", () => {
      const clips = new Map([
        ["clip-1", createClip("clip-1", "track-1", 0, 0.001)], // 1ms
      ]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(0.0005);

      expect(activeClips).toHaveLength(1);
    });

    it("should handle fractional time values", () => {
      const clips = new Map([["clip-1", createClip("clip-1", "track-1", 0, 10)]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      // 1/30s for 30fps video
      const activeClips = resolver.getActiveClips(0.033333333);

      expect(activeClips).toHaveLength(1);
    });

    it("should handle clips with same track order", () => {
      const clips = new Map([
        ["clip-1", createClip("clip-1", "track-1", 0, 10)],
        ["clip-2", createClip("clip-2", "track-2", 0, 10)],
      ]);
      const tracks = new Map([
        ["track-1", createTrack("track-1", 5)],
        ["track-2", createTrack("track-2", 5)], // Same order
      ]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      // Both should be returned, order might vary
      expect(activeClips).toHaveLength(2);
    });

    it("should handle audio clips", () => {
      const audioClip = createClip("clip-1", "track-1", 0, 10, { type: "audio" });
      const clips = new Map([["clip-1", audioClip]]);
      const tracks = new Map([
        ["track-1", createTrack("track-1", 0, true, { type: "audio" })],
      ]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].type).toBe("audio");
    });

    it("should handle text clips", () => {
      const textClip = createClip("clip-1", "track-1", 0, 10, { type: "text" });
      const clips = new Map([["clip-1", textClip]]);
      const tracks = new Map([
        ["track-1", createTrack("track-1", 0, true, { type: "text" })],
      ]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].type).toBe("text");
    });

    it("should handle locked clips", () => {
      const lockedClip = createClip("clip-1", "track-1", 0, 10, { locked: true });
      const clips = new Map([["clip-1", lockedClip]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].locked).toBe(true);
    });

    it("should handle muted clips", () => {
      const mutedClip = createClip("clip-1", "track-1", 0, 10, { muted: true });
      const clips = new Map([["clip-1", mutedClip]]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].muted).toBe(true);
    });

    it("should handle back-to-back clips (no gap)", () => {
      const clips = new Map([
        ["clip-1", createClip("clip-1", "track-1", 0, 5)],
        ["clip-2", createClip("clip-2", "track-1", 5, 5)], // Starts exactly when clip-1 ends
      ]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      // At time 5, only clip-2 should be active (end is exclusive)
      const activeClips = resolver.getActiveClips(5.0);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip-2");
    });

    it("should handle clips with gaps between them", () => {
      const clips = new Map([
        ["clip-1", createClip("clip-1", "track-1", 0, 5)],
        ["clip-2", createClip("clip-2", "track-1", 10, 5)], // Gap from 5-10
      ]);
      const tracks = new Map([["track-1", createTrack("track-1", 0)]]);
      const resolver = new FrameResolver(clips, tracks);

      const activeClips = resolver.getActiveClips(7.0);

      expect(activeClips).toHaveLength(0);
    });
  });
});
