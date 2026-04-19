export type TimelineProps = {
  duration: number;
  playhead: number;
  onSeek: (t: number) => void;
  /** @deprecated Not used with store-based timeline */
  trimStart?: number;
  /** @deprecated Not used with store-based timeline */
  trimEnd?: number;
  /** @deprecated Not used with store-based timeline */
  videoUrl?: string | null;
  /** @deprecated Not used with store-based timeline */
  sourcePath?: string | null;
  /** @deprecated Not used with store-based timeline */
  videoRef?: React.RefObject<HTMLVideoElement>;
};

export type FilmstripResult = {
  stripUrl: string | null;
  loading: boolean;
};
