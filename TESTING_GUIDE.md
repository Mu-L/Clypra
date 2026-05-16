# Clypra Testing Guide

> Target: Videos under 20 minutes for controlled experimentation. Purpose: Validate all systems end-to-end and verify the preview centering fix.

---

## Phase 1: Project & Media Import

### 1.1 Create a New Project

1. Launch the app.
2. Create a new project with:
   - **Canvas**: 1920×1080 (16:9) — our default.
   - **Frame rate**: 24fps or 30fps.
3. Verify the project opens with an empty timeline and a black preview.

### 1.2 Import Video Assets (<20 min)

Import these test assets:

| #   | Asset Type | Duration  | Aspect Ratio     | Purpose                                |
| --- | ---------- | --------- | ---------------- | -------------------------------------- |
| A   | Video      | 2–5 min   | 16:9 (1920×1080) | Baseline behavior                      |
| B   | Video      | 2–5 min   | 9:16 (1080×1920) | Vertical video handling                |
| C   | Video      | 2–5 min   | 1:1 (1080×1080)  | Square video handling                  |
| D   | Video      | 10–15 min | 16:9             | Longer timeline, filmstrip stress-test |
| E   | Image      | —         | Any              | Still image composition                |

### 1.3 Verify Import Pipeline

For each imported video:

- [ ] Thumbnail appears in Media tab within 2 seconds.
- [ ] Duration is correct.
- [ ] Thumbnail is NOT black (heuristic seek at 15% into video).
- [ ] No console errors during import.

---

## Phase 2: Preview Panel (Centering Fix Verification)

### 2.1 Empty Preview State

With no clips on the timeline:

- [ ] Preview shows "No clips in sequence" centered.
- [ ] Checkerboard background visible at 15% opacity.

### 2.2 Single Clip — 16:9 Asset on 16:9 Canvas

1. Drag Asset A (16:9 video) to the timeline.
2. Observe the preview:

- [ ] Video fills the entire preview frame (no black bars, no corner offset).
- [ ] Content is centered, not shifted to any corner.

### 2.3 Aspect Ratio Mismatch — 9:16 Asset on 16:9 Canvas

1. Drag Asset B (9:16 vertical video) to the timeline.
2. Observe the preview:

- [ ] Video is centered horizontally with **black pillarbox bars** on left and right.
- [ ] Video is NOT stretched to fill width.
- [ ] Video is NOT cropped.
- [ ] No content appears in any corner incorrectly.

### 2.4 Aspect Ratio Mismatch — 1:1 Asset on 16:9 Canvas

1. Drag Asset C (1:1 square video) to the timeline.
2. Observe the preview:

- [ ] Video is centered with equal black bars on left and right.

### 2.5 Preview Quality Tiers

Test each tier by interacting:

| Action                 | Expected Tier                    | Visual Check           |
| ---------------------- | -------------------------------- | ---------------------- |
| Idle (no interaction)  | Idle (full res, viewport-capped) | Sharpest image         |
| Play timeline          | Playback (half res)              | Slightly softer        |
| Scrub timeline rapidly | Interaction (quarter res)        | Softer, but responsive |

- [ ] Switching between tiers does not cause flicker or position jumps.

### 2.6 Resize Preview Panel

1. Resize the browser window or panel splitter.
2. Observe:

- [ ] Preview canvas resizes smoothly.
- [ ] Video remains centered after resize.
- [ ] No stretched or squished frames.

### 2.7 GPU vs Canvas2D Fallback

- [ ] If WebGL2 is available: GPU texture cache renders (check telemetry overlay).
- [ ] If WebGL2 is unavailable: Canvas2D fallback centers correctly.

---

## Phase 3: Timeline & Clip Operations

### 3.1 Add Clips

1. Drag Asset A to Track 1.
2. Drag Asset B to Track 2 (above Track 1).
3. Verify:

- [ ] Both clips appear on timeline.
- [ ] Preview shows top clip (Track 2) composited over bottom.

### 3.2 Trim Clips

1. Hover over the left edge of a clip.
2. Drag to trim 2 seconds from the start.

- [ ] Clip shortens.
- [ ] Preview updates to show new start frame.

### 3.3 Move Clips

1. Drag a clip to a new time position.

- [ ] Clip snaps to grid.
- [ ] Preview updates to show content at new time.

### 3.4 Split / Razor

1. Place playhead at 5 seconds.
2. Use razor tool to split clip.

- [ ] Clip divides into two independent clips.
- [ ] Preview shows correct frame at split point.

### 3.5 Gap Handling

1. Delete a clip, leaving a gap.

- [ ] Timeline shows empty space.
- [ ] Preview shows black frame (or lower track content if layered).

---

## Phase 4: Playback & Audio Sync

### 4.1 Basic Playback

1. Press Play (or Space).
2. Observe:

- [ ] Playhead moves smoothly along timeline.
- [ ] Preview updates at project frame rate (24/30fps).
- [ ] No dropped frames (check telemetry overlay: dropped frames should stay low).

### 4.2 Scrubbing

1. Click and drag the playhead rapidly.

- [ ] Preview updates in real-time.
- [ ] No stuttering or freezing.
- [ ] Quality drops to "Interaction" tier (softer but responsive).

### 4.3 Audio Sync (if video has audio)

1. Play a clip with audio.
2. Observe:

- [ ] Audio is in sync with video (<100ms drift).
- [ ] No pops, clicks, or drift over 30+ seconds of playback.

### 4.4 Speed Changes

1. Change playback speed to 2×.

- [ ] Video plays at double speed.
- [ ] Audio pitch-corrects (if supported) or mutes.

2. Change to 0.5×.

- [ ] Slow motion playback is smooth.

---

## Phase 5: Filmstrip & Thumbnails

### 5.1 Filmstrip Generation

1. Import Asset D (10–15 min video).
2. Hover over / select the clip on the timeline.

- [ ] Filmstrip thumbnails generate progressively.
- [ ] Thumbnails are not all black (15% heuristic working).
- [ ] Memory stays bounded (no VRAM explosion).

### 5.2 Scrub Filmstrip

1. Hover over the clip body.

- [ ] Filmstrip updates as you hover.
- [ ] Thumbnails are tile-cached (no re-generation on back-and-forth scrub).

### 5.3 Zoom Levels

1. Zoom timeline in and out (Ctrl + scroll).

- [ ] Filmstrip density adapts (more tiles when zoomed in, fewer when zoomed out).
- [ ] No blank tiles or loading spinners after initial generation.

---

## Phase 6: Stress & Edge Cases

### 6.1 Many Clips

1. Add 20+ short clips to the timeline.

- [ ] Timeline scrolls smoothly.
- [ ] Preview remains responsive.

### 6.2 Long Timeline

1. Create a 15-minute timeline.

- [ ] Memory usage remains stable.
- [ ] No crash or freeze when jumping to end.

### 6.3 Rapid Seek

1. Click randomly on the timeline ruler 10 times rapidly.

- [ ] Each seek lands correctly.
- [ ] No queued-up lag (scheduler cancels stale jobs).

### 6.4 Resize During Playback

1. Start playback.
2. Resize the window.

- [ ] Playback continues smoothly.
- [ ] Video remains centered.

---

## Phase 7: Export (Optional)

### 7.1 Quick Export

1. Export a 30-second segment.

- [ ] Export completes without error.
- [ ] Output file has correct dimensions (1920×1080).
- [ ] Output is not stretched or cropped incorrectly.

---

## Diagnostic Tools

### Telemetry Overlay

Enable `showTelemetry` in the UI or set `showTelemetryRef.current = true` to see:

- Avg evaluation time (should be <5ms)
- Avg raster time (should be <16ms for 60fps)
- Dropped frames (should be near 0)
- GPU memory usage

### Browser DevTools

- **Performance tab**: Record during playback to find jank.
- **Memory tab**: Heap snapshots should be stable (no leaks).
- **Console**: Filter for `[PreviewPanel]`, `[GPUTextureCache]`, `[FilmstripCache]` logs.

---

## Known Pre-existing Issues (Not Related to Your Work)

- `FilmstripCache.test.ts` has TypeScript errors (`Type 'never' has no call signatures`) — test fixture issue, not runtime.

## Checklist Summary

After testing, confirm:

- [ ] Preview video is **always centered**, never in a corner.
- [ ] Aspect ratio mismatches show **letterbox/pillarbox bars**, not stretch.
- [ ] No black thumbnails on import (15% heuristic working).
- [ ] Playback is smooth with low dropped frames.
- [ ] Audio stays in sync.
- [ ] Filmstrip generates quickly and scrolls smoothly.
- [ ] Memory is stable during long timelines.
