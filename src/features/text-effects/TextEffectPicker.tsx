import React, { useState, useEffect, useRef } from "react";
import { TextEffectDefinition, EffectCategory } from "./types";
import { allEffects } from "./effects/definitions";
import { renderTextEffect } from "./renderer";
import { Search } from "lucide-react";

interface TextEffectPickerProps {
  selectedEffectId?: string;
  onEffectSelect: (effect: TextEffectDefinition) => void;
}

/**
 * Thumbnail canvas card component to render a single effect in a isolated frame.
 */
const EffectThumbnailCard: React.FC<{
  effect: TextEffectDefinition;
  isSelected: boolean;
  onClick: () => void;
}> = ({ effect, isSelected, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Standard 160x80 high-performance thumbnail rendering size
    canvas.width = 160;
    canvas.height = 80;

    // Use effect name as rendering target for instant identification
    renderTextEffect(canvas, effect.name, effect, 18);
  }, [effect]);

  return (
    <div
      onClick={onClick}
      className={`flex flex-col bg-[#1E1E26] rounded-xl overflow-hidden border transition-all duration-300 hover:scale-[1.03] cursor-pointer group shadow-lg ${
        isSelected
          ? "border-[#7C6FFF] shadow-[0_0_15px_rgba(124,111,255,0.25)]"
          : "border-white/5 hover:border-white/10"
      }`}
    >
      <div className="w-full h-20 bg-[#0E0E12] flex items-center justify-center relative overflow-hidden">
        <canvas ref={canvasRef} className="max-w-full max-h-full block select-none pointer-events-none" />
      </div>
      <div className="p-2 border-t border-white/5 flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-white/95 group-hover:text-[#7C6FFF] transition-colors truncate">
          {effect.name}
        </span>
        <span className="text-[8px] font-mono text-white/40 tracking-tight capitalize truncate">
          {effect.category}
        </span>
      </div>
    </div>
  );
};

export const TextEffectPicker: React.FC<TextEffectPickerProps> = ({
  selectedEffectId,
  onEffectSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<EffectCategory | "all">("all");

  const categories: (EffectCategory | "all")[] = [
    "all",
    "metallic",
    "neon",
    "gradient",
    "retro",
    "grunge",
    "clean",
    "glitch",
    "organic",
    "space",
    "3d",
  ];

  // Filter effects based on category and search query (name or tags)
  const filteredEffects = allEffects.filter((effect) => {
    const matchesCategory = activeCategory === "all" || effect.category === activeCategory;
    const matchesSearch =
      effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      effect.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full flex flex-col bg-[#0E0E12] border border-white/5 rounded-2xl overflow-hidden shadow-2xl p-4 text-text-primary">
      {/* Search Header */}
      <div className="relative w-full mb-3 shrink-0">
        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          placeholder="Search premium text effects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#1E1E26] rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none border border-white/5 focus:border-[#7C6FFF]/40 focus:ring-1 focus:ring-[#7C6FFF]/30 transition-all font-sans"
        />
      </div>

      {/* Category Scrollbar Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 shrink-0 scrollbar-none select-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 text-[10px] font-semibold rounded-lg uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all duration-200 border ${
              activeCategory === cat
                ? "bg-[#7C6FFF] text-white border-transparent"
                : "bg-[#1E1E26]/40 hover:bg-[#1E1E26] text-white/50 hover:text-white border-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Responsive Grid */}
      <div className="grow overflow-y-auto max-h-[360px] scrollbar-thin pr-1">
        {filteredEffects.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-1 text-white/40 text-xs">
            <p>No matching text effects found</p>
            <p className="text-[10px] opacity-60">Try searching other categories or styles</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredEffects.map((effect) => (
              <EffectThumbnailCard
                key={effect.id}
                effect={effect}
                isSelected={selectedEffectId === effect.id}
                onClick={() => onEffectSelect(effect)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
