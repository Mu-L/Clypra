export interface ColorStop {
  position: number;        // 0.0–1.0
  color: string;           // hex or rgba()
}

export interface GradientFill {
  type: 'linear' | 'radial' | 'conic';
  angle?: number;          // degrees, for linear
  stops: ColorStop[];
}

export interface TextureFill {
  type: 'texture';
  src: string;             // relative path to asset
  blendMode: GlobalCompositeOperation;
  opacity: number;         // 0.0–1.0
}

export interface SolidFill {
  type: 'solid';
  color: string;
}

export type Fill = SolidFill | GradientFill | TextureFill;

export interface Stroke {
  color: string;
  width: number;           // px
  position: 'outside' | 'inside' | 'center';
  opacity: number;         // 0.0–1.0
  join?: CanvasLineJoin;   // default: 'round'
}

export interface Shadow {
  type: 'drop' | 'inner' | 'glow';
  color: string;
  blur: number;            // px
  offsetX: number;
  offsetY: number;
  opacity: number;         // 0.0–1.0
  spread?: number;         // glow only
}

export interface BevelConfig {
  depth: number;           // px — number of stacked offset copies
  highlightColor: string;  // top-left edge
  shadowColor: string;     // bottom-right edge
}

export interface BackgroundConfig {
  color: string;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  stroke?: Stroke;
}

export interface GlitchConfig {
  enabled: boolean;
  rgbOffset: number;       // px — horizontal channel split
  slices: number;          // number of horizontal displacement slices
  sliceMaxOffset: number;  // max px horizontal shift per slice
  scanlineOpacity: number; // 0.0–1.0
}

export interface TextEffectDefinition {
  id: string;
  name: string;
  category: EffectCategory;
  description: string;
  tags: string[];
  
  font: {
    family: string;
    weight: number;
    style: 'normal' | 'italic';
    letterSpacing: number;  // px
    lineHeight: number;     // multiplier
  };
  
  background?: BackgroundConfig;
  fills: Fill[];            // rendered back-to-front
  strokes: Stroke[];        // rendered widest-first (outside-in)
  shadows: Shadow[];
  bevel?: BevelConfig;
  glitch?: GlitchConfig;
}

export type EffectCategory =
  | 'metallic'
  | 'neon'
  | 'gradient'
  | 'retro'
  | 'grunge'
  | 'clean'
  | 'glitch'
  | 'organic'
  | 'space'
  | '3d';
