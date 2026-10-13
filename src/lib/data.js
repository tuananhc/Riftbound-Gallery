// ─── Design Tokens ────────────────────────────────────────────────────────────
//
// Flat grey theme in dark (default) and light variants: flat surfaces, hairline
// grey borders, square corners, monospace type, and a single sky blue accent.
// Emphasis comes from brightness, not hue — the only saturated colours left are
// semantic (win/loss/draw) and the game's own rune/rarity colours in
// lib/cards/data.js.

export const FONTS = ``;

// One stack for the whole UI — never hardcode a font name in a component.
export const FONT_MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// Raw palettes for each theme. Components never read these — they use COLORS,
// whose values are CSS variables that BASE_STYLES points at the active palette.
export const THEMES = {
  dark: {
    bg: "#121212", // page background
    bgAlt: "#161616", // sidebar / secondary surface
    bgCard: "#1a1a1a", // card background
    bgRaised: "#202020", // inputs, buttons, raised rows
    bgHover: "#242424", // row / menu item hover
    border: "#333333", // default hairline border
    borderHover: "#4a4a4a",
    text: "#d8d8d8", // primary text
    textStrong: "#e8e8e8", // headings, titles
    textMuted: "#8a8a8d", // secondary text
    textDim: "#5f5f62", // disabled / hint text
    accent: "#8ecbff", // sky blue — links, active states, figures
    accentDim: "#5a88b0",
    accentGlow: "#8ecbff33",
    shadow: "rgba(0,0,0,0.6)", // drop shadows on popovers and lifted cards
    win: "#5fbf5f",
    loss: "#cc6060",
    draw: "#bdb76b",
  },
  light: {
    bg: "#f3f3f3",
    bgAlt: "#ebebeb",
    bgCard: "#ffffff",
    bgRaised: "#f7f7f7",
    bgHover: "#e9e9e9",
    border: "#d6d6d6",
    borderHover: "#b4b4b4",
    text: "#1c1c1c",
    textStrong: "#0a0a0a",
    textMuted: "#5e5e62",
    textDim: "#8e8e92",
    accent: "#1f6fb8", // sky blue is unreadable on white, so a deeper blue
    accentDim: "#8db6dd",
    accentGlow: "#1f6fb833",
    shadow: "rgba(0,0,0,0.12)",
    win: "#2e8a3a",
    loss: "#c24848",
    draw: "#8c8628",
  },
};

const cssVar = key => `--${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`;
const themeVars = palette => Object.entries(palette).map(([k, v]) => `${cssVar(k)}: ${v};`).join(" ");

// COLORS.bg === "var(--bg)", COLORS.bgCard === "var(--bg-card)", and so on.
export const COLORS = Object.fromEntries(Object.keys(THEMES.dark).map(k => [k, `var(${cssVar(k)})`]));

// Translucent version of any colour, including a COLORS token — appending a hex
// alpha suffix (COLORS.accent + "55") doesn't work on a CSS variable.
export const alpha = (color, percent) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

// localStorage key for the theme toggle; read before paint by the script in layout.js.
export const THEME_STORAGE_KEY = "riftbound-theme";

export const BASE_STYLES = `
  :root { ${themeVars(THEMES.dark)} color-scheme: dark; }
  :root[data-theme="light"] { ${themeVars(THEMES.light)} color-scheme: light; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: ${COLORS.bg}; color: ${COLORS.text}; font-family: ${FONT_MONO}; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.border}; }
  a { color: inherit; text-decoration: none; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shimmer { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
  .fade-up { animation: fadeUp 0.5s ease both; }
`;
