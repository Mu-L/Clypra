/**
 * Timeline Store Gap Operations Tests
 *
 * Integration tests for gap operations in the timeline store.
 * Tests real store behavior with gaps array and clip interactions.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useTimelineStore } from "./timelineStore";

describe("Timeline Store - Gap Operations", () => {
  let trackId: string;

  beforeEach(() => {
    // Reset store using hydrateFromProject
    const store = useTimelineStore.getState();
    store.hydrateFromProject({
      tracks: [
        {
          id: "track-test-1",
          type: "video" as const,
          name: "Video 1",
          height: 68,
          visible: true,
          muted: false,
          locked: false,
        },
      ],
      clips: [],
      transitions: [],
    });

    trackId = "track-test-1";

    // Add test clips
    store.addClip({
      trackId,
      mediaId: "media1",
      startTime: 0,
      duration: 5,
    });

    store.addClip({
      trackId,
      mediaId: "media2",
      startTime: 10,
      duration: 5,
    });
  });

  afterEach(() => {
    // Clean up
    useTimelineStore.getState().hydrateFromProject({
      tracks: [],
      clips: [],
      transitions: [],
    });
  });

  describe("insertGap", () => {
    it("should insert gap and create gap entity", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      const gap = store.insertGap(trackId, 7, 3);

      expect(gap).not.toBeNull();
      expect(gap!.startTime).toBe(7);
      expect(gap!.duration).toBe(3);
      expect(gap!.trackId).toBe(trackId);
      expect(gap!.type).toBe("manual");

      // Gap should be in store
      expect(store.gaps).toHaveLength(1);
      expect(store.gaps[0].id).toBe(gap!.id);
    });

    it("should shift clips after gap insertion point", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      const clip2Before = store.clips.find((c) => c.mediaId === "media2");
      expect(clip2Before!.startTime).toBe(10);

      store.insertGap(trackId, 7, 3);

      const clip2After = store.clips.find((c) => c.mediaId === "media2");
      expect(clip2After!.startTime).toBe(13); // Shifted by 3 seconds
    });

    it("should not affect clips before gap insertion point", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      const clip1Before = store.clips.find((c) => c.mediaId === "media1");
      expect(clip1Before!.startTime).toBe(0);

      store.insertGap(trackId, 7, 3);

      const clip1After = store.clips.find((c) => c.mediaId === "media1");
      expect(clip1After!.startTime).toBe(0); // Unchanged
    });

    it("should return null for invalid track", () => {
      const store = useTimelineStore.getState();
      const gap = store.insertGap("non-existent-track", 0, 2);

      expect(gap).toBeNull();
      expect(store.gaps).toHaveLength(0);
    });

    it("should return null for locked track", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Lock the track
      store.toggleTrackLock(trackId);

      const gap = store.insertGap(trackId, 0, 2);

      expect(gap).toBeNull();
      expect(store.gaps).toHaveLength(0);
    });
  });

  describe("removeGap", () => {
    it("should remove gap and shift clips left", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert a gap
      const gap = store.insertGap(trackId, 7, 3);
      expect(gap).not.toBeNull();

      // Verify clip shifted right
      const clip2After = store.clips.find((c) => c.mediaId === "media2");
      expect(clip2After!.startTime).toBe(13);

      // Remove the gap
      store.removeGap(gap!.id);

      // Gap should be removed
      expect(store.gaps).toHaveLength(0);

      // Clip should be shifted back left
      const clip2Final = store.clips.find((c) => c.mediaId === "media2");
      expect(clip2Final!.startTime).toBe(10);
    });

    it("should handle removing non-existent gap gracefully", () => {
      const store = useTimelineStore.getState();

      // Should not crash
      expect(() => store.removeGap("non-existent-gap")).not.toThrow();
      expect(store.gaps).toHaveLength(0);
    });

    it("should not remove from locked track", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert gap
      const gap = store.insertGap(trackId, 7, 3);
      expect(gap).not.toBeNull();

      // Lock track
      store.toggleTrackLock(trackId);

      // Try to remove gap
      store.removeGap(gap!.id);

      // Gap should still be there
      expect(store.gaps).toHaveLength(1);
    });
  });

  describe("resizeGapDuration", () => {
    it("should resize gap and adjust downstream clips", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert gap
      const gap = store.insertGap(trackId, 7, 3);
      expect(gap).not.toBeNull();

      // Resize to 5 seconds (increase by 2)
      store.resizeGapDuration(gap!.id, 5);

      // Gap should be resized
      const updatedGap = store.gaps.find((g) => g.id === gap!.id);
      expect(updatedGap!.duration).toBe(5);

      // Clip2 should be shifted further right
      const clip2 = store.clips.find((c) => c.mediaId === "media2");
      expect(clip2!.startTime).toBe(15); // Was 13, now 13 + 2 = 15
    });

    it("should handle shrinking gap", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert gap
      const gap = store.insertGap(trackId, 7, 3);
      expect(gap).not.toBeNull();

      // Resize to 1 second (decrease by 2)
      store.resizeGapDuration(gap!.id, 1);

      // Gap should be resized
      const updatedGap = store.gaps.find((g) => g.id === gap!.id);
      expect(updatedGap!.duration).toBe(1);

      // Clip2 should be shifted left
      const clip2 = store.clips.find((c) => c.mediaId === "media2");
      expect(clip2!.startTime).toBe(11); // Was 13, now 13 - 2 = 11
    });

    it("should handle resizing non-existent gap gracefully", () => {
      const store = useTimelineStore.getState();

      expect(() => store.resizeGapDuration("non-existent-gap", 5)).not.toThrow();
    });

    it("should not resize on locked track", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert gap
      const gap = store.insertGap(trackId, 7, 3);
      expect(gap).not.toBeNull();

      // Lock track
      store.toggleTrackLock(trackId);

      // Try to resize
      store.resizeGapDuration(gap!.id, 5);

      // Gap should be unchanged
      const updatedGap = store.gaps.find((g) => g.id === gap!.id);
      expect(updatedGap!.duration).toBe(3);
    });
  });

  describe("toggleGapProtection", () => {
    it("should toggle protection state", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert gap (manual gaps are protected by default)
      const gap = store.insertGap(trackId, 7, 3);
      expect(gap).not.toBeNull();
      expect(gap!.protected).toBe(true);

      // Toggle to unprotected
      store.toggleGapProtection(gap!.id);
      const updated1 = store.gaps.find((g) => g.id === gap!.id);
      expect(updated1!.protected).toBe(false);

      // Toggle back to protected
      store.toggleGapProtection(gap!.id);
      const updated2 = store.gaps.find((g) => g.id === gap!.id);
      expect(updated2!.protected).toBe(true);
    });

    it("should handle toggling non-existent gap gracefully", () => {
      const store = useTimelineStore.getState();

      expect(() => store.toggleGapProtection("non-existent-gap")).not.toThrow();
    });

    it("should not toggle on locked track", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert gap
      const gap = store.insertGap(trackId, 7, 3);
      expect(gap).not.toBeNull();

      // Lock track
      store.toggleTrackLock(trackId);

      // Try to toggle
      store.toggleGapProtection(gap!.id);

      // Should be unchanged
      const updatedGap = store.gaps.find((g) => g.id === gap!.id);
      expect(updatedGap!.protected).toBe(true);
    });
  });

  describe("detectAndSyncGaps", () => {
    it("should detect gaps between clips", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Initially no gaps in store
      expect(store.gaps).toHaveLength(0);

      // Detect gaps
      store.detectAndSyncGaps(trackId);

      // Should detect gap between clip1 (0-5s) and clip2 (10-15s)
      expect(store.gaps).toHaveLength(1);
      expect(store.gaps[0].startTime).toBe(5);
      expect(store.gaps[0].duration).toBe(5);
    });

    it("should detect gaps on all tracks when no trackId specified", () => {
      const store = useTimelineStore.getState();

      // Add another track with clips
      store.addTrack({ type: "audio", name: "Audio 1" });
      const track2Id = store.tracks[1].id;
      store.addClip({
        trackId: track2Id,
        mediaId: "media3",
        startTime: 3,
        duration: 2,
      });
      store.addClip({
        trackId: track2Id,
        mediaId: "media4",
        startTime: 8,
        duration: 2,
      });

      // Detect all gaps
      store.detectAndSyncGaps();

      // Should have gaps from both tracks
      expect(store.gaps.length).toBeGreaterThan(0);

      const track1Gaps = store.gaps.filter((g) => g.trackId === trackId);
      const track2Gaps = store.gaps.filter((g) => g.trackId === track2Id);

      expect(track1Gaps.length).toBeGreaterThan(0);
      expect(track2Gaps.length).toBeGreaterThan(0);
    });

    it("should not duplicate existing gaps", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Manually insert a gap
      const gap = store.insertGap(trackId, 7, 1);
      expect(gap).not.toBeNull();

      const initialGapCount = store.gaps.length;

      // Detect gaps (should not recreate existing gap)
      store.detectAndSyncGaps(trackId);

      // Gap count should not increase
      expect(store.gaps.length).toBe(initialGapCount);
    });
  });

  describe("packTrackGaps", () => {
    it("should remove all unprotected gaps", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert multiple gaps
      const gap1 = store.insertGap(trackId, 7, 2);
      const gap2 = store.insertGap(trackId, 17, 1);

      // Unprotect them
      store.toggleGapProtection(gap1!.id);
      store.toggleGapProtection(gap2!.id);

      expect(store.gaps).toHaveLength(2);

      // Pack track
      store.packTrackGaps(trackId);

      // All gaps should be removed
      expect(store.gaps).toHaveLength(0);

      // Clips should be packed tight
      const clip1 = store.clips.find((c) => c.mediaId === "media1");
      const clip2 = store.clips.find((c) => c.mediaId === "media2");
      expect(clip1!.startTime).toBe(0);
      expect(clip2!.startTime).toBe(5); // Immediately after clip1
    });

    it("should preserve protected gaps", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert gap (protected by default)
      const protectedGap = store.insertGap(trackId, 7, 2);
      expect(protectedGap!.protected).toBe(true);

      // Insert another gap and unprotect it
      const unprotectedGap = store.insertGap(trackId, 17, 1);
      store.toggleGapProtection(unprotectedGap!.id);

      expect(store.gaps).toHaveLength(2);

      // Pack track
      store.packTrackGaps(trackId);

      // Only protected gap should remain
      expect(store.gaps).toHaveLength(1);
      expect(store.gaps[0].id).toBe(protectedGap!.id);
    });

    it("should handle track with no gaps", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      expect(store.gaps).toHaveLength(0);

      // Should not crash
      expect(() => store.packTrackGaps(trackId)).not.toThrow();
      expect(store.gaps).toHaveLength(0);
    });

    it("should not pack locked track", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert gap
      const gap = store.insertGap(trackId, 7, 2);
      store.toggleGapProtection(gap!.id); // Unprotect

      // Lock track
      store.toggleTrackLock(trackId);

      // Try to pack
      store.packTrackGaps(trackId);

      // Gap should still be there
      expect(store.gaps).toHaveLength(1);
    });
  });

  describe("Integration Tests", () => {
    it("should handle complex gap workflow", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // 1. Insert gap
      const gap1 = store.insertGap(trackId, 7, 3);
      expect(gap1).not.toBeNull();
      expect(store.gaps).toHaveLength(1);

      // 2. Add clip after gap
      store.addClip({
        trackId,
        mediaId: "media3",
        startTime: 20,
        duration: 5,
      });

      // 3. Insert another gap
      const gap2 = store.insertGap(trackId, 17, 2);
      expect(store.gaps).toHaveLength(2);

      // 4. Resize first gap
      store.resizeGapDuration(gap1!.id, 5);
      const resizedGap = store.gaps.find((g) => g.id === gap1!.id);
      expect(resizedGap!.duration).toBe(5);

      // 5. Protect second gap
      expect(gap2!.protected).toBe(true); // Already protected

      // 6. Try to pack track (should only remove unprotected gaps)
      store.toggleGapProtection(gap1!.id); // Unprotect gap1
      store.packTrackGaps(trackId);

      // Only gap2 should remain
      expect(store.gaps).toHaveLength(1);
      expect(store.gaps[0].id).toBe(gap2!.id);
    });

    it("should handle gap operations with clip CRUD", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert gap
      const gap = store.insertGap(trackId, 7, 3);
      expect(gap).not.toBeNull();

      // Add a clip after the gap
      store.addClip({
        trackId,
        mediaId: "media3",
        startTime: 15,
        duration: 3,
      });

      // Delete a clip
      const clip1 = store.clips.find((c) => c.mediaId === "media1");
      store.deleteClip(clip1!.id);

      // Gap should still exist
      expect(store.gaps).toHaveLength(1);
    });

    it("should handle multiple tracks with gaps independently", () => {
      const store = useTimelineStore.getState();
      const track1Id = trackId;

      // Add second track
      store.addTrack({ type: "audio", name: "Audio 1" });
      const track2Id = store.tracks[1].id;

      // Add clips to track2
      store.addClip({
        trackId: track2Id,
        mediaId: "media3",
        startTime: 0,
        duration: 3,
      });
      store.addClip({
        trackId: track2Id,
        mediaId: "media4",
        startTime: 8,
        duration: 3,
      });

      // Insert gaps on both tracks
      const gap1 = store.insertGap(track1Id, 7, 2);
      const gap2 = store.insertGap(track2Id, 5, 2);

      expect(store.gaps).toHaveLength(2);

      // Pack track1 only
      store.toggleGapProtection(gap1!.id); // Unprotect
      store.packTrackGaps(track1Id);

      // Track1 gaps removed, track2 gap preserved
      expect(store.gaps).toHaveLength(1);
      expect(store.gaps[0].trackId).toBe(track2Id);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero-length track", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Remove all clips
      store.clips.forEach((clip) => store.deleteClip(clip.id));

      // Try to insert gap
      const gap = store.insertGap(trackId, 0, 2);
      expect(gap).not.toBeNull();
      expect(store.gaps).toHaveLength(1);
    });

    it("should handle very large time values", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert gap at 1 hour
      const gap = store.insertGap(trackId, 3600, 10);
      expect(gap).not.toBeNull();
      expect(gap!.startTime).toBe(3600);
    });

    it("should handle very small gap durations", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Insert tiny gap
      const gap = store.insertGap(trackId, 7, 0.001);
      expect(gap).not.toBeNull();
      expect(gap!.duration).toBe(0.001);
    });

    it("should handle rapid gap operations", () => {
      const store = useTimelineStore.getState();
      // Use trackId from beforeEach

      // Rapid insert/remove cycles
      for (let i = 0; i < 10; i++) {
        const gap = store.insertGap(trackId, 7, 2);
        expect(gap).not.toBeNull();
        store.removeGap(gap!.id);
      }

      // Should end with no gaps
      expect(store.gaps).toHaveLength(0);
    });
  });
});
