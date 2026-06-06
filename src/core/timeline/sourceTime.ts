import type { Clip, TimelineSourceRange } from "@/types";

export interface SourceTimeResolution {
  localTime: number;
  sourceTime: number;
  active: boolean;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export function resolveClipSourceTime(clip: Pick<Clip, "startTime" | "duration" | "trimIn" | "trimOut">, timelineTime: number, options?: { clampToRange?: boolean }): SourceTimeResolution {
  const localTime = timelineTime - clip.startTime;
  const active = localTime >= 0 && localTime <= clip.duration;
  const rawSourceTime = clip.trimIn + localTime;
  const sourceTime = options?.clampToRange ? clamp(rawSourceTime, clip.trimIn, clip.trimOut) : rawSourceTime;
  return { localTime, sourceTime: Math.max(0, sourceTime), active };
}

export function resolveTimelineItemSourceTime(source: TimelineSourceRange, placement: { startTime: number; duration: number }, timelineTime: number, options?: { clampToRange?: boolean }): SourceTimeResolution {
  const localTime = timelineTime - placement.startTime;
  const active = localTime >= 0 && localTime <= placement.duration;
  const rate = source.playbackRate || 1;
  const rawOffset = localTime * rate;
  const rawSourceTime = source.reverse ? source.trimOut - rawOffset : source.trimIn + rawOffset;
  const min = Math.min(source.trimIn, source.trimOut);
  const max = Math.max(source.trimIn, source.trimOut);
  const sourceTime = options?.clampToRange ? clamp(rawSourceTime, min, max) : rawSourceTime;
  return { localTime, sourceTime: Math.max(0, sourceTime), active };
}
