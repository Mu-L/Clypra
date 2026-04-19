/**
 * Playhead Component for Timeline Engine v1
 * Visual only - click/drag handling moved to TimelineContainer
 */

import { useTimelineStore } from "../store/timelineStore";
import { CoordinateSystem } from "../utils/coordinateSystem";

interface PlayheadProps {
  /** Coordinate system for time-to-pixel conversion */
  coords: CoordinateSystem;
  /** Current horizontal scroll position */
  scrollLeft: number;
}

/**
 * Playhead component - renders vertical line with triangular handle
 * Positioned absolutely relative to viewport (not affected by scroll)
 * Click/drag handling is done in TimelineContainer to allow scrolling
 */
export function Playhead({ coords, scrollLeft }: PlayheadProps) {
  const playhead = useTimelineStore((state) => state.playhead);

  // Calculate playhead position in viewport coordinates
  const playheadPixels = coords.timeToPixels(playhead);
  const playheadViewportX = playheadPixels - scrollLeft;

  return (
    <div
      className="pointer-events-none absolute bottom-0 top-0 z-40 flex -translate-x-1/2 justify-center overflow-visible"
      style={{
        left: playheadViewportX,
        filter: "drop-shadow(0 0 6px rgba(255,255,255,0.35))",
      }}
      aria-hidden
    >
      <div className="relative flex h-full w-[13px] shrink-0 flex-col items-center overflow-visible">
        <svg width="13" height="11" viewBox="0 0 13 11" className="shrink-0 text-white" aria-hidden>
          <path d="M6.5 0 L13 10.5 H0 Z" fill="currentColor" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5" />
        </svg>

        <div
          className="mt-0 min-h-0 w-[2px] flex-1 rounded-full"
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.82) 55%, rgba(255,255,255,0.55) 100%)",
            boxShadow: "0 0 8px rgba(255,255,255,0.25)",
          }}
        />
      </div>
    </div>
  );
}
