/**
 * Clypra Text Effect Registry
 *
 * The single source of truth for all registered text effects.
 *
 * ─── How to add a new effect ──────────────────────────────────────────────────
 *
 *  1. Paste the studio-generated file into src/features/text-effects/effects/
 *  2. Add exactly two lines at the bottom of the "REGISTERED EFFECTS" section:
 *
 *       import { MyEffectEngine, MyEffectDefinition } from "./effects/MyEffect";
 *       register(MyEffectDefinition, MyEffectEngine);
 *
 *  That's it. The renderer, allTextEffects, and everything else update automatically.
 *
 * ─── Studio known issue ───────────────────────────────────────────────────────
 *  If the generated drawFrame references an undefined `className` variable, remove
 *  or guard that block. This is a bug in the studio generator, not in your code.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { TextEffectDefinition } from "./types/types";
import { getFontFamilyStack } from "./lib/helpers";

// ─── Internal registry state ──────────────────────────────────────────────────

type EffectConfig = Record<string, unknown> & { width: number; height: number; text: string };
type EngineInstance = { drawFrame(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, ghostFrames?: ImageData[]): void };
type EffectEngineClass = new (config: EffectConfig) => EngineInstance;

const _engines = new Map<string, EffectEngineClass>();
const _definitions: TextEffectDefinition[] = [];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Register an effect. Call once per effect — see the header for the two-line pattern.
 */
export function register(definition: TextEffectDefinition, Engine: EffectEngineClass): void {
  _engines.set(definition.id, Engine);
  _definitions.push(definition);
}

/**
 * All registered effect definitions — replaces the old allEffects / allTextEffects export.
 * The array is mutated by register() at module init time, so all imports see the full list.
 */
export const allTextEffects: TextEffectDefinition[] = _definitions;

/** @deprecated use allTextEffects */
export const allEffects = allTextEffects;

/**
 * Returns true when a registered engine exists for the given effect id.
 */
export function hasRegisteredEngine(id: string): boolean {
  return _engines.has(id);
}

/**
 * Renders a registered effect to any 2D canvas context.
 * Internally maps TextEffectDefinition → flat engine config and calls drawFrame.
 */
export function renderRegisteredEffect(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, effect: TextEffectDefinition, text: string, fontSize: number, canvasWidth: number, canvasHeight: number): void {
  const Engine = _engines.get(effect.id);
  if (!Engine) return;
  const config = _buildConfig(effect, text, fontSize, canvasWidth, canvasHeight);
  new Engine(config).drawFrame(ctx);
}

// ─── Generic TextEffectDefinition → flat engine config bridge ─────────────────
// All studio-generated engines share the same flat config shape (SolarisInkConfig-style).
// This function maps the structured definition once, so individual engine classes
// never need a fromDefinition method.
export function _buildConfig(effect: TextEffectDefinition, text: string, fontSize: number, canvasWidth: number, canvasHeight: number): EffectConfig {
  const fill = effect.fills?.[0];
  const stroke = effect.strokes?.[0];
  const shadow = effect.shadows?.[0];
  const bevel = effect.bevel;
  const panel = effect.panel;

  // Font size ratio for proportional scaling (based on 100px studio reference)
  const ratio = fontSize / 100;

  // 1. Build the base standard configuration
  const config: any = {
    // Canvas / text
    width: canvasWidth,
    height: canvasHeight,
    text,

    // Font — resolve through getFontFamilyStack so engines receive the correct CSS name
    fontFamily: getFontFamilyStack(effect.font.family),
    fontWeight: effect.font.weight,
    fontStyle: effect.font.style,
    fontSize,
    letterSpacing: effect.font.letterSpacing,
    lineHeight: effect.font.lineHeight,

    // Fill — default to "none" when no fills are defined (not "solid")
    fillType: (fill?.type ?? "none") as string,
    fillColor: fill?.color ?? "#FFFFFF",
    fillGradientAngle: fill?.gradient?.angle ?? 90,
    fillGradientStops: fill?.gradient?.stops ?? [],
  };

  // Stroke — only include optional properties when stroke exists
  config.strokeEnabled = !!stroke;
  if (stroke) {
    config.strokeColor = stroke.color ?? "#000000";
    config.strokeWidth = stroke.width ?? 0;
    config.strokePosition = stroke.position ?? "outside";
    config.strokeOpacity = stroke.opacity ?? 100;
    config.strokeLineJoin = stroke.lineJoin ?? "round";
  }

  // Drop / inner shadow — only include optional properties when shadow exists
  config.shadowEnabled = !!shadow && shadow.type === "drop";
  if (shadow) {
    config.shadowColor = shadow.color ?? "#000000";
    config.shadowBlur = shadow.blur ?? 0;
    config.shadowOffsetX = shadow.offsetX ?? 0;
    config.shadowOffsetY = shadow.offsetY ?? 0;
    config.shadowOpacity = shadow.opacity ?? 100;
    config.shadowType = shadow.type ?? "drop";
  }

  // Bevel — only include optional properties when bevel exists
  config.bevelEnabled = !!bevel;
  if (bevel) {
    config.bevelDepth = bevel.depth ?? 0;
    config.bevelHighlight = bevel.highlightColor ?? "#FFFFFF";
    config.bevelShadow = bevel.shadowColor ?? "#000000";
    config.bevelDirection = bevel.direction ?? "bottom-right";
  }

  // Panel / background — only include optional properties when panel exists
  config.panelEnabled = !!panel;
  if (panel) {
    config.panelColor = panel.color ?? "#1E1E26";
    config.panelOpacity = panel.opacity ?? 80;
    config.panelRadius = panel.radius ?? 12;
    config.panelPaddingX = panel.paddingX ?? 40;
    config.panelPaddingY = panel.paddingY ?? 20;
    config.panelStrokeEnabled = !!panel.stroke;
    config.panelStrokeColor = panel.stroke?.color ?? "#2A2A38";
    config.panelStrokeWidth = panel.stroke?.width ?? 2;
  }

  // Glow layers — proportionally scale blur and spread based on font size ratio
  if (effect.glows) {
    config.glowLayers = effect.glows.map((g: Record<string, unknown>) => ({
      enabled: true,
      color: g.color,
      blur: typeof g.blur === "number" ? g.blur * ratio : (g.blur ?? 0),
      opacity: g.opacity,
      type: g.type ?? "outer",
      strength: g.strength ?? 4,
      spread: typeof g.spread === "number" ? g.spread * ratio : ((g.spread as number ?? 10) * ratio),
    }));
  }

  // 2. Auto-forward unrecognized Top-Level keys (e.g. isGlitchEffect, decaySpeed)
  const standardKeys = new Set(["id", "name", "category", "description", "tags", "font", "fills", "strokes", "shadows", "glows", "bevel", "panel"]);
  for (const key of Object.keys(effect)) {
    if (!standardKeys.has(key)) {
      config[key] = (effect as any)[key];
    }
  }

  // 3. Dynamic Sub-Object Flattening: Pass through custom/future variables inside nested elements
  if (fill && typeof fill === "object") {
    const knownFillKeys = new Set(["type", "color", "gradient"]);
    for (const key of Object.keys(fill)) {
      if (!knownFillKeys.has(key)) {
        config[key] = fill[key];
      }
    }
  }

  if (stroke && typeof stroke === "object") {
    const knownStrokeKeys = new Set(["color", "width", "position", "opacity", "lineJoin"]);
    for (const key of Object.keys(stroke)) {
      if (!knownStrokeKeys.has(key)) {
        config[key] = stroke[key];
      }
    }
  }

  if (shadow && typeof shadow === "object") {
    const knownShadowKeys = new Set(["color", "blur", "offsetX", "offsetY", "opacity", "type"]);
    for (const key of Object.keys(shadow)) {
      if (!knownShadowKeys.has(key)) {
        config[key] = shadow[key];
      }
    }
  }

  if (bevel && typeof bevel === "object") {
    const knownBevelKeys = new Set(["depth", "highlightColor", "shadowColor", "direction"]);
    for (const key of Object.keys(bevel)) {
      if (!knownBevelKeys.has(key)) {
        config[key] = bevel[key];
      }
    }
  }

  if (panel && typeof panel === "object") {
    const knownPanelKeys = new Set(["color", "opacity", "radius", "paddingX", "paddingY", "stroke"]);
    for (const key of Object.keys(panel)) {
      if (!knownPanelKeys.has(key)) {
        config[key] = panel[key];
      }
    }
  }

  return config;
}

// ─── REGISTERED EFFECTS ───────────────────────────────────────────────────────
// Add new effects below. Pattern per effect:
//   import { MyEngine, MyDefinition } from "./effects/MyEffect";
//   register(MyDefinition, MyEngine);
// ─────────────────────────────────────────────────────────────────────────────

// SolarisInk
import { SolarisInkEngine, SolarisInkDefinition } from "./effects/SolarisInk";
register(SolarisInkDefinition, SolarisInkEngine);

// BiolumeTrench
import { BiolumeTrenchEngine, BiolumeTrenchDefinition } from "./effects/BiolumeTrench";
register(BiolumeTrenchDefinition, BiolumeTrenchEngine);

// BitDecay
import { BitDecayEngine, BitDecayDefinition } from "./effects/BitDecay";
register(BitDecayDefinition, BitDecayEngine);

// NeonCrimson
import { NeonCrimsonEngine, NeonCrimsonDefinition } from "./effects/NeonCrimson";
register(NeonCrimsonDefinition, NeonCrimsonEngine);
