/**
 * Export Dialog
 *
 * Premium export modal with multi-phase UX:
 *   Configure → Exporting → Complete → Error
 *
 * Features:
 * - Two-column layout: preset card sidebar + config/progress panel
 * - Visual preset cards with resolution badges and quality tier icons
 * - Animated SVG circular progress ring during export
 * - Project summary with live store data
 * - Estimated file size calculation
 * - FFmpeg availability detection
 * - Tauri save dialog integration
 * - Keyboard accessible (Tab/Arrow navigation, Escape to close)
 *
 * Lazy-loaded to reduce initial bundle size.
 * Uses theme-aware styling (respects user's color theme).
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Zap,
  Sparkles,
  Gem,
  Film,
  Clock,
  Monitor,
  HardDrive,
  FolderOpen,
  RotateCcw,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useProjectStore } from "@/store/projectStore";
import { useTimelineStore } from "@/store/timelineStore";
import { MAX_PROJECT_NAME_LENGTH } from "@/types";

// Lazy load video export functionality (code splitting)
const exportVideoModule = () => import("@/lib/videoExport");

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportPreset = "1080p-fast" | "1080p-quality" | "720p-fast" | "4k-quality" | "prores-422hq";

type ExportPhase = "configure" | "exporting" | "complete" | "error";

interface VideoExportProgress {
  currentFrame: number;
  totalFrames: number;
  progress: number;
  etaSeconds: number;
  fps: number;
}

interface ExportResult {
  totalFrames: number;
  totalTimeMs: number;
  avgTimePerFrameMs: number;
}

// ─── Preset Configuration ────────────────────────────────────────────────

interface PresetConfig {
  label: string;
  shortLabel: string;
  resolution: string;
  codec: string;
  codecLabel: string;
  tier: "fast" | "quality" | "pro";
  tierLabel: string;
  width: number;
  height: number;
  codecValue: "h264" | "h265" | "prores";
  preset: "ultrafast" | "fast" | "medium" | "slow" | "veryslow";
  crf: number;
  pixelFormat: "yuv420p" | "yuv444p" | "yuv422p10le";
  /** Rough average bitrate in Mbps for file size estimation */
  estimatedBitrateMbps: number;
}

const PRESET_CONFIGS: Record<ExportPreset, PresetConfig> = {
  "720p-fast": {
    label: "720p Fast",
    shortLabel: "720p",
    resolution: "1280×720",
    codec: "H.264",
    codecLabel: "H.264",
    tier: "fast",
    tierLabel: "Fast",
    width: 1280,
    height: 720,
    codecValue: "h264",
    preset: "fast",
    crf: 23,
    pixelFormat: "yuv420p",
    estimatedBitrateMbps: 4,
  },
  "1080p-fast": {
    label: "1080p Fast",
    shortLabel: "1080p",
    resolution: "1920×1080",
    codec: "H.264",
    codecLabel: "H.264",
    tier: "fast",
    tierLabel: "Fast",
    width: 1920,
    height: 1080,
    codecValue: "h264",
    preset: "fast",
    crf: 23,
    pixelFormat: "yuv420p",
    estimatedBitrateMbps: 8,
  },
  "1080p-quality": {
    label: "1080p Quality",
    shortLabel: "1080p",
    resolution: "1920×1080",
    codec: "H.264",
    codecLabel: "H.264",
    tier: "quality",
    tierLabel: "Quality",
    width: 1920,
    height: 1080,
    codecValue: "h264",
    preset: "slow",
    crf: 18,
    pixelFormat: "yuv420p",
    estimatedBitrateMbps: 15,
  },
  "4k-quality": {
    label: "4K Quality",
    shortLabel: "4K",
    resolution: "3840×2160",
    codec: "H.265",
    codecLabel: "H.265 / HEVC",
    tier: "quality",
    tierLabel: "Quality",
    width: 3840,
    height: 2160,
    codecValue: "h265",
    preset: "medium",
    crf: 20,
    pixelFormat: "yuv420p",
    estimatedBitrateMbps: 30,
  },
  "prores-422hq": {
    label: "ProRes 422 HQ",
    shortLabel: "ProRes",
    resolution: "1920×1080",
    codec: "ProRes",
    codecLabel: "ProRes 422 HQ",
    tier: "pro",
    tierLabel: "Professional",
    width: 1920,
    height: 1080,
    codecValue: "prores",
    preset: "medium",
    crf: 0,
    pixelFormat: "yuv422p10le",
    estimatedBitrateMbps: 220,
  },
};

const PRESET_ORDER: ExportPreset[] = [
  "720p-fast",
  "1080p-fast",
  "1080p-quality",
  "4k-quality",
  "prores-422hq",
];

// ─── Tier Icon Component ─────────────────────────────────────────────────

function TierIcon({ tier, className }: { tier: "fast" | "quality" | "pro"; className?: string }) {
  switch (tier) {
    case "fast":
      return <Zap className={className} />;
    case "quality":
      return <Sparkles className={className} />;
    case "pro":
      return <Gem className={className} />;
  }
}

// ─── Circular Progress Ring ──────────────────────────────────────────────

function ProgressRing({ progress, size = 160, strokeWidth = 6 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const percentage = Math.round(progress * 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background glow */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-xl"
        style={{ background: `conic-gradient(from 0deg, var(--color-accent) ${percentage}%, transparent ${percentage}%)` }}
      />

      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/6"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-accent-soft)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-text-primary tabular-nums tracking-tight">
          {percentage}
        </span>
        <span className="text-[11px] text-text-muted font-medium -mt-0.5">percent</span>
      </div>
    </div>
  );
}

// ─── Success Check Animation ─────────────────────────────────────────────

function SuccessCheck({ size = 160 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Pulse ring */}
      <div
        className="absolute inset-0 rounded-full animate-ping opacity-10"
        style={{ background: "var(--color-accent)" }}
      />
      <div
        className="absolute inset-2 rounded-full opacity-8"
        style={{ background: `radial-gradient(circle, color-mix(in srgb, var(--color-accent) 15%, transparent) 0%, transparent 70%)` }}
      />

      {/* Check circle */}
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-soft))" }}>
        <CheckCircle2 className="w-10 h-10 text-white" />
      </div>
    </div>
  );
}

// ─── Preset Card ─────────────────────────────────────────────────────────

function PresetCard({
  presetKey,
  config,
  selected,
  disabled,
  onSelect,
}: {
  presetKey: ExportPreset;
  config: PresetConfig;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const tierColors = {
    fast: "text-emerald-400",
    quality: "text-amber-400",
    pro: "text-violet-400",
  };

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`
        group relative w-full text-left rounded-xl p-3 transition-all duration-200 outline-none
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${selected
          ? "bg-accent/10 border border-accent/40 ring-1 ring-accent/20"
          : "bg-white/[0.02] border border-white/6 hover:bg-white/[0.04] hover:border-white/10"
        }
      `}
    >
      {/* Selected indicator dot */}
      {selected && (
        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_var(--color-accent)]" />
      )}

      {/* Resolution badge */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[13px] font-bold tracking-tight ${selected ? "text-accent" : "text-text-primary"}`}>
          {config.shortLabel}
        </span>
        <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
          selected ? "bg-accent/15 text-accent" : "bg-white/6 text-text-muted"
        }`}>
          {config.codecLabel}
        </span>
      </div>

      {/* Tier label */}
      <div className="flex items-center gap-1.5">
        <TierIcon tier={config.tier} className={`w-3 h-3 ${tierColors[config.tier]}`} />
        <span className={`text-[11px] font-medium ${tierColors[config.tier]}`}>
          {config.tierLabel}
        </span>
        <span className="text-[10px] text-text-muted ml-auto">
          {config.resolution}
        </span>
      </div>
    </button>
  );
}

// ─── Detail Row ──────────────────────────────────────────────────────────

function DetailRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.FC<{ className?: string }> }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-text-muted">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span className="text-[12px]">{label}</span>
      </div>
      <span className="text-[12px] font-medium text-text-primary">{value}</span>
    </div>
  );
}

// Grapheme counting helper
const graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const countGraphemes = (str: string): number => {
  return Array.from(graphemeSegmenter.segment(str)).length;
};

// ─── Main Export Dialog ──────────────────────────────────────────────────

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const { project, mediaAssets, renameProject } = useProjectStore();
  const { clips, tracks, epoch, getTimelineEndTime } = useTimelineStore();

  // State
  const [preset, setPreset] = useState<ExportPreset>("1080p-fast");
  const [outputPath, setOutputPath] = useState<string>("");
  const [phase, setPhase] = useState<ExportPhase>("configure");
  const [progress, setProgress] = useState<VideoExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [ffmpegAvailable, setFfmpegAvailable] = useState<boolean | null>(null);
  const [ffmpegVersion, setFfmpegVersion] = useState<string>("");

  // Project Rename State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const exportAbortRef = useRef(false);

  const selectedPreset = PRESET_CONFIGS[preset];

  // ─── Reset state on open ───────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setPhase("configure");
      setProgress(null);
      setError(null);
      setResult(null);
      exportAbortRef.current = false;
      setIsEditingName(false);
      setEditNameValue("");
      setIsRenaming(false);
    }
  }, [isOpen]);

  // ─── FFmpeg check ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const checkFFmpeg = async () => {
      try {
        const module = await exportVideoModule();
        const available = await module.checkFFmpegAvailable();
        setFfmpegAvailable(available);
        if (available) {
          try {
            const version = await module.getFFmpegVersion();
            setFfmpegVersion(version);
          } catch {
            // Version detection is non-critical
          }
        }
      } catch (err) {
        console.error("[ExportDialog] FFmpeg check failed:", err);
        setFfmpegAvailable(false);
      }
    };

    checkFFmpeg();
  }, [isOpen]);

  // ─── Sequence duration (actual authored content) ───────────────────
  // project.duration is static metadata (often 0). The real duration
  // is computed from timeline clips via getTimelineEndTime().
  const sequenceDuration = getTimelineEndTime();

  // ─── Estimated file size ───────────────────────────────────────────
  const estimatedFileSize = (() => {
    if (sequenceDuration <= 0) return "—";
    const bytes = (selectedPreset.estimatedBitrateMbps * 1_000_000 * sequenceDuration) / 8;
    if (bytes < 1_000_000) return `~${(bytes / 1_000).toFixed(0)} KB`;
    if (bytes < 1_000_000_000) return `~${(bytes / 1_000_000).toFixed(1)} MB`;
    return `~${(bytes / 1_000_000_000).toFixed(2)} GB`;
  })();

  // ─── Format helpers ────────────────────────────────────────────────
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatMs = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // ─── Project Rename Handlers ───────────────────────────────────────
  const handleSaveName = useCallback(async () => {
    if (!project) return;
    const trimmed = editNameValue.trim();
    if (!trimmed || trimmed === project.name) {
      setIsEditingName(false);
      return;
    }

    if (countGraphemes(trimmed) > MAX_PROJECT_NAME_LENGTH) {
      return;
    }

    setIsRenaming(true);
    try {
      await renameProject(project.id, trimmed);
      setIsEditingName(false);
    } catch (err) {
      console.error("[ExportDialog] Failed to rename project:", err);
    } finally {
      setIsRenaming(false);
    }
  }, [editNameValue, project, renameProject]);

  const handleCancelRename = useCallback(() => {
    setIsEditingName(false);
  }, []);

  // ─── Output path picker ───────────────────────────────────────────
  const handleSelectOutputPath = useCallback(async () => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const ext = selectedPreset.codecValue === "prores" ? "mov" : "mp4";
      const path = await save({
        defaultPath: `${project?.name || "video"}.${ext}`,
        filters: [{ name: "Video", extensions: [ext] }],
      });
      if (path) setOutputPath(path);
    } catch (err) {
      console.error("[ExportDialog] File picker failed:", err);
    }
  }, [project?.name, selectedPreset.codecValue]);

  // ─── Export handler ────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!outputPath || !project) return;

    setPhase("exporting");
    setError(null);
    setResult(null);
    setProgress(null);
    exportAbortRef.current = false;

    try {
      const { exportVideo } = await exportVideoModule();

      const exportResult = await exportVideo({
        clips,
        tracks,
        assets: mediaAssets,
        project,
        epoch,
        startTime: 0,
        endTime: sequenceDuration,
        outputPath,
        width: selectedPreset.width,
        height: selectedPreset.height,
        codec: selectedPreset.codecValue,
        preset: selectedPreset.preset,
        crf: selectedPreset.crf,
        pixelFormat: selectedPreset.pixelFormat,
        onProgress: (p) => setProgress(p),
      });

      if (!exportResult.cancelled) {
        setResult({
          totalFrames: exportResult.totalFrames,
          totalTimeMs: exportResult.totalTimeMs,
          avgTimePerFrameMs: exportResult.avgTimePerFrameMs,
        });
        setPhase("complete");
      } else {
        setPhase("configure");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
      setPhase("error");
    }
  }, [outputPath, project, clips, tracks, mediaAssets, epoch, selectedPreset, sequenceDuration]);

  // ─── Reveal in Finder ──────────────────────────────────────────────
  const handleRevealInFinder = useCallback(async () => {
    if (!outputPath) return;
    try {
      const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
      await revealItemInDir(outputPath);
    } catch (err) {
      console.error("[ExportDialog] Reveal in finder failed:", err);
    }
  }, [outputPath]);

  // ─── Reset for another export ──────────────────────────────────────
  const handleExportAnother = useCallback(() => {
    setPhase("configure");
    setProgress(null);
    setResult(null);
    setError(null);
    setOutputPath("");
  }, []);

  // ─── Truncated path display ────────────────────────────────────────
  const displayPath = outputPath
    ? outputPath.length > 45
      ? "…" + outputPath.slice(-42)
      : outputPath
    : "";

  // ─── Can export check ─────────────────────────────────────────────
  const canExport = ffmpegAvailable === true && outputPath.length > 0 && sequenceDuration > 0 && phase === "configure";

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <Modal
      isOpen={isOpen}
      onClose={phase === "exporting" ? () => {} : onClose}
      title="Export Video"
      size="lg"
    >
      <div className="flex min-h-[400px]">
        {/* ─── Left Sidebar: Preset Cards ─────────────────────────── */}
        <div className="w-[200px] shrink-0 border-r border-white/6 p-3 flex flex-col gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1 px-0.5">
            Export Preset
          </div>

          {PRESET_ORDER.map((key) => (
            <PresetCard
              key={key}
              presetKey={key}
              config={PRESET_CONFIGS[key]}
              selected={preset === key}
              disabled={phase === "exporting"}
              onSelect={() => setPreset(key)}
            />
          ))}

          {/* FFmpeg status — bottom of sidebar */}
          <div className="mt-auto pt-3 border-t border-white/6">
            {ffmpegAvailable === null && (
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-text-muted/30 animate-pulse" />
                <span className="text-[10px] text-text-muted">Checking FFmpeg…</span>
              </div>
            )}
            {ffmpegAvailable === true && (
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_4px_theme(colors.emerald.500/50)]" />
                <span className="text-[10px] text-text-muted truncate" title={ffmpegVersion}>
                  {ffmpegVersion || "FFmpeg ready"}
                </span>
              </div>
            )}
            {ffmpegAvailable === false && (
              <div className="flex items-start gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-destructive mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-medium text-destructive block">FFmpeg missing</span>
                  <span className="text-[9px] text-text-muted leading-tight block mt-0.5">
                    Install FFmpeg and add to PATH
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Panel ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* ═══ PHASE: Configure ═══ */}
          {phase === "configure" && (
            <>
              <div className="flex-1 p-5 space-y-5 overflow-y-auto">

                {/* Project Summary */}
                {project && (
                  <section>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                      Project
                    </h3>
                    <div className="rounded-lg border border-white/6 bg-white/[0.02] p-3 space-y-0.5">
                      <div className="flex items-center justify-between py-1.5 min-h-[32px]">
                        <div className="flex items-center gap-2 text-text-muted">
                          <Film className="w-3.5 h-3.5" />
                          <span className="text-[12px]">Name</span>
                        </div>
                        {isEditingName ? (
                          <div className="flex items-center gap-1.5 flex-1 justify-end pl-4">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              onBlur={handleSaveName}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveName();
                                if (e.key === "Escape") handleCancelRename();
                              }}
                              autoFocus
                              disabled={isRenaming}
                              maxLength={MAX_PROJECT_NAME_LENGTH}
                              className="w-full max-w-[180px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[12px] text-text-primary text-right focus:outline-none focus:border-accent focus:bg-white/[0.08] transition-all"
                            />
                            <button
                              onClick={handleSaveName}
                              disabled={isRenaming || !editNameValue.trim() || countGraphemes(editNameValue) > MAX_PROJECT_NAME_LENGTH}
                              className="text-accent hover:text-accent-soft disabled:opacity-30 disabled:cursor-not-allowed p-1 rounded hover:bg-white/5 cursor-pointer flex items-center justify-center shrink-0"
                              title="Save Name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelRename}
                              disabled={isRenaming}
                              className="text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed p-1 rounded hover:bg-white/5 cursor-pointer flex items-center justify-center shrink-0"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditNameValue(project.name);
                              setIsEditingName(true);
                            }}
                            className="group flex items-center gap-1.5 hover:text-accent text-[12px] font-medium text-text-primary transition-colors cursor-pointer text-right max-w-[240px] truncate"
                            title="Click to rename project"
                          >
                            <span className="truncate">{project.name}</span>
                            <Pencil className="w-3.5 h-3.5 text-text-muted group-hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>
                      <DetailRow label="Duration" value={formatDuration(sequenceDuration)} icon={Clock} />
                      <DetailRow label="Canvas" value={`${project.canvasWidth}×${project.canvasHeight}`} icon={Monitor} />
                      <DetailRow label="Frame Rate" value={`${project.frameRate} fps`} />
                    </div>
                  </section>
                )}

                {/* Export Details */}
                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                    Export Settings
                  </h3>
                  <div className="rounded-lg border border-white/6 bg-white/[0.02] p-3 space-y-0.5">
                    <DetailRow label="Resolution" value={selectedPreset.resolution} icon={Monitor} />
                    <DetailRow label="Codec" value={selectedPreset.codecLabel} />
                    <DetailRow label="Quality" value={`CRF ${selectedPreset.crf} / ${selectedPreset.preset}`} />
                    <DetailRow label="Pixel Format" value={selectedPreset.pixelFormat} />
                    <DetailRow label="Est. File Size" value={estimatedFileSize} icon={HardDrive} />
                  </div>
                </section>

                {/* Output Path */}
                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                    Output
                  </h3>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] min-w-0 ${
                        outputPath
                          ? "border-white/8 bg-white/[0.02] text-text-primary"
                          : "border-white/6 bg-white/[0.01] text-text-muted"
                      }`}
                    >
                      <FolderOpen className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                      <span className="truncate">
                        {displayPath || "No output file selected…"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectOutputPath}
                      className="shrink-0 text-[12px]"
                    >
                      Browse
                    </Button>
                  </div>
                </section>

                {/* Empty timeline warning */}
                {sequenceDuration <= 0 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-500/8 border border-amber-500/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-amber-400">No content to export</p>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                        Add clips to the timeline before exporting.
                      </p>
                    </div>
                  </div>
                )}

                {/* FFmpeg Warning (inline, only if missing) */}
                {ffmpegAvailable === false && (
                  <div className="flex items-start gap-3 p-3 bg-destructive/8 border border-destructive/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-destructive">FFmpeg is required</p>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                        Video export requires FFmpeg to be installed and available in your system PATH.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/6 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleExport}
                  disabled={!canExport}
                  className="min-w-[100px]"
                  style={{
                    background: canExport
                      ? "linear-gradient(135deg, var(--color-accent), var(--color-accent-soft))"
                      : undefined,
                  }}
                >
                  Export
                </Button>
              </div>
            </>
          )}

          {/* ═══ PHASE: Exporting ═══ */}
          {phase === "exporting" && (
            <>
              <div className="flex-1 flex flex-col items-center justify-center p-5 gap-5">
                {/* Progress ring */}
                <ProgressRing progress={progress?.progress ?? 0} />

                {/* Stats */}
                {progress && (
                  <div className="flex items-center justify-center gap-4 text-[11px] text-text-muted">
                    <span className="tabular-nums">
                      Frame {progress.currentFrame.toLocaleString()}/{progress.totalFrames.toLocaleString()}
                    </span>
                    <span className="text-white/10">•</span>
                    <span className="tabular-nums">{progress.fps.toFixed(1)} fps</span>
                    <span className="text-white/10">•</span>
                    <span className="tabular-nums">ETA {formatTime(progress.etaSeconds)}</span>
                  </div>
                )}

                {/* Subtle linear progress bar */}
                <div className="w-full max-w-[280px] h-1 bg-white/6 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${(progress?.progress ?? 0) * 100}%`,
                      background: "linear-gradient(90deg, var(--color-accent), var(--color-accent-soft))",
                    }}
                  />
                </div>

                <p className="text-[11px] text-text-muted">
                  Encoding <span className="text-text-primary font-medium">{selectedPreset.label}</span>
                </p>
              </div>

              {/* Footer — no cancel during export for now */}
              <div className="px-5 py-3 border-t border-white/6 flex items-center justify-center">
                <span className="text-[11px] text-text-muted">
                  Do not close this window during export
                </span>
              </div>
            </>
          )}

          {/* ═══ PHASE: Complete ═══ */}
          {phase === "complete" && (
            <>
              <div className="flex-1 flex flex-col items-center justify-center p-5 gap-4">
                <SuccessCheck />

                <div className="text-center mt-2">
                  <h3 className="text-[15px] font-semibold text-text-primary">Export Complete</h3>
                  <p className="text-[12px] text-text-muted mt-1">Your video has been exported successfully.</p>
                </div>

                {/* Result stats */}
                {result && (
                  <div className="flex items-center justify-center gap-4 text-[11px] text-text-muted mt-1">
                    <span className="tabular-nums">{result.totalFrames.toLocaleString()} frames</span>
                    <span className="text-white/10">•</span>
                    <span className="tabular-nums">{formatMs(result.totalTimeMs)}</span>
                    <span className="text-white/10">•</span>
                    <span className="tabular-nums">{result.avgTimePerFrameMs.toFixed(1)} ms/frame</span>
                  </div>
                )}

                {/* Output path + reveal */}
                {outputPath && (
                  <button
                    onClick={handleRevealInFinder}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/6 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-[11px] text-text-muted hover:text-text-primary mt-2 max-w-full"
                    title="Reveal in Finder"
                  >
                    <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{displayPath}</span>
                  </button>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/6 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={handleExportAnother}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Export Another
                </Button>
                <Button variant="default" onClick={onClose}>
                  Done
                </Button>
              </div>
            </>
          )}

          {/* ═══ PHASE: Error ═══ */}
          {phase === "error" && (
            <>
              <div className="flex-1 flex flex-col items-center justify-center p-5 gap-4">
                {/* Error icon */}
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <X className="w-10 h-10 text-destructive" />
                </div>

                <div className="text-center mt-2">
                  <h3 className="text-[15px] font-semibold text-text-primary">Export Failed</h3>
                  <p className="text-[12px] text-text-muted mt-1 max-w-[300px] leading-relaxed">
                    {error || "An unexpected error occurred during export."}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/6 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setPhase("configure");
                    setError(null);
                  }}
                >
                  Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
