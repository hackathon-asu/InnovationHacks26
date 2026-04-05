// -- Video dimensions & timing --
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const FPS = 30;

// -- Scene durations (in seconds) --
export const SCENE_DURATIONS = {
  hook: 3,
  problem: 4,
  reveal: 5,
  features: 10,
  differentiator: 4,
  outro: 4,
} as const;

// Total duration in frames
export const TOTAL_DURATION_FRAMES =
  Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) * FPS;

// -- Brand colors --
export const COLORS = {
  navy: "#15173F",
  navyLight: "#1E2050",
  accent: "#91BFEB",
  accentGlow: "#91BFEB40",
  bodyBg: "#F6F8FB",
  cardDark: "#181A20",
  white: "#FFFFFF",
  whiteAlpha: "rgba(255,255,255,0.7)",
  redAccent: "#FF4D6A",
  greenAccent: "#34D399",
  amber: "#FBBF24",
  purple: "#A78BFA",
} as const;

// -- Pipeline stages --
export const PIPELINE_STAGES = [
  { name: "Parse", icon: "01" },
  { name: "NLP", icon: "02" },
  { name: "LLM", icon: "03" },
  { name: "RxNorm", icon: "04" },
  { name: "SQL", icon: "05" },
  { name: "Chunk", icon: "06" },
  { name: "Embed", icon: "07" },
  { name: "Index", icon: "08" },
] as const;
