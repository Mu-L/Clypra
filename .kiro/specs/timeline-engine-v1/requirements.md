# Requirements Document: Timeline Engine v1

## Introduction

The Timeline Engine is a professional-grade video editing timeline system for the Kyro video editor built with a React + Rust Tauri architecture. It provides frame-accurate editing capabilities, multi-layer composition, real-time scrubbing, and visual feedback similar to industry-standard tools like CapCut and Adobe Premiere Pro. The system follows the principle: **React = orchestration + UI, Rust = execution + media engine**.

The architecture separates concerns into two layers:

- **React Layer**: Timeline UI, viewport calculations, user interactions, and orchestration
- **Rust Core**: Frame extraction, thumbnail generation, audio processing, render graph, and all heavy media operations

This separation ensures optimal performance by keeping heavy media operations in native code while maintaining a responsive UI layer.

## Glossary

- **Timeline_Engine**: The complete timeline system including React UI layer and Rust media engine
- **React_Layer**: The UI layer responsible for timeline rendering, user interactions, viewport calculations, and state orchestration
- **Rust_Core**: The native backend responsible for frame extraction, thumbnail generation, audio processing, and render operations
- **Tauri_IPC**: The inter-process communication layer connecting React and Rust via commands and events
- **Clip**: A video, audio, or text segment placed on the timeline with defined start time, duration, and track assignment
- **Track**: A horizontal layer on the timeline that contains clips (video, audio, text, or effects)
- **Playhead**: The vertical indicator showing the current playback position in time
- **Time_Ruler**: The horizontal scale at the top of the timeline showing time markers and frame numbers
- **Pixels_Per_Second**: The zoom level determining how many pixels represent one second of time
- **Trim_Handle**: The draggable edge of a clip used to adjust its start or end time
- **Snap_System**: The magnetic alignment system that helps clips align to the playhead, other clips, or time markers
- **Waveform**: Visual representation of audio amplitude over time
- **Filmstrip**: Horizontal strip of video thumbnails representing visual content
- **Coordinate_System**: The mapping between time (seconds) and horizontal position (pixels) in the React_Layer
- **State_Manager**: The centralized state management system (Zustand) in React_Layer that maintains timeline UI state
- **Canvas_Renderer**: The React component that displays pre-rendered frames from Rust_Core
- **Thumbnail_Engine**: The Rust component that extracts and caches video thumbnails using FFmpeg
- **Frame_Extraction_Engine**: The Rust component that extracts individual frames at precise timestamps
- **Audio_Engine**: The Rust component that decodes audio, provides timing authority, and mixes tracks
- **Render_Graph**: The Rust component that generates FFmpeg filter graphs for video export
- **Export_Pipeline**: The complete export system coordinating React_Layer and Rust_Core for final video rendering

## Requirements

### Requirement 1: Timeline Coordinate System (React Layer)

**User Story:** As a video editor, I want a consistent coordinate system, so that I can understand the relationship between time and visual position on the timeline.

#### Acceptance Criteria

1. THE React_Layer SHALL map time values to horizontal pixel positions using the formula: `x = time * Pixels_Per_Second`
2. THE React_Layer SHALL map horizontal pixel positions to time values using the formula: `time = x / Pixels_Per_Second`
3. WHEN the Pixels_Per_Second value changes, THE React_Layer SHALL recalculate all clip positions while preserving their time values
4. THE React_Layer SHALL maintain a minimum Pixels_Per_Second value of 16 pixels per second
5. THE React_Layer SHALL maintain a maximum Pixels_Per_Second value of 320 pixels per second
6. FOR ALL time-to-pixel conversions followed by pixel-to-time conversions, THE React_Layer SHALL produce time values within 0.001 seconds of the original (round-trip property)

### Requirement 2: Zoom Control (React Layer)

**User Story:** As a video editor, I want to zoom in and out of the timeline, so that I can see fine details or get an overview of my project.

#### Acceptance Criteria

1. WHEN the user performs a pinch gesture on a trackpad, THE React_Layer SHALL adjust the Pixels_Per_Second value proportionally to the gesture magnitude
2. WHEN the user adjusts the zoom slider, THE React_Layer SHALL update the Pixels_Per_Second value to match the slider position
3. WHEN zooming occurs, THE React_Layer SHALL keep the time value under the cursor position stable (zoom-to-cursor behavior)
4. THE React_Layer SHALL clamp zoom values between 16 and 320 pixels per second
5. WHEN the Pixels_Per_Second value is below 26, THE React_Layer SHALL hide tenth-second tick marks
6. WHEN the Pixels_Per_Second value is below 70, THE React_Layer SHALL hide frame tick marks
7. WHEN the Pixels_Per_Second value is 70 or above AND pixels per frame is 11 or greater, THE React_Layer SHALL display frame tick marks at 2-frame or 4-frame intervals

### Requirement 3: Time Ruler Display

**User Story:** As a video editor, I want to see time markers on the timeline, so that I can understand the temporal position of clips.

#### Acceptance Criteria

1. THE Time_Ruler SHALL display major tick marks at intervals determined by the current zoom level
2. WHEN Pixels_Per_Second is 100 or greater, THE Time_Ruler SHALL use 1-second intervals for major ticks
3. WHEN Pixels_Per_Second is between 48 and 99, THE Time_Ruler SHALL use 2-second intervals for major ticks
4. WHEN Pixels_Per_Second is between 24 and 47, THE Time_Ruler SHALL use 5-second intervals for major ticks
5. WHEN Pixels_Per_Second is below 24, THE Time_Ruler SHALL use 10-second intervals for major ticks
6. THE Time_Ruler SHALL display time labels in MM:SS format for times under 60 minutes
7. THE Time_Ruler SHALL display time labels in HH:MM:SS format for times 60 minutes or longer
8. WHEN Pixels_Per_Second is 26 or greater, THE Time_Ruler SHALL display tenth-second subdivision marks

### Requirement 4: Playhead Control (React Layer)

**User Story:** As a video editor, I want to control the playhead position, so that I can navigate to specific points in my video.

#### Acceptance Criteria

1. WHEN the user clicks on the timeline, THE React_Layer SHALL move the Playhead to the clicked time position
2. WHEN the user drags on the timeline, THE React_Layer SHALL continuously update the Playhead position to follow the pointer
3. THE React_Layer SHALL synchronize the Playhead position with the Canvas_Renderer current time
4. WHEN the Canvas_Renderer time updates during playback, THE React_Layer SHALL update the Playhead visual position
5. WHEN the Playhead moves outside the visible viewport, THE React_Layer SHALL auto-scroll to keep the Playhead visible with a 15% margin
6. THE Playhead SHALL be rendered as a vertical line with a triangular handle at the top
7. THE Playhead SHALL remain visible when scrolling horizontally (positioned absolutely relative to viewport)
8. WHEN the Playhead moves, THE React_Layer SHALL request the current frame from Rust_Core via extract_frame command

### Requirement 5: Clip Positioning

**User Story:** As a video editor, I want to place clips at specific times on the timeline, so that I can arrange my video content.

#### Acceptance Criteria

1. THE Timeline_Engine SHALL position each Clip at horizontal coordinate `x = Clip.startTime * Pixels_Per_Second`
2. THE Timeline_Engine SHALL render each Clip with width `w = Clip.duration * Pixels_Per_Second`
3. WHEN a Clip duration is less than 0.01 seconds, THE Timeline_Engine SHALL render the Clip with a minimum width of 8 pixels
4. THE Timeline_Engine SHALL assign each Clip to exactly one Track
5. THE Timeline_Engine SHALL render Clips on higher-numbered Tracks above Clips on lower-numbered Tracks
6. WHEN two Clips on the same Track overlap in time, THE Timeline_Engine SHALL render the later Clip above the earlier Clip

### Requirement 6: Clip Dragging

**User Story:** As a video editor, I want to drag clips to different positions, so that I can rearrange my video sequence.

#### Acceptance Criteria

1. WHEN the user presses the pointer on a Clip, THE Timeline_Engine SHALL enter drag mode for that Clip
2. WHILE in drag mode, THE Timeline_Engine SHALL update the Clip start time based on pointer horizontal movement
3. WHEN the user releases the pointer, THE Timeline_Engine SHALL commit the new Clip position and exit drag mode
4. THE Timeline_Engine SHALL clamp Clip start times to be non-negative
5. THE Timeline_Engine SHALL clamp Clip end times to not exceed the total timeline duration
6. WHEN the Snap_System is enabled AND the Clip edge is within 8 pixels of a snap target, THE Timeline_Engine SHALL align the Clip to the snap target
7. THE Timeline_Engine SHALL provide visual feedback during dragging by updating the Clip position in real-time

### Requirement 7: Clip Trimming

**User Story:** As a video editor, I want to trim the start and end of clips, so that I can remove unwanted portions.

#### Acceptance Criteria

1. WHEN the user hovers over the left edge of a Clip, THE Timeline_Engine SHALL display a resize cursor
2. WHEN the user hovers over the right edge of a Clip, THE Timeline_Engine SHALL display a resize cursor
3. WHEN the user drags the left Trim_Handle, THE Timeline_Engine SHALL adjust the Clip start time while keeping the end time fixed
4. WHEN the user drags the right Trim_Handle, THE Timeline_Engine SHALL adjust the Clip end time while keeping the start time fixed
5. THE Timeline_Engine SHALL prevent trimming that would result in a Clip duration less than 0.1 seconds
6. THE Timeline_Engine SHALL prevent trimming beyond the source media boundaries
7. WHEN the Snap_System is enabled AND a Trim_Handle is within 8 pixels of a snap target, THE Timeline_Engine SHALL snap the handle to the target

### Requirement 8: Snap System

**User Story:** As a video editor, I want clips to snap to important positions, so that I can align content precisely without manual adjustment.

#### Acceptance Criteria

1. WHEN snap-to-playhead is enabled AND a Clip edge is within 8 pixels of the Playhead, THE Snap_System SHALL align the Clip edge to the Playhead time
2. WHEN snap-to-clip is enabled AND a Clip edge is within 8 pixels of another Clip edge, THE Snap_System SHALL align the edges
3. WHEN snap-to-markers is enabled AND a Clip edge is within 8 pixels of a time marker, THE Snap_System SHALL align the Clip edge to the marker time
4. THE Snap_System SHALL provide visual feedback by displaying a vertical snap line at the snap position
5. THE Snap_System SHALL prioritize the closest snap target when multiple targets are within range
6. THE Timeline_Engine SHALL allow users to toggle snap-to-playhead, snap-to-clip, and snap-to-markers independently

### Requirement 9: Track Management

**User Story:** As a video editor, I want to organize clips into separate tracks, so that I can layer video, audio, and text content.

#### Acceptance Criteria

1. THE Timeline_Engine SHALL support at least 10 simultaneous Tracks
2. THE Timeline_Engine SHALL assign each Track a unique identifier
3. THE Timeline_Engine SHALL assign each Track a type (video, audio, text, or effects)
4. THE Timeline_Engine SHALL render Track headers showing the Track name and type
5. WHEN the user clicks a Track lock button, THE Timeline_Engine SHALL prevent editing of Clips on that Track
6. WHEN the user clicks a Track visibility button, THE Timeline_Engine SHALL hide the Track from the Video_Preview
7. WHEN the user clicks a Track mute button, THE Timeline_Engine SHALL exclude the Track audio from playback and export
8. THE Timeline_Engine SHALL allow users to reorder Tracks by dragging Track headers

### Requirement 10: Waveform Visualization (Rust + React)

**User Story:** As a video editor, I want to see audio waveforms, so that I can identify audio content and align clips to audio cues.

#### Acceptance Criteria

1. WHEN a Clip contains audio, THE React_Layer SHALL request waveform data from Rust_Core via generate_waveform command
2. THE Audio_Engine SHALL generate waveform peak data by sampling audio amplitude at regular intervals
3. THE Audio_Engine SHALL use a default of 1000 sample buckets for waveform generation
4. THE Audio_Engine SHALL emit waveform_ready events when data is available
5. THE React_Layer SHALL render the Waveform using HTML canvas for performance
6. THE Waveform SHALL display audio amplitude as a vertical envelope centered in the Clip audio region
7. THE React_Layer SHALL support high-DPI displays by scaling canvas resolution with device pixel ratio
8. WHEN waveform generation is in progress, THE React_Layer SHALL display a loading indicator

### Requirement 11: Filmstrip Visualization (Rust + React)

**User Story:** As a video editor, I want to see video thumbnails on the timeline, so that I can identify visual content without playing the video.

#### Acceptance Criteria

1. WHEN a Clip contains video, THE React_Layer SHALL request thumbnails from Rust_Core via get_thumbnails command
2. THE Thumbnail_Engine SHALL extract frames at evenly-spaced intervals across the Clip duration
3. THE Filmstrip SHALL contain between 18 and 72 frames depending on Clip duration and zoom level
4. THE Thumbnail_Engine SHALL emit thumbnail_ready events as thumbnails become available
5. THE React_Layer SHALL render thumbnails progressively as they arrive
6. THE Filmstrip SHALL be rendered as a horizontal strip with all frames side-by-side
7. THE Filmstrip SHALL maintain the source video aspect ratio without distortion
8. THE Thumbnail_Engine SHALL compress thumbnails as JPEG with 0.85 quality
9. WHEN thumbnail generation is in progress, THE React_Layer SHALL display a loading indicator

### Requirement 12: Clip Splitting

**User Story:** As a video editor, I want to split clips at the playhead position, so that I can separate content into multiple segments.

#### Acceptance Criteria

1. WHEN the user activates the split tool AND clicks on a Clip, THE Timeline_Engine SHALL split the Clip at the Playhead time
2. THE Timeline_Engine SHALL create two new Clips from the split operation
3. THE first new Clip SHALL have start time equal to the original Clip start time and end time equal to the Playhead time
4. THE second new Clip SHALL have start time equal to the Playhead time and end time equal to the original Clip end time
5. THE Timeline_Engine SHALL remove the original Clip after splitting
6. THE Timeline_Engine SHALL preserve all Clip properties (track assignment, effects, etc.) in both new Clips
7. IF the Playhead is not within the Clip boundaries, THEN THE Timeline_Engine SHALL not perform the split operation

### Requirement 13: Clip Deletion

**User Story:** As a video editor, I want to delete clips, so that I can remove unwanted content from my timeline.

#### Acceptance Criteria

1. WHEN the user selects a Clip AND presses the delete key, THE Timeline_Engine SHALL remove the Clip from the timeline
2. WHEN the user activates the delete tool AND clicks on a Clip, THE Timeline_Engine SHALL remove the Clip from the timeline
3. THE Timeline_Engine SHALL remove all references to the deleted Clip from the State_Manager
4. THE Timeline_Engine SHALL not automatically move other Clips to fill the gap (no ripple delete in MVP)
5. WHEN multiple Clips are selected, THE Timeline_Engine SHALL delete all selected Clips
6. THE Timeline_Engine SHALL add the delete operation to the undo history

### Requirement 14: Undo and Redo

**User Story:** As a video editor, I want to undo and redo my actions, so that I can experiment without fear of losing work.

#### Acceptance Criteria

1. THE Timeline_Engine SHALL record all state-modifying operations in an undo history
2. WHEN the user activates undo, THE Timeline_Engine SHALL revert the most recent operation and restore the previous state
3. WHEN the user activates redo, THE Timeline_Engine SHALL reapply the most recently undone operation
4. THE Timeline_Engine SHALL support at least 50 undo levels
5. WHEN a new operation is performed after undo, THE Timeline_Engine SHALL clear the redo history
6. THE Timeline_Engine SHALL support undo for clip drag, trim, split, delete, and track operations
7. THE Timeline_Engine SHALL provide keyboard shortcuts Ctrl+Z for undo and Ctrl+Shift+Z for redo

### Requirement 15: State Management

**User Story:** As a developer, I want centralized state management, so that timeline data is consistent across all components.

#### Acceptance Criteria

1. THE State_Manager SHALL maintain a single source of truth for all timeline data
2. THE State_Manager SHALL store Clip data including id, startTime, duration, trackId, sourceMediaPath, and type
3. THE State_Manager SHALL store Track data including id, name, type, locked, visible, and muted properties
4. THE State_Manager SHALL store Playhead position, zoom level, and scroll position
5. THE State_Manager SHALL provide actions for all timeline operations (addClip, updateClip, deleteClip, etc.)
6. THE State_Manager SHALL notify subscribed components when state changes occur
7. THE State_Manager SHALL serialize timeline state to JSON for saving and loading projects

### Requirement 16: Performance Optimization (React + Rust)

**User Story:** As a video editor, I want smooth timeline performance, so that I can work efficiently with large projects.

#### Acceptance Criteria

1. WHEN the timeline contains more than 100 Clips, THE React_Layer SHALL use virtualization to render only visible Clips
2. THE React_Layer SHALL use canvas rendering for Waveform visualization to minimize DOM nodes
3. THE React_Layer SHALL debounce scroll events to reduce render frequency (16ms debounce)
4. THE React_Layer SHALL memoize expensive calculations (ruler ticks, clip positions) based on dependencies
5. THE Rust_Core SHALL cancel in-progress thumbnail and waveform generation when new requests arrive
6. THE React_Layer SHALL maintain 60 FPS during playhead scrubbing for timelines up to 1 hour duration
7. THE Timeline_Engine SHALL load and render a 100-clip timeline in under 2 seconds
8. THE Rust_Core SHALL process thumbnail requests at a rate of at least 10 frames per second

### Requirement 17: Keyboard Shortcuts

**User Story:** As a video editor, I want keyboard shortcuts, so that I can work efficiently without constantly reaching for the mouse.

#### Acceptance Criteria

1. WHEN the user presses Space, THE Timeline_Engine SHALL toggle playback
2. WHEN the user presses Left Arrow, THE Timeline_Engine SHALL move the Playhead backward by 1 frame
3. WHEN the user presses Right Arrow, THE Timeline_Engine SHALL move the Playhead forward by 1 frame
4. WHEN the user presses Home, THE Timeline_Engine SHALL move the Playhead to time 0
5. WHEN the user presses End, THE Timeline_Engine SHALL move the Playhead to the timeline end
6. WHEN the user presses Delete, THE Timeline_Engine SHALL delete selected Clips
7. WHEN the user presses S, THE Timeline_Engine SHALL activate the split tool
8. WHEN the user presses V, THE Timeline_Engine SHALL activate the selection tool
9. WHEN the user presses Plus, THE Timeline_Engine SHALL zoom in
10. WHEN the user presses Minus, THE Timeline_Engine SHALL zoom out

### Requirement 18: Export Pipeline Integration (Rust + React)

**User Story:** As a video editor, I want to export my edited timeline, so that I can share the final video.

#### Acceptance Criteria

1. WHEN the user initiates export, THE React_Layer SHALL send timeline state to Rust_Core via render_project command
2. THE Render_Graph SHALL generate an FFmpeg filter_complex graph based on timeline state
3. THE Render_Graph SHALL include trim operations for each Clip based on startTime and duration
4. THE Render_Graph SHALL layer Clips according to Track order using FFmpeg filter_complex
5. THE Render_Graph SHALL respect Track mute settings by excluding muted audio tracks
6. THE Render_Graph SHALL respect Track visibility settings by excluding hidden video tracks
7. THE Rust_Core SHALL execute the FFmpeg command and emit render_progress events
8. THE React_Layer SHALL display progress percentage based on render_progress events
9. THE Rust_Core SHALL validate that all source media files exist before starting export
10. IF any source media file is missing, THEN THE Rust_Core SHALL return a descriptive error message via render_error event

### Requirement 19: Multi-Clip Selection

**User Story:** As a video editor, I want to select multiple clips, so that I can perform batch operations.

#### Acceptance Criteria

1. WHEN the user clicks on a Clip, THE Timeline_Engine SHALL select that Clip and deselect others
2. WHEN the user Ctrl+clicks on a Clip, THE Timeline_Engine SHALL toggle that Clip selection without affecting others
3. WHEN the user Shift+clicks on a Clip, THE Timeline_Engine SHALL select all Clips between the last selected Clip and the clicked Clip
4. WHEN the user drags a selection rectangle, THE Timeline_Engine SHALL select all Clips intersecting the rectangle
5. THE Timeline_Engine SHALL render selected Clips with a highlight border
6. WHEN multiple Clips are selected, THE Timeline_Engine SHALL apply drag operations to all selected Clips simultaneously
7. WHEN multiple Clips are selected, THE Timeline_Engine SHALL apply delete operations to all selected Clips

### Requirement 20: Accessibility

**User Story:** As a user with disabilities, I want the timeline to be accessible, so that I can edit videos using assistive technologies.

#### Acceptance Criteria

1. THE Timeline_Engine SHALL provide ARIA labels for all interactive elements
2. THE Timeline_Engine SHALL support keyboard navigation for all timeline operations
3. THE Timeline_Engine SHALL provide focus indicators for keyboard navigation
4. THE Timeline_Engine SHALL announce state changes to screen readers using ARIA live regions
5. THE Timeline_Engine SHALL maintain a minimum contrast ratio of 4.5:1 for text elements
6. THE Timeline_Engine SHALL support browser zoom up to 200% without loss of functionality
7. THE Timeline_Engine SHALL provide text alternatives for visual-only information (waveforms, filmstrips)

### Requirement 21: Timeline Parsing and Serialization

**User Story:** As a developer, I want to save and load timeline projects, so that users can persist their work.

#### Acceptance Criteria

1. WHEN the user saves a project, THE Timeline_Parser SHALL serialize the timeline state to JSON format
2. WHEN the user loads a project, THE Timeline_Parser SHALL parse the JSON and reconstruct the timeline state
3. THE Timeline_Parser SHALL validate the JSON structure against a schema before parsing
4. IF the JSON is invalid, THEN THE Timeline_Parser SHALL return a descriptive error message
5. THE Timeline_Pretty_Printer SHALL format timeline JSON with proper indentation for human readability
6. FOR ALL valid timeline states, serializing then parsing SHALL produce an equivalent state (round-trip property)
7. THE Timeline_Parser SHALL handle missing optional fields by using default values

### Requirement 22: Error Handling

**User Story:** As a video editor, I want clear error messages, so that I can understand and fix problems.

#### Acceptance Criteria

1. WHEN a media file cannot be loaded, THE Timeline_Engine SHALL display an error message with the file path and error reason
2. WHEN Waveform generation fails, THE Timeline_Engine SHALL display a fallback message and continue without the waveform
3. WHEN Filmstrip generation fails, THE Timeline_Engine SHALL display a fallback message and continue without the filmstrip
4. WHEN export fails, THE Export_Pipeline SHALL display the FFmpeg error output
5. WHEN an invalid operation is attempted (e.g., trim beyond boundaries), THE Timeline_Engine SHALL prevent the operation and show a tooltip explanation
6. THE Timeline_Engine SHALL log all errors to the console with sufficient context for debugging
7. THE Timeline_Engine SHALL not crash when encountering invalid state; instead it SHALL recover to a valid state

### Requirement 23: Track Type Constraints

**User Story:** As a video editor, I want tracks to enforce content type rules, so that I don't accidentally place incompatible content.

#### Acceptance Criteria

1. WHEN a Track type is "video", THE Timeline_Engine SHALL only allow Clips with video content on that Track
2. WHEN a Track type is "audio", THE Timeline_Engine SHALL only allow Clips with audio content on that Track
3. WHEN a Track type is "text", THE Timeline_Engine SHALL only allow Clips with text/caption content on that Track
4. WHEN the user attempts to place a Clip on an incompatible Track, THE Timeline_Engine SHALL prevent the operation and show a warning
5. THE Timeline_Engine SHALL allow Clips with both video and audio content on video Tracks
6. THE Timeline_Engine SHALL extract only audio from video Clips placed on audio Tracks
7. THE Timeline_Engine SHALL provide visual indicators for Track type (icon or color coding)

### Requirement 24: Frame-Accurate Positioning

**User Story:** As a video editor, I want frame-accurate control, so that I can make precise edits.

#### Acceptance Criteria

1. THE Timeline_Engine SHALL quantize all time values to frame boundaries when frame-snap is enabled
2. THE Timeline_Engine SHALL calculate frame boundaries using the formula: `frameTime = frameNumber / FPS`
3. WHEN frame-snap is enabled AND the user positions a Clip, THE Timeline_Engine SHALL round the time to the nearest frame
4. WHEN frame-snap is enabled AND the user moves the Playhead, THE Timeline_Engine SHALL round the time to the nearest frame
5. THE Timeline_Engine SHALL support frame rates of 24, 25, 30, 50, and 60 FPS
6. THE Timeline_Engine SHALL display frame numbers in the Time_Ruler when zoomed to 70 pixels per second or greater
7. FOR ALL frame-snapped positions, THE Timeline_Engine SHALL maintain accuracy within 0.001 seconds of the calculated frame time

### Requirement 25: Scroll and Pan

**User Story:** As a video editor, I want to scroll and pan the timeline, so that I can navigate long projects.

#### Acceptance Criteria

1. WHEN the timeline content width exceeds the viewport width, THE Timeline_Engine SHALL display a horizontal scrollbar
2. THE Timeline_Engine SHALL allow horizontal scrolling via scrollbar, mouse wheel, or trackpad gestures
3. THE Timeline_Engine SHALL keep the Time_Ruler visible during vertical scrolling (sticky positioning)
4. THE Timeline_Engine SHALL keep Track headers visible during horizontal scrolling (sticky positioning)
5. THE Timeline_Engine SHALL keep the Playhead visible during scrolling by positioning it relative to the viewport
6. WHEN the user scrolls, THE Timeline_Engine SHALL update the visible Clip range for virtualization
7. THE Timeline_Engine SHALL maintain scroll position when zooming (except during zoom-to-cursor)

### Requirement 26: Rust Thumbnail Engine

**User Story:** As a video editor, I want fast thumbnail generation, so that I can see video content on the timeline without delays.

#### Acceptance Criteria

1. THE Thumbnail_Engine SHALL extract video frames using FFmpeg at specified timestamps
2. THE Thumbnail_Engine SHALL cache extracted thumbnails on disk to avoid redundant extraction
3. THE Thumbnail_Engine SHALL support multi-resolution thumbnail generation (low, medium, high quality)
4. WHEN a thumbnail is requested, THE Thumbnail_Engine SHALL check the disk cache before extracting
5. THE Thumbnail_Engine SHALL generate thumbnails asynchronously without blocking the UI thread
6. THE Thumbnail_Engine SHALL emit thumbnail_ready events via Tauri_IPC when thumbnails are available
7. THE Thumbnail_Engine SHALL prioritize thumbnail extraction based on proximity to the playhead
8. THE Thumbnail_Engine SHALL extract thumbnails at a rate of at least 10 frames per second
9. THE Thumbnail_Engine SHALL compress thumbnails as JPEG with configurable quality (default 0.85)

### Requirement 27: Rust Frame Extraction Engine

**User Story:** As a video editor, I want accurate frame extraction for preview, so that I can see the exact frame at the playhead position.

#### Acceptance Criteria

1. THE Frame_Extraction_Engine SHALL extract individual frames at precise timestamps using FFmpeg
2. THE Frame_Extraction_Engine SHALL maintain frame accuracy within 1/60th of a second
3. THE Frame_Extraction_Engine SHALL cache recently extracted frames in memory (LRU cache with 50 frame limit)
4. THE Frame_Extraction_Engine SHALL support frame extraction from multiple video formats (MP4, MOV, AVI, MKV)
5. WHEN a frame is requested via Tauri_IPC, THE Frame_Extraction_Engine SHALL return the frame data within 100ms for cached frames
6. WHEN a frame is not cached, THE Frame_Extraction_Engine SHALL extract and return it within 500ms
7. THE Frame_Extraction_Engine SHALL handle concurrent frame extraction requests using a thread pool
8. THE Frame_Extraction_Engine SHALL return frames as raw RGBA pixel data or compressed JPEG based on request parameters

### Requirement 28: Rust Audio Engine

**User Story:** As a video editor, I want accurate audio playback and waveform generation, so that I can edit to audio cues.

#### Acceptance Criteria

1. THE Audio_Engine SHALL decode audio from video files using FFmpeg
2. THE Audio_Engine SHALL generate waveform peak data by sampling audio amplitude at regular intervals
3. THE Audio_Engine SHALL use a default of 1000 sample buckets for waveform generation
4. THE Audio_Engine SHALL cache waveform data on disk to avoid redundant generation
5. THE Audio_Engine SHALL support audio track mixing for multi-track playback
6. THE Audio_Engine SHALL provide timing authority for audio-video synchronization
7. THE Audio_Engine SHALL support audio formats including AAC, MP3, WAV, and FLAC
8. WHEN waveform generation is requested via Tauri_IPC, THE Audio_Engine SHALL return peak data within 2 seconds for a 5-minute audio clip
9. THE Audio_Engine SHALL emit waveform_ready events via Tauri_IPC when waveform data is available

### Requirement 29: Rust Render Graph

**User Story:** As a video editor, I want efficient video export, so that I can render my final video quickly.

#### Acceptance Criteria

1. THE Render_Graph SHALL generate FFmpeg filter_complex graphs from timeline state
2. THE Render_Graph SHALL optimize the filter graph by combining adjacent operations
3. THE Render_Graph SHALL support video layering based on track order
4. THE Render_Graph SHALL support trim operations for each clip based on startTime and duration
5. THE Render_Graph SHALL support audio mixing for multiple audio tracks
6. THE Render_Graph SHALL respect track mute settings by excluding muted audio tracks
7. THE Render_Graph SHALL respect track visibility settings by excluding hidden video tracks
8. THE Render_Graph SHALL validate the filter graph before execution
9. IF the filter graph is invalid, THEN THE Render_Graph SHALL return a descriptive error message via Tauri_IPC

### Requirement 30: Tauri IPC Commands

**User Story:** As a developer, I want a clear IPC interface, so that React and Rust can communicate efficiently.

#### Acceptance Criteria

1. THE Tauri_IPC SHALL provide a get_thumbnails command that accepts (video_path, timestamps, quality) and returns thumbnail data
2. THE Tauri_IPC SHALL provide an extract_frame command that accepts (video_path, timestamp) and returns frame data
3. THE Tauri_IPC SHALL provide a generate_waveform command that accepts (audio_path, sample_count) and returns peak data
4. THE Tauri_IPC SHALL provide a render_project command that accepts (timeline_json, output_path, export_options) and initiates export
5. THE Tauri_IPC SHALL provide a cancel_render command that stops an in-progress export
6. THE Tauri_IPC SHALL provide a clear_cache command that removes cached thumbnails and frames
7. ALL Tauri_IPC commands SHALL return results asynchronously using Rust async/await
8. ALL Tauri_IPC commands SHALL include error handling and return descriptive error messages on failure
9. THE Tauri_IPC SHALL validate all command parameters before execution

### Requirement 31: Tauri IPC Events

**User Story:** As a developer, I want event-based communication, so that Rust can notify React of asynchronous operations.

#### Acceptance Criteria

1. THE Tauri_IPC SHALL emit a thumbnail_ready event when a thumbnail is generated, including (video_path, timestamp, thumbnail_data)
2. THE Tauri_IPC SHALL emit a waveform_ready event when waveform data is generated, including (audio_path, peak_data)
3. THE Tauri_IPC SHALL emit a render_progress event during export, including (percentage, current_frame, total_frames)
4. THE Tauri_IPC SHALL emit a render_complete event when export finishes successfully, including (output_path, duration)
5. THE Tauri_IPC SHALL emit a render_error event when export fails, including (error_message, error_code)
6. THE Tauri_IPC SHALL emit a cache_cleared event when cache is cleared, including (freed_bytes)
7. THE React_Layer SHALL subscribe to all Tauri_IPC events and update UI state accordingly
8. ALL Tauri_IPC events SHALL include a timestamp for debugging and logging purposes

### Requirement 32: React Canvas Renderer

**User Story:** As a video editor, I want smooth preview playback, so that I can see my edits in real-time.

#### Acceptance Criteria

1. THE Canvas_Renderer SHALL display frames received from the Frame_Extraction_Engine
2. THE Canvas_Renderer SHALL render frames to an HTML canvas element
3. THE Canvas_Renderer SHALL maintain the source video aspect ratio without distortion
4. THE Canvas_Renderer SHALL support high-DPI displays by scaling canvas resolution with device pixel ratio
5. THE Canvas_Renderer SHALL cache frames as ImageBitmap objects for fast rendering
6. THE Canvas_Renderer SHALL clear the canvas when no frame is available
7. THE Canvas_Renderer SHALL synchronize frame display with the playhead position
8. THE Canvas_Renderer SHALL request frames from Rust_Core via Tauri_IPC when the playhead moves
9. THE Canvas_Renderer SHALL maintain 60 FPS during playback for cached frames

### Requirement 33: Performance - Virtualization

**User Story:** As a video editor, I want smooth timeline performance with large projects, so that I can work efficiently.

#### Acceptance Criteria

1. WHEN the timeline contains more than 100 Clips, THE React_Layer SHALL render only clips visible in the viewport plus a 2-second buffer
2. THE React_Layer SHALL calculate the visible time range based on scrollLeft and viewport width
3. THE React_Layer SHALL update the visible clip range when scrolling occurs
4. THE React_Layer SHALL use React.memo to prevent unnecessary re-renders of clip components
5. THE React_Layer SHALL maintain 60 FPS during scrolling for timelines with up to 500 clips
6. THE React_Layer SHALL debounce scroll events to reduce render frequency (16ms debounce)
7. THE React_Layer SHALL load and render a 100-clip timeline in under 2 seconds

### Requirement 34: Performance - Multi-Layer Caching

**User Story:** As a video editor, I want fast frame access, so that scrubbing is responsive.

#### Acceptance Criteria

1. THE Rust_Core SHALL maintain a disk cache for thumbnails with LRU eviction policy
2. THE Rust_Core SHALL maintain an in-memory frame cache with LRU eviction policy (50 frame limit)
3. THE React_Layer SHALL maintain an ImageBitmap cache for rendered frames (30 frame limit)
4. WHEN a frame is requested, THE Frame_Extraction_Engine SHALL check memory cache, then disk cache, then extract
5. THE Rust_Core SHALL cache thumbnails with a maximum disk usage of 500MB per project
6. THE Rust_Core SHALL evict least-recently-used cache entries when limits are exceeded
7. THE React_Layer SHALL clear its ImageBitmap cache when memory pressure is detected
8. THE Rust_Core SHALL persist cache metadata to enable cache reuse across application restarts

### Requirement 35: Performance - Priority Queue

**User Story:** As a video editor, I want frames near the playhead to load first, so that scrubbing is responsive.

#### Acceptance Criteria

1. THE Thumbnail_Engine SHALL prioritize thumbnail extraction based on distance from the playhead
2. THE Thumbnail_Engine SHALL assign highest priority to thumbnails within 5 seconds of the playhead
3. THE Thumbnail_Engine SHALL assign medium priority to thumbnails within 10 seconds of the playhead
4. THE Thumbnail_Engine SHALL assign low priority to thumbnails beyond 10 seconds from the playhead
5. WHEN the playhead moves, THE Thumbnail_Engine SHALL re-prioritize pending extraction requests
6. THE Thumbnail_Engine SHALL cancel low-priority requests when high-priority requests are queued
7. THE Frame_Extraction_Engine SHALL process frame requests in FIFO order (no priority queue for single frames)
8. THE Thumbnail_Engine SHALL process at least 10 high-priority thumbnails per second

### Requirement 36: Architecture - React Responsibilities

**User Story:** As a developer, I want clear architectural boundaries, so that I know where to implement features.

#### Acceptance Criteria

1. THE React_Layer SHALL be responsible for timeline UI rendering (ruler, tracks, clips, playhead)
2. THE React_Layer SHALL be responsible for user interaction handling (drag, trim, split, selection)
3. THE React_Layer SHALL be responsible for viewport calculations (visible time range, clip positions)
4. THE React_Layer SHALL be responsible for coordinate system math (time-to-pixel, pixel-to-time)
5. THE React_Layer SHALL be responsible for UI state management using Zustand
6. THE React_Layer SHALL NOT perform frame extraction, thumbnail generation, or audio processing
7. THE React_Layer SHALL NOT execute FFmpeg commands or perform video encoding
8. THE React_Layer SHALL orchestrate Rust_Core operations via Tauri_IPC commands

### Requirement 37: Architecture - Rust Responsibilities

**User Story:** As a developer, I want clear architectural boundaries, so that I know where to implement features.

#### Acceptance Criteria

1. THE Rust_Core SHALL be responsible for frame extraction using FFmpeg
2. THE Rust_Core SHALL be responsible for thumbnail generation and caching
3. THE Rust_Core SHALL be responsible for audio decoding and waveform generation
4. THE Rust_Core SHALL be responsible for render graph generation and video export
5. THE Rust_Core SHALL be responsible for all disk I/O operations (cache management, file reading)
6. THE Rust_Core SHALL be responsible for all FFmpeg integration
7. THE Rust_Core SHALL NOT perform UI rendering or user interaction handling
8. THE Rust_Core SHALL NOT manage timeline UI state (clips, tracks, playhead position)
9. THE Rust_Core SHALL expose all functionality via Tauri_IPC commands and events

### Requirement 38: Evolution Plan - v1 MVP

**User Story:** As a developer, I want a clear evolution plan, so that I can build incrementally.

#### Acceptance Criteria

1. THE v1 MVP SHALL use JavaScript Canvas_Renderer for preview display
2. THE v1 MVP SHALL use basic thumbnail extraction without priority queue
3. THE v1 MVP SHALL use simple audio-video synchronization based on playhead time
4. THE v1 MVP SHALL support single-track video and audio editing
5. THE v1 MVP SHALL support basic export using FFmpeg filter_complex
6. THE v1 MVP SHALL implement disk caching for thumbnails
7. THE v1 MVP SHALL implement in-memory caching for frames (50 frame limit)
8. THE v1 MVP SHALL provide get_thumbnails, extract_frame, and render_project Tauri commands

### Requirement 39: Evolution Plan - v1.5 Enhancements

**User Story:** As a developer, I want a clear evolution plan, so that I can build incrementally.

#### Acceptance Criteria

1. THE v1.5 SHALL implement the Rust Thumbnail_Engine with async streaming
2. THE v1.5 SHALL implement priority-based thumbnail extraction
3. THE v1.5 SHALL implement thumbnail_ready events for progressive loading
4. THE v1.5 SHALL implement multi-resolution thumbnail support
5. THE v1.5 SHALL implement waveform generation in Rust_Core
6. THE v1.5 SHALL implement waveform_ready events
7. THE v1.5 SHALL optimize cache eviction policies based on usage patterns
8. THE v1.5 SHALL support multi-track video and audio editing

### Requirement 40: Evolution Plan - v2 Advanced Features

**User Story:** As a developer, I want a clear evolution plan, so that I can build incrementally.

#### Acceptance Criteria

1. THE v2 SHALL implement a Rust playback engine for real-time preview
2. THE v2 SHALL implement audio-driven clock for precise audio-video sync
3. THE v2 SHALL implement GPU-accelerated rendering using wgpu or similar
4. THE v2 SHALL implement real-time effects preview
5. THE v2 SHALL implement background rendering for export
6. THE v2 SHALL implement render queue for batch exports
7. THE v2 SHALL implement hardware-accelerated video decoding
8. THE v2 SHALL support 4K and higher resolution editing
