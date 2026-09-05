/**
 * Steep's visual system for email. Everything is a system font stack because
 * Gmail strips web fonts; the character comes from weight, size and spacing.
 */
export const colors = {
  porcelain: "#FAFAF7", // page ground: warm white, not cream
  cup: "#FFFFFF", // card ground
  brew: "#22170F", // primary text: dark tea
  brewSoft: "#4A3B31", // body prose
  steam: "#8A7B70", // meta, captions
  leaf: "#E6E0D8", // hairlines
  amber: "#C4761B", // tea accent: badges, wordmark underline
  amberSoft: "#FBF1E3", // badge ground
} as const;

export const fonts = {
  display: `-apple-system, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif`,
  body: `Georgia, "Iowan Old Style", "Times New Roman", serif`,
  ui: `-apple-system, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif`,
} as const;

export const WIDTH = 600;
export const GUTTER = 28;
