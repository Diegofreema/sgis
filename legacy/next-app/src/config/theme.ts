/** Typography scale — use these values in component className strings */
export const typography = {
  display: "clamp(3rem, 7vw, 6rem)",
  h1: "clamp(2.5rem, 5vw, 4.5rem)",
  h2: "clamp(2rem, 4vw, 3.25rem)",
  h3: "clamp(1.5rem, 3vw, 2.25rem)",
  h4: "1.5rem",
  body: "1rem",
  small: "0.875rem",
  tiny: "0.75rem",
} as const;

/** Animation durations */
export const motion = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  verySlow: 0.8,
} as const;

/** Breakpoints (px) — keep in sync with Tailwind */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;
