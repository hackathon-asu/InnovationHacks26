/* ---- InsightRX Video Config ---- */

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 30 * 30, // 30 seconds
} as const;

export const BRAND = {
  name: 'InsightRX',
  tagline: 'Every payer. Every drug. One search.',
  team: 'The Formulators',
  members: ['Abhinav', 'Neeharika'],
  hackathon: 'Innovation Hacks 2.0 @ ASU',
  github: 'github.com/hackathon-asu/InnovationHacks26',
} as const;

export const COLORS = {
  navy: '#15173F',
  sky: '#91BFEB',
  skyLight: '#dceeff',
  white: '#FFFFFF',
  offWhite: '#F0EDE8',
  dark: '#0D0F2B',
  accent: '#4AEDC4',
  red: '#FF6B6B',
  amber: '#FFB347',
  emerald: '#34D399',
} as const;

/* Scene frame ranges (at 30fps) */
export const SCENES = {
  hook:           { start: 0,   duration: 90  },  // 0-3s
  problem:        { start: 90,  duration: 120 },  // 3-7s
  reveal:         { start: 210, duration: 150 },  // 7-12s
  features:       { start: 360, duration: 300 },  // 12-22s
  differentiator: { start: 660, duration: 120 },  // 22-26s
  outro:          { start: 780, duration: 120 },  // 26-30s
} as const;
