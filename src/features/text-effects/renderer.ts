import { TextEffectDefinition, Fill, Stroke, Shadow, BackgroundConfig, GlitchConfig, TextureFill } from "./types";

/**
 * Parses hex or rgba/rgb color strings into [r, g, b, a] numeric array.
 * @param color - The input color string.
 * @returns An array representing [r, g, b, a].
 */
const parseColor = (color: string): number[] => {
  const col = color.trim();
  if (col.startsWith("#")) {
    if (col.length === 4) {
      const r = parseInt(col[1] + col[1], 16);
      const g = parseInt(col[2] + col[2], 16);
      const b = parseInt(col[3] + col[3], 16);
      return [r, g, b, 1];
    }
    const r = parseInt(col.slice(1, 3), 16);
    const g = parseInt(col.slice(3, 5), 16);
    const b = parseInt(col.slice(5, 7), 16);
    const a = col.length === 9 ? parseInt(col.slice(7, 9), 16) / 255 : 1;
    return [r, g, b, a];
  }
  if (col.startsWith("rgba") || col.startsWith("rgb")) {
    const match = col.match(/\d+(\.\d+)?/g);
    if (match) {
      const r = parseInt(match[0], 10);
      const g = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);
      const a = match[3] ? parseFloat(match[3]) : 1;
      return [r, g, b, a];
    }
  }
  return [255, 255, 255, 1];
};

/**
 * Interpolates two color strings linearly by a factor between 0.0 and 1.0.
 * @param color1 - Back/Start color.
 * @param color2 - Front/End color.
 * @param factor - Interpolation step.
 * @returns The interpolated rgba color string.
 */
const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  const r = Math.round(c1[0] + (c2[0] - c1[0]) * factor);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * factor);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * factor);
  const a = c1[3] + (c2[3] - c1[3]) * factor;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/**
 * Applies font configuration styles to a CanvasRenderingContext2D.
 * @param ctx - The target rendering context.
 * @param font - Font parameters.
 * @param fontSize - Font size in pixels.
 */
const applyFontConfig = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  font: TextEffectDefinition["font"],
  fontSize: number
) => {
  ctx.font = `${font.style} ${font.weight} ${fontSize}px ${font.family}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  if (typeof (ctx as any).letterSpacing !== "undefined") {
    (ctx as any).letterSpacing = `${font.letterSpacing}px`;
  }
};

/**
 * Clips canvas context to text shape so inner shadows and texture fills don't bleed.
 * @param ctx - Canvas rendering context.
 * @param lines - Array of text lines.
 * @param fontSize - Size of font.
 * @param font - Font configuration block.
 * @param x - Center anchor X.
 * @param y - Center anchor Y.
 */
export const clipToText = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  lines: string[],
  fontSize: number,
  font: TextEffectDefinition["font"],
  x: number,
  y: number
) => {
  ctx.globalCompositeOperation = "source-atop";
};

/**
 * Core Canvas 2D Text Effects Rendering Context Engine.
 * Renders full text layers back-to-front onto any rendering context.
 * @param ctx - The CanvasRenderingContext2D or OffscreenCanvasRenderingContext2D to draw on.
 * @param text - The text string.
 * @param effect - The premium text effect definition.
 * @param fontSize - Master font size in px.
 * @param x - Horizontal anchor center.
 * @param y - Vertical anchor center.
 * @param canvasWidth - Canvas viewport width in px.
 * @param canvasHeight - Canvas viewport height in px.
 */
export const renderTextEffectToContext = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  effect: TextEffectDefinition,
  fontSize: number,
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  const lines = text.split("\n");
  const lineHeightPx = fontSize * effect.font.lineHeight;

  // Apply default setup
  applyFontConfig(ctx, effect.font, fontSize);

  // 1. Draw Background Box if specified
  if (effect.background) {
    const bg = effect.background;
    let maxWidth = 0;
    const totalHeight = lines.length * lineHeightPx;
    lines.forEach((line) => {
      maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
    });

    const bgWidth = maxWidth + bg.paddingX * 2;
    const bgHeight = totalHeight + bg.paddingY * 2;
    const bgX = x - bgWidth / 2;
    const bgY = y - bgHeight / 2;

    ctx.save();
    ctx.beginPath();
    (ctx as any).roundRect(bgX, bgY, bgWidth, bgHeight, bg.borderRadius);
    ctx.fillStyle = bg.color;
    ctx.fill();

    if (bg.stroke) {
      ctx.strokeStyle = bg.stroke.color;
      ctx.lineWidth = bg.stroke.width;
      ctx.globalAlpha = bg.stroke.opacity;
      ctx.lineJoin = bg.stroke.join || "round";
      ctx.stroke();
    }
    ctx.restore();
  }

  // Measure text bounding bounds for gradient mapping
  let textWidth = 0;
  lines.forEach((line) => {
    textWidth = Math.max(textWidth, ctx.measureText(line).width);
  });
  const textHeight = lines.length * lineHeightPx;
  const bounds = {
    x: x - textWidth / 2,
    y: y - textHeight / 2,
    w: textWidth,
    h: textHeight,
  };

  // Helper to resolve fills into Canvas gradients or solids
  const resolveFillStyle = (fill: Fill): string | CanvasGradient => {
    if (fill.type === "solid") {
      return fill.color;
    }
    if (fill.type === "linear") {
      const angleRad = ((fill.angle ?? 0) * Math.PI) / 180;
      const cx = bounds.x + bounds.w / 2;
      const cy = bounds.y + bounds.h / 2;
      const dx = Math.cos(angleRad);
      const dy = Math.sin(angleRad);
      const halfLen = Math.abs(bounds.w * dx) / 2 + Math.abs(bounds.h * dy) / 2;

      const grad = ctx.createLinearGradient(cx - dx * halfLen, cy - dy * halfLen, cx + dx * halfLen, cy + dy * halfLen);
      fill.stops.forEach((stop) => grad.addColorStop(stop.position, stop.color));
      return grad;
    }
    if (fill.type === "radial") {
      const cx = bounds.x + bounds.w / 2;
      const cy = bounds.y + bounds.h / 2;
      const r = Math.max(bounds.w, bounds.h) / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      fill.stops.forEach((stop) => grad.addColorStop(stop.position, stop.color));
      return grad;
    }
    if (fill.type === "conic") {
      const cx = bounds.x + bounds.w / 2;
      const cy = bounds.y + bounds.h / 2;
      const grad = ctx.createConicGradient(0, cx, cy);
      fill.stops.forEach((stop) => grad.addColorStop(stop.position, stop.color));
      return grad;
    }
    return "#ffffff";
  };

  // 2. Draw Glow Shadows (type: 'glow', rendered before fill/stroke)
  const glowShadows = effect.shadows.filter((s) => s.type === "glow");
  glowShadows.forEach((shadow) => {
    ctx.save();
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.globalAlpha = shadow.opacity;

    const iterations = shadow.spread ? shadow.spread + 1 : 1;
    for (let i = 0; i < iterations; i++) {
      lines.forEach((line, index) => {
        const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
        ctx.fillStyle = shadow.color;
        ctx.fillText(line, x, lineY);
      });
    }
    ctx.restore();
  });

  // 3. Draw Drop Shadows (type: 'drop')
  const dropShadows = effect.shadows.filter((s) => s.type === "drop");
  dropShadows.forEach((shadow) => {
    ctx.save();
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.globalAlpha = shadow.opacity;

    lines.forEach((line, index) => {
      const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
      ctx.fillStyle = shadow.color;
      ctx.fillText(line, x, lineY);
    });
    ctx.restore();
  });

  // 4. Strokes (sorted by width descending, rendered widest-first)
  const sortedStrokes = [...effect.strokes].sort((a, b) => b.width - a.width);
  sortedStrokes.forEach((stroke) => {
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.position === "center" ? stroke.width : stroke.width * 2;
    ctx.lineJoin = stroke.join || "round";
    ctx.globalAlpha = stroke.opacity;

    if (stroke.position === "inside") {
      ctx.save();
      clipToText(ctx, lines, fontSize, effect.font, x, y);
      lines.forEach((line, index) => {
        const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
        ctx.strokeText(line, x, lineY);
      });
      ctx.restore();
    } else {
      lines.forEach((line, index) => {
        const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
        ctx.strokeText(line, x, lineY);
      });
    }
    ctx.restore();
  });

  // 5. Bevel Extrusion Stacking (if defined)
  if (effect.bevel && effect.bevel.depth > 0) {
    const bevel = effect.bevel;
    ctx.save();
    for (let d = bevel.depth; d > 0; d--) {
      const factor = (bevel.depth - d) / bevel.depth;
      ctx.fillStyle = interpolateColor(bevel.shadowColor, bevel.highlightColor, factor);
      lines.forEach((line, index) => {
        const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
        ctx.fillText(line, x + d, lineY + d);
      });
    }
    ctx.restore();
  }

  // 6. Draw Standard Fills (rendered back-to-front, excluding textures)
  const standardFills = effect.fills.filter((f) => f.type !== "texture");
  standardFills.forEach((fill) => {
    ctx.save();
    ctx.fillStyle = resolveFillStyle(fill);
    lines.forEach((line, index) => {
      const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
      ctx.fillText(line, x, lineY);
    });
    ctx.restore();
  });

  // 7. Inner Shadows (type: 'inner') using an offscreen inverted mask
  const innerShadows = effect.shadows.filter((s) => s.type === "inner");
  innerShadows.forEach((shadow) => {
    const offscreen = document.createElement("canvas");
    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;
    const octx = offscreen.getContext("2d");
    if (!octx) return;

    applyFontConfig(octx, effect.font, fontSize);

    // Fill offscreen black
    octx.fillStyle = "black";
    octx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Carve out text outline using destination-out
    octx.globalCompositeOperation = "destination-out";
    lines.forEach((line, index) => {
      const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
      octx.fillText(line, x, lineY);
    });

    // Render inner shadow masked to standard text
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.globalAlpha = shadow.opacity;
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  });

  // 8. Texture Fills (blendMode composite overlays)
  const textureFills = effect.fills.filter((f) => f.type === "texture") as TextureFill[];
  textureFills.forEach((texture) => {
    const img = new Image();
    img.src = texture.src;
    if (img.complete) {
      ctx.save();
      ctx.globalCompositeOperation = texture.blendMode || "source-atop";
      ctx.globalAlpha = texture.opacity;
      ctx.drawImage(img, bounds.x, bounds.y, bounds.w, bounds.h);
      ctx.restore();
    } else {
      img.onload = () => {
        ctx.save();
        ctx.globalCompositeOperation = texture.blendMode || "source-atop";
        ctx.globalAlpha = texture.opacity;
        ctx.drawImage(img, bounds.x, bounds.y, bounds.w, bounds.h);
        ctx.restore();
      };
    }
  });

  // 9. Glitch Displacement channel offset splits (if defined)
  if (effect.glitch && effect.glitch.enabled) {
    const glitch = effect.glitch;
    const w = canvasWidth;
    const h = canvasHeight;

    // Create full snapshot of current canvas rendering
    const snapshot = ctx.getImageData(0, 0, w, h);

    // Create offscreen channels to extract Red/Blue splits
    const offscreenRed = document.createElement("canvas");
    offscreenRed.width = w;
    offscreenRed.height = h;
    const oRedCtx = offscreenRed.getContext("2d")!;
    oRedCtx.putImageData(snapshot, 0, 0);
    oRedCtx.globalCompositeOperation = "source-in";
    oRedCtx.fillStyle = "#FF0000";
    oRedCtx.fillRect(0, 0, w, h);

    const offscreenBlue = document.createElement("canvas");
    offscreenBlue.width = w;
    offscreenBlue.height = h;
    const oBlueCtx = offscreenBlue.getContext("2d")!;
    oBlueCtx.putImageData(snapshot, 0, 0);
    oBlueCtx.globalCompositeOperation = "source-in";
    oBlueCtx.fillStyle = "#00FFFF"; // Cyan channel (G+B)
    oBlueCtx.fillRect(0, 0, w, h);

    // Clear and draw RGB splits with screen composition
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    ctx.drawImage(offscreenBlue, glitch.rgbOffset, 0);
    ctx.drawImage(offscreenRed, -glitch.rgbOffset, 0);
    ctx.restore();

    // Displace random horizontal slice regions
    if (glitch.slices > 0) {
      const sliceHeight = h / glitch.slices;
      for (let i = 0; i < glitch.slices; i++) {
        const sy = i * sliceHeight;
        const sh = sliceHeight;
        const offset = (Math.random() - 0.5) * 2 * glitch.sliceMaxOffset;

        const sliceData = ctx.getImageData(0, sy, w, sh);
        ctx.clearRect(0, sy, w, sh);
        ctx.putImageData(sliceData, offset, sy);
      }
    }

    // Apply horizontal overlay scanline bands
    if (glitch.scanlineOpacity > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.globalAlpha = glitch.scanlineOpacity;
      for (let scanY = 0; scanY < h; scanY += 4) {
        ctx.fillRect(0, scanY, w, 2);
      }
      ctx.restore();
    }
  }
};

/**
 * Core Canvas 2D Text Effects Rendering Engine.
 * Renders full text layers back-to-front in premium NLE composition order.
 * @param canvas - The HTMLCanvasElement to render onto.
 * @param text - The text string, supporting newlines.
 * @param effect - The text effect definition block.
 * @param fontSize - Master font size in pixels.
 */
export const renderTextEffect = (
  canvas: HTMLCanvasElement,
  text: string,
  effect: TextEffectDefinition,
  fontSize: number
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderTextEffectToContext(
    ctx,
    text,
    effect,
    fontSize,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width,
    canvas.height
  );
};

/**
 * Renders the full text effect on a configurable offscreen canvas and returns a high-resolution export PNG data URL.
 * @param text - The text string.
 * @param effect - The text effect definition block.
 * @param fontSize - Master font size in pixels.
 * @param width - Canvas export width in px (default: 800).
 * @param height - Canvas export height in px (default: 400).
 * @returns A base64 PNG data URL string.
 */
export const renderTextEffectToDataURL = (
  text: string,
  effect: TextEffectDefinition,
  fontSize: number,
  width: number = 800,
  height: number = 400
): string => {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;

  renderTextEffect(offscreen, text, effect, fontSize);
  return offscreen.toDataURL("image/png");
};
