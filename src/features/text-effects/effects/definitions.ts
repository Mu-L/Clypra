import { TextEffectDefinition } from "../types";

export const moltenGold3d: TextEffectDefinition = {
  id: "molten-gold-3d",
  name: "Molten Gold 3D",
  category: "metallic",
  description: "Luxurious 3D molten gold preset with champaign highlights and a heavy amber drop shadow.",
  tags: ["gold", "3d", "premium", "youtube"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 2, lineHeight: 1 },
  fills: [
    {
      type: "linear",
      angle: 270,
      stops: [
        { position: 0, color: "#C8860A" },
        { position: 0.5, color: "#F5C518" },
        { position: 0.8, color: "#FFF0A0" },
        { position: 1, color: "#FFE87C" },
      ],
    },
  ],
  strokes: [
    { color: "#4A2800", width: 2, position: "outside", opacity: 1 },
  ],
  shadows: [
    { type: "drop", color: "#1A0900", blur: 12, offsetX: 5, offsetY: 6, opacity: 0.9 },
  ],
  bevel: {
    depth: 8,
    highlightColor: "#FFE87C",
    shadowColor: "#3D1E00",
  },
};

export const neonCrimson: TextEffectDefinition = {
  id: "neon-crimson",
  name: "Neon Crimson",
  category: "neon",
  description: "Classic neon red effect with white inner core and triple glowing neon shadows.",
  tags: ["neon", "red", "dark", "cinematic", "club"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 3, lineHeight: 1 },
  fills: [{ type: "solid", color: "#FFFFFF" }],
  strokes: [
    { color: "#FF6666", width: 2, position: "inside", opacity: 1 },
    { color: "#CC0000", width: 4, position: "outside", opacity: 1 },
  ],
  shadows: [
    { type: "glow", color: "#FF0000", blur: 20, offsetX: 0, offsetY: 0, opacity: 0.6 },
    { type: "glow", color: "#FF0000", blur: 60, offsetX: 0, offsetY: 0, opacity: 0.3 },
    { type: "glow", color: "#AA0000", blur: 120, offsetX: 0, offsetY: 0, opacity: 0.2 },
  ],
};

export const electricRainbow: TextEffectDefinition = {
  id: "electric-rainbow",
  name: "Electric Rainbow",
  category: "gradient",
  description: "Vibrant high-contrast rainbow gradient with thick double outside strokes.",
  tags: ["rainbow", "vibrant", "celebration", "kids", "pride"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 4, lineHeight: 1 },
  fills: [
    {
      type: "linear",
      angle: 0,
      stops: [
        { position: 0, color: "#FF0000" },
        { position: 0.17, color: "#FF8C00" },
        { position: 0.33, color: "#FFD700" },
        { position: 0.5, color: "#00CC00" },
        { position: 0.67, color: "#0066FF" },
        { position: 0.83, color: "#8B00FF" },
        { position: 1, color: "#FF0000" },
      ],
    },
  ],
  strokes: [
    { color: "#FFFFFF", width: 4, position: "outside", opacity: 1 },
    { color: "#000000", width: 6, position: "outside", opacity: 1 },
  ],
  shadows: [
    { type: "drop", color: "#000000", blur: 8, offsetX: 3, offsetY: 4, opacity: 0.8 },
  ],
};

export const obsidianChrome: TextEffectDefinition = {
  id: "obsidian-chrome",
  name: "Obsidian Chrome",
  category: "metallic",
  description: "Highly reflective dark obsidian radial chrome effect with a sharp drop shadow.",
  tags: ["chrome", "silver", "dark", "metal", "luxury"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 2, lineHeight: 1 },
  fills: [
    {
      type: "radial",
      stops: [
        { position: 0, color: "#FFFFFF" },
        { position: 0.15, color: "#C0C0C0" },
        { position: 0.4, color: "#606060" },
        { position: 0.6, color: "#C8C8C8" },
        { position: 0.8, color: "#2A2A2A" },
        { position: 1, color: "#0A0A0A" },
      ],
    },
  ],
  strokes: [
    { color: "#FFFFFF", width: 1, position: "outside", opacity: 0.2 },
  ],
  shadows: [
    { type: "drop", color: "#000000", blur: 20, offsetX: 0, offsetY: 8, opacity: 0.9 },
  ],
  bevel: {
    depth: 2,
    highlightColor: "#E0E0E0",
    shadowColor: "#050505",
  },
};

export const lavaForge: TextEffectDefinition = {
  id: "lava-forge",
  name: "Lava Forge",
  category: "grunge",
  description: "Intense volcanic molten lava theme with fiery ambient glow and dark outside stroke.",
  tags: ["fire", "lava", "gaming", "metal", "dramatic"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 2, lineHeight: 1 },
  fills: [
    {
      type: "linear",
      angle: 270,
      stops: [
        { position: 0, color: "#FFFFFF" },
        { position: 0.2, color: "#FFD700" },
        { position: 0.5, color: "#FF4500" },
        { position: 0.8, color: "#8B0000" },
        { position: 1, color: "#1A0000" },
      ],
    },
  ],
  strokes: [
    { color: "#3D0000", width: 3, position: "outside", opacity: 1 },
  ],
  shadows: [
    { type: "glow", color: "#FF4500", blur: 30, offsetX: 0, offsetY: 0, opacity: 0.5 },
    { type: "drop", color: "#000000", blur: 15, offsetX: 0, offsetY: 8, opacity: 0.9 },
  ],
};

export const arcticGlass: TextEffectDefinition = {
  id: "arctic-glass",
  name: "Arctic Glass",
  category: "gradient",
  description: "Frosty, semi-transparent ice-blue glass effect with double linear highlight layers.",
  tags: ["ice", "blue", "cold", "glass", "winter", "scifi"],
  font: { family: "Impact", weight: 700, style: "normal", letterSpacing: 3, lineHeight: 1 },
  fills: [
    {
      type: "linear",
      angle: 270,
      stops: [
        { position: 0, color: "#E0F7FA" },
        { position: 0.4, color: "#A8D8EA" },
        { position: 0.7, color: "#5BB8D4" },
        { position: 1, color: "#1976A8" },
      ],
    },
    {
      type: "linear",
      angle: 120,
      stops: [
        { position: 0, color: "rgba(255,255,255,0.3)" },
        { position: 0.4, color: "rgba(255,255,255,0.0)" },
        { position: 0.6, color: "rgba(255,255,255,0.0)" },
        { position: 1, color: "rgba(255,255,255,0.15)" },
      ],
    },
  ],
  strokes: [
    { color: "#FFFFFF", width: 1.5, position: "outside", opacity: 0.7 },
  ],
  shadows: [
    { type: "glow", color: "#00BFFF", blur: 25, offsetX: 0, offsetY: 0, opacity: 0.2 },
    { type: "drop", color: "#001F3F", blur: 12, offsetX: 2, offsetY: 4, opacity: 0.8 },
  ],
};

export const graffitiBomb: TextEffectDefinition = {
  id: "graffiti-bomb",
  name: "Graffiti Bomb",
  category: "grunge",
  description: "Aggressive street graffiti art with orange gradient fill and sharp 3D drop shadow.",
  tags: ["graffiti", "street", "urban", "hiphop", "spray"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 2, lineHeight: 1 },
  fills: [
    {
      type: "linear",
      angle: 0,
      stops: [
        { position: 0, color: "#F5FF00" },
        { position: 0.6, color: "#FFA500" },
        { position: 1, color: "#FF8C00" },
      ],
    },
  ],
  strokes: [
    { color: "#FFFFFF", width: 3, position: "inside", opacity: 1 },
    { color: "#000000", width: 8, position: "outside", opacity: 1 },
  ],
  shadows: [
    { type: "drop", color: "#000000", blur: 0, offsetX: 5, offsetY: 5, opacity: 1 },
  ],
};

export const holographicFoil: TextEffectDefinition = {
  id: "holographic-foil",
  name: "Holographic Foil",
  category: "gradient",
  description: "Iridescent pastel holographic foil with soft angle highlight overlays.",
  tags: ["holographic", "iridescent", "foil", "premium", "fashion"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 3, lineHeight: 1 },
  fills: [
    {
      type: "linear",
      angle: 0,
      stops: [
        { position: 0, color: "#FF6B9D" },
        { position: 0.25, color: "#C44DFF" },
        { position: 0.5, color: "#4DFFEF" },
        { position: 0.75, color: "#FFD700" },
        { position: 1, color: "#FF6B9D" },
      ],
    },
    {
      type: "linear",
      angle: 45,
      stops: [
        { position: 0, color: "rgba(255,255,255,0.0)" },
        { position: 0.4, color: "rgba(255,255,255,0.4)" },
        { position: 0.6, color: "rgba(255,255,255,0.0)" },
      ],
    },
  ],
  strokes: [
    { color: "#FFFFFF", width: 1, position: "outside", opacity: 0.4 },
  ],
  shadows: [],
};

export const retroVarsity: TextEffectDefinition = {
  id: "retro-varsity",
  name: "Retro Varsity",
  category: "retro",
  description: "Classic American varsity jacket style with thick gold/white double outside outline borders.",
  tags: ["varsity", "sports", "retro", "americana", "college"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 1, lineHeight: 1 },
  fills: [{ type: "solid", color: "#003087" }],
  strokes: [
    { color: "#FFD700", width: 8, position: "outside", opacity: 1 },
    { color: "#FFFFFF", width: 4, position: "outside", opacity: 1 },
    { color: "#003087", width: 2, position: "outside", opacity: 1 },
  ],
  shadows: [
    { type: "drop", color: "#000000", blur: 6, offsetX: 4, offsetY: 4, opacity: 0.8 },
  ],
};

export const synthwaveDoubleNeon: TextEffectDefinition = {
  id: "synthwave-double-neon",
  name: "Synthwave Neon",
  category: "neon",
  description: "Retro 80s outrun style with vibrant pink-cyan linear gradient and dual glow shadows.",
  tags: ["synthwave", "80s", "retrowave", "pink", "cyan", "neon"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 3, lineHeight: 1 },
  fills: [
    {
      type: "linear",
      angle: 270,
      stops: [
        { position: 0, color: "#FF10F0" },
        { position: 1, color: "#00F5FF" },
      ],
    },
  ],
  strokes: [
    { color: "#FFFFFF", width: 2, position: "outside", opacity: 1 },
  ],
  shadows: [
    { type: "glow", color: "#FF10F0", blur: 25, offsetX: 0, offsetY: 0, opacity: 0.5 },
    { type: "glow", color: "#00F5FF", blur: 25, offsetX: 0, offsetY: 0, opacity: 0.5 },
    { type: "drop", color: "#FF10F0", blur: 0, offsetX: 0, offsetY: 30, opacity: 0.15 },
  ],
};

export const boneCarved: TextEffectDefinition = {
  id: "bone-carved",
  name: "Bone Carved",
  category: "3d",
  description: "Elegant carved stone/ivory design using bone radial fills and inner carved shadows.",
  tags: ["carved", "stone", "engraved", "historical", "prestige"],
  font: { family: "Georgia", weight: 700, style: "normal", letterSpacing: 4, lineHeight: 1 },
  fills: [
    {
      type: "radial",
      stops: [
        { position: 0, color: "#FAF5EC" },
        { position: 0.6, color: "#F0E8D0" },
        { position: 1, color: "#D4C4A8" },
      ],
    },
  ],
  strokes: [
    { color: "#D4C4A8", width: 1, position: "outside", opacity: 1 },
  ],
  shadows: [
    { type: "inner", color: "#8B7355", blur: 6, offsetX: 2, offsetY: 2, opacity: 0.7 },
    { type: "drop", color: "#3D2B1F", blur: 10, offsetX: 4, offsetY: 5, opacity: 0.8 },
  ],
  bevel: {
    depth: 3,
    highlightColor: "#FFFFFF",
    shadowColor: "#B8A890",
  },
};

export const toxicSlime: TextEffectDefinition = {
  id: "toxic-slime",
  name: "Toxic Slime",
  category: "organic",
  description: "Sleek glowing toxic hazard theme featuring slime green radial fills and deep glow blurs.",
  tags: ["toxic", "green", "slime", "gaming", "halloween"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 2, lineHeight: 1 },
  fills: [
    {
      type: "radial",
      stops: [
        { position: 0, color: "#CCFF00" },
        { position: 0.4, color: "#39FF14" },
        { position: 0.75, color: "#00AA00" },
        { position: 1, color: "#004400" },
      ],
    },
  ],
  strokes: [
    { color: "#003300", width: 3, position: "outside", opacity: 1 },
  ],
  shadows: [
    { type: "glow", color: "#39FF14", blur: 30, offsetX: 0, offsetY: 0, opacity: 0.4 },
    { type: "drop", color: "#001400", blur: 10, offsetX: 3, offsetY: 4, opacity: 0.9 },
  ],
};

export const studioBroadcast: TextEffectDefinition = {
  id: "studio-broadcast",
  name: "Studio Broadcast",
  category: "clean",
  description: "Ultra-clean broadcast title card layout using Arial bold, wide track spacings, and clean drop shadow.",
  tags: ["clean", "broadcast", "professional", "white", "minimal"],
  font: { family: "Arial", weight: 700, style: "normal", letterSpacing: 8, lineHeight: 1 },
  fills: [{ type: "solid", color: "#FFFFFF" }],
  strokes: [],
  shadows: [
    { type: "drop", color: "#000000", blur: 25, offsetX: 0, offsetY: 6, opacity: 0.5 },
  ],
};

export const galacticNebula: TextEffectDefinition = {
  id: "galactic-nebula",
  name: "Galactic Nebula",
  category: "space",
  description: "Distant galaxy nebula aesthetic utilizing deep pink-purple radial fills and bright stars.",
  tags: ["space", "nebula", "cosmic", "scifi", "epic"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 2, lineHeight: 1 },
  fills: [
    {
      type: "radial",
      stops: [
        { position: 0, color: "#FF69B4" },
        { position: 0.3, color: "#9B59B6" },
        { position: 0.6, color: "#4A1A8C" },
        { position: 0.8, color: "#1A0A5C" },
        { position: 1, color: "#000428" },
      ],
    },
    {
      type: "linear",
      angle: 45,
      stops: [
        { position: 0, color: "rgba(255,255,255,0.0)" },
        { position: 0.3, color: "rgba(255,255,255,0.15)" },
        { position: 0.7, color: "rgba(255,255,255,0.0)" },
      ],
    },
  ],
  strokes: [
    { color: "#FFFFFF", width: 1, position: "outside", opacity: 0.3 },
  ],
  shadows: [
    { type: "glow", color: "#9B59B6", blur: 40, offsetX: 0, offsetY: 0, opacity: 0.3 },
    { type: "glow", color: "#FF69B4", blur: 15, offsetX: 0, offsetY: 0, opacity: 0.2 },
  ],
};

export const glitchCorrupt: TextEffectDefinition = {
  id: "glitch-corrupt",
  name: "Glitch Corrupt",
  category: "glitch",
  description: "Hacker corruption style with RGB screen channel splits, horizonal displacements, and scanlines.",
  tags: ["glitch", "cyberpunk", "digital", "corruption", "hacker"],
  font: { family: "Impact", weight: 900, style: "normal", letterSpacing: 2, lineHeight: 1 },
  fills: [{ type: "solid", color: "#FFFFFF" }],
  strokes: [
    { color: "#00FFFF", width: 1, position: "outside", opacity: 0.5 },
  ],
  shadows: [
    { type: "drop", color: "#000000", blur: 0, offsetX: 0, offsetY: 0, opacity: 0 },
  ],
  glitch: {
    enabled: true,
    rgbOffset: 4,
    slices: 4,
    sliceMaxOffset: 12,
    scanlineOpacity: 0.08,
  },
};

export const allEffects: TextEffectDefinition[] = [
  moltenGold3d,
  neonCrimson,
  electricRainbow,
  obsidianChrome,
  lavaForge,
  arcticGlass,
  graffitiBomb,
  holographicFoil,
  retroVarsity,
  synthwaveDoubleNeon,
  boneCarved,
  toxicSlime,
  studioBroadcast,
  galacticNebula,
  glitchCorrupt,
];
