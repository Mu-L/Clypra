import React, { useRef, useEffect, useState } from "react";
import { TextEffectDefinition } from "./types";
import { renderTextEffect, renderTextEffectToDataURL } from "./renderer";
import { Download, Sparkles, Layers } from "lucide-react";

interface TextEffectPreviewProps {
  text: string;
  effect: TextEffectDefinition;
}

export const TextEffectPreview: React.FC<TextEffectPreviewProps> = ({ text, effect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debouncedText, setDebouncedText] = useState(text);

  // Debounce text inputs to ensure extremely high performance during active typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedText(text);
    }, 150);

    return () => clearTimeout(handler);
  }, [text]);

  // Re-render the effect on text or style changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Standard 800x400 high-resolution internal preview canvas dimensions
    canvas.width = 800;
    canvas.height = 400;

    renderTextEffect(canvas, debouncedText || "Clypra", effect, 64);
  }, [debouncedText, effect]);

  // Handle high-res PNG export
  const handleExportPNG = () => {
    const dataURL = renderTextEffectToDataURL(debouncedText || "Clypra", effect, 72, 1200, 600);
    const link = document.createElement("a");
    link.download = `${effect.id}-export.png`;
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-5 p-5 bg-[#0E0E12] border border-white/5 rounded-2xl shadow-2xl">
      {/* Visual Live Canvas Viewport */}
      <div className="flex-1 flex flex-col gap-3.5">
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-white/5 flex items-center justify-center checkerboard">
          <canvas ref={canvasRef} className="w-full h-full object-contain block max-w-full" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight">{effect.name}</h3>
            <span className="px-2 py-0.5 rounded bg-[#7C6FFF]/15 border border-[#7C6FFF]/25 text-[#8B84ff] text-[9px] uppercase tracking-wider font-semibold">
              {effect.category}
            </span>
          </div>
          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-600 hover:bg-green-500 active:scale-[0.97] transition-all text-xs font-semibold text-white cursor-pointer shadow-lg shadow-green-950/20"
          >
            <Download className="w-3.5 h-3.5" />
            Export PNG
          </button>
        </div>
      </div>

      {/* Structured Graphics Layer Inspector Side Panel */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-4 p-4 rounded-xl bg-[#1E1E26]/40 border border-white/5">
        <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
          <Layers className="w-4 h-4 text-[#7C6FFF]" />
          <h4 className="text-xs font-bold text-white tracking-wider uppercase">Graphic Layers</h4>
        </div>

        {/* Categories checklist */}
        <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto scrollbar-thin">
          {/* Typography */}
          <div className="flex items-center gap-2 text-xs font-sans text-white/80">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            <span className="font-semibold truncate">Font: {effect.font.family} ({effect.font.weight})</span>
          </div>

          {/* Background */}
          {effect.background && (
            <div className="flex items-center gap-2 text-xs font-sans text-white/80">
              <span className="w-2 h-2 rounded bg-amber-400 shrink-0" />
              <span className="font-semibold">Background: {effect.background.color}</span>
            </div>
          )}

          {/* Fills */}
          {effect.fills.map((fill, index) => (
            <div key={index} className="flex items-center justify-between text-xs text-white/80 pl-2 border-l border-white/10 py-0.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium truncate">Fill {index + 1}: {fill.type}</span>
              </div>
              <span className="text-[8px] font-mono opacity-40">INDEX_{index}</span>
            </div>
          ))}

          {/* Strokes */}
          {effect.strokes.map((stroke, index) => (
            <div key={index} className="flex items-center justify-between text-xs text-white/80 pl-2 border-l border-white/10 py-0.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                <span className="font-medium truncate">Stroke {index + 1}: {stroke.width}px ({stroke.position})</span>
              </div>
              <span className="text-[8px] font-mono opacity-40">ORDER_{index}</span>
            </div>
          ))}

          {/* Shadows */}
          {effect.shadows.map((shadow, index) => (
            <div key={index} className="flex items-center justify-between text-xs text-white/80 pl-2 border-l border-white/10 py-0.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="font-medium truncate">{shadow.type} shadow ({shadow.blur}px blur)</span>
              </div>
              <span className="text-[8px] font-mono opacity-40">BLUR_{shadow.blur}</span>
            </div>
          ))}

          {/* Bevel */}
          {effect.bevel && (
            <div className="flex items-center gap-2 text-xs font-sans text-white/80">
              <span className="w-2 h-2 rounded bg-cyan-400 shrink-0" />
              <span className="font-semibold">3D Bevel Stack: Depth {effect.bevel.depth}px</span>
            </div>
          )}

          {/* Glitch */}
          {effect.glitch && effect.glitch.enabled && (
            <div className="flex items-center gap-2 text-xs font-sans text-white/80">
              <span className="w-2 h-2 rounded bg-red-500 animate-pulse shrink-0" />
              <span className="font-semibold">Glitch Channels: Active</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
