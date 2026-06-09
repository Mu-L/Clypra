# Audio Properties Feature

## Overview

Added comprehensive audio property controls to the Properties Panel, allowing users to adjust volume levels for audio clips on the timeline.

## What was Implemented

### 1. Type System Updates (`types/index.ts`)

- Added optional `volume` property to `Clip` interface
- Volume range: 0.0 to 2.0 (0% to 200%)
- Default value: 1.0 (100%)
- Allows audio amplification beyond 100%

### 2. Audio Properties UI (`AudioSection.tsx`)

New component providing:

- **Volume slider** (0-200%) with visual feedback
- **Mute/unmute button** with icon toggle
- **Numeric input** for precise control
- **Quick preset buttons**: 0%, 50%, 100%, 150%, 200%
- **Real-time updates** via Transform command system
- **Visual indicators**:
  - Blue accent for unmuted state
  - Gray muted icon for muted state
  - Percentage display

### 3. Properties Panel Integration (`PropertiesPanel.tsx`)

- Detects audio clips via `selectedAsset?.type === "audio"`
- Renders AudioSection for audio clips
- Prevents showing Transform section for audio-only clips
- Maintains undo/redo support through TransformClipCommand

### 4. Export Integration (`videoExport.ts`)

- Updated export to use clip's volume property
- Falls back to 1.0 if volume is undefined
- Properly mixes audio at export time with correct volume levels

## User Experience

### Before

- Audio clips had no editable properties
- Volume was hardcoded to 100% (1.0)
- No way to adjust audio levels
- Empty properties panel when selecting audio

### After

1. Select an audio clip on the timeline
2. Properties panel shows "Clip Properties" with audio controls
3. Adjust volume using:
   - Slider for smooth changes
   - Number input for precise values
   - Quick buttons for common levels
   - Mute button for instant silence
4. Changes apply immediately with undo/redo support
5. Export respects per-clip volume levels

## Technical Details

### Volume Property

```typescript
export interface Clip {
  // ... existing properties
  /** Audio volume (0.0 to 1.0, default 1.0) */
  volume?: number;
}
```

### AudioSection Component

```typescript
interface AudioSectionProps {
  selectedClip: Clip;
  handleUpdate: (key: string, value: any) => void;
}
```

Features:

- Volume range: 0 to 2.0 (200%)
- Clamping ensures valid values
- Percentage display for user clarity
- Mute = volume 0, Unmute = volume 1.0
- Responsive slider with custom styling

### Export Integration

```typescript
volume: clip.volume ?? 1.0; // Use clip volume or default to 1.0
```

### Command Integration

Uses existing `TransformClipCommand` for:

- Undo/redo support
- History tracking
- Batch operations support
- Epoch-based invalidation

## UI Design

### Layout

```
┌─────────────────────────────────┐
│  ⚙️ Clip Properties             │
├─────────────────────────────────┤
│                                 │
│  Volume              100%       │
│  🔊 ━━━━━━━━━━━━━━━━━━━━ [100] │
│                                 │
│  0%   50%   100%   150%   200%  │
│                                 │
│  ℹ️ Adjust the volume level...  │
└─────────────────────────────────┘
```

### Color Scheme

- Accent color (#3b82f6) for active/unmuted state
- Muted gray for muted icon
- Surface raised for inputs and slider background
- Border accents for focus states

## Benefits

1. **Professional control**: Industry-standard volume adjustment (0-200%)
2. **Non-destructive**: Original audio file unchanged
3. **Per-clip control**: Different volumes for each audio clip
4. **Amplification support**: Boost quiet audio up to 200%
5. **Quick presets**: Fast access to common volume levels
6. **Undo/redo**: Full history support
7. **Export integration**: Volumes respected in final output

## Future Enhancements (Optional)

- **Keyframe automation**: Animated volume changes over time
- **Audio meters**: Real-time level visualization
- **Fade in/out**: Built-in fade effects
- **Pan control**: Left/right stereo balance
- **EQ controls**: Frequency adjustments
- **Audio effects**: Reverb, compression, etc.
- **Normalize**: Auto-level audio to target loudness
- **Audio ducking**: Auto-reduce music when voice present

## Testing

All 798 tests passing, including:

- PropertiesPanel rendering tests
- Command system tests
- Export integration tests
- Type system validation

## Usage Example

1. Import audio file to media panel
2. Drag to timeline
3. Select the audio clip
4. Properties panel shows volume controls
5. Adjust volume slider or use presets
6. Export video with adjusted audio levels

## Backward Compatibility

- Existing projects without `volume` property default to 1.0
- No migration required
- Graceful fallback in all code paths
