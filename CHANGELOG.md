# Changelog

All notable changes to Clypra are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Text rendering system with deterministic font loading
- Canvas-based text rasterization with wrapping and alignment
- Font loading system with caching

### Changed

- Updated TextClip model with new properties (fontWeight, fontStyle, align, valign)

### Fixed

- Text now renders identically in preview and export (no layout drift)

## [0.1.0] - TBD

### Added

- Import video, audio, and image files (MP4, MOV, AVI, MKV, WebM, MP3, WAV, PNG, JPG)
- Timeline with multi-track support
- Trim clips with left/right handles
- Split clips at playhead (S key)
- Delete clips
- Move clips on timeline
- Drag and drop import
- Source preview with scrubbing
- Program preview with canvas compositor
- Playback with AudioContext master clock
- Text clips with font customization
- Export to MP4 with FFmpeg
- Project save and load
- Recent projects on launch screen
- Undo/redo (100 levels)
- Filmstrip thumbnails with multi-density system
- Audio waveforms on clips
- Timeline zoom
- Keyboard shortcuts (Space, S, Cmd+Z, Cmd+Shift+Z)

### Known Issues

- No transitions between clips (planned for 0.2.0)
- No color grading (on roadmap)
- No audio mixing controls (on roadmap)
- No effects or filters (on roadmap)

## Release Notes

### v0.1.0 - First Public Release

This is the first public release of Clypra, a free and open-source video editor.

**What works:**

- Complete video editing workflow: import → edit → export
- Text overlays with custom fonts
- Professional-grade timeline with filmstrip thumbnails
- Real-time preview with A/V sync
- Reliable export to MP4

**What doesn't work yet:**

- Transitions (hard cuts only)
- Effects and color grading
- Advanced audio mixing

**Platform support:**

- ✅ macOS (Apple Silicon + Intel)
- ✅ Windows 10/11
- ✅ Linux (Ubuntu 22.04+)

**System requirements:**

- 8GB RAM minimum (16GB recommended)
- 2GB free disk space
- FFmpeg (bundled with app)

---

## Version History

- **0.1.0** - First public release (TBD)
- **0.1.0-beta.1** - Beta testing (TBD)
- **0.1.0-alpha.1** - Internal testing (TBD)
