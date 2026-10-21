// ─── Design Tokens ────────────────────────────────────────────────────────────
//
// Flat grey theme in dark (default) and light variants: flat surfaces, hairline
// grey borders, square corners, monospace type, and a single blue accent.
// Emphasis comes from brightness, not hue — the only saturated colours left are
// semantic (win/loss/draw) and the game's own rune/rarity colours in
// lib/cards/data.js.

// The site's name — used in the navbar wordmark, page titles and credits.
export const SITE_NAME = "Bilgewater Tracker";

export const FONTS = ``;

// One stack for the whole UI — never hardcode a font name in a component.
export const FONT_MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// Long-form reading text on the /devlog pages only. The font file is loaded by
// src/app/devlog/layout.js, so it never downloads on any other route.
export const FONT_SANS = "'DM Sans', sans-serif";
export const FONT_SANS_URL = "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..900&display=swap";

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
    accent: "#6aa8ff", // the one blue — links, active states, figures (same as draw)
    accentDim: "#4a76b3",
    accentGlow: "#6aa8ff33",
    shadow: "rgba(0,0,0,0.6)", // drop shadows on popovers and lifted cards
    win: "#5fbf5f",
    loss: "#cc6060",
    draw: "#6aa8ff",
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
    accent: "#2563c9", // deeper than dark mode so it reads on white (same as draw)
    accentDim: "#93b1e6",
    accentGlow: "#2563c933",
    shadow: "rgba(0,0,0,0.12)",
    win: "#2e8a3a",
    loss: "#c24848",
    draw: "#2563c9",
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

// ── Phone layouts ──────────────────────────────────────────────────────────
// At or below this width the site switches to its phone layouts.
export const MOBILE_MAX_WIDTH = 640;

// Values that differ between desktop and phone, as CSS variables switched by
// one media query in BASE_STYLES — the same mechanism as the theme tokens.
// Server-rendered markup is therefore right at phone width from the first
// paint, with no flash of the desktop layout before hydration.
const LAYOUT_VARS = {
  desktop: {
    "desktop-flex": "flex", "desktop-block": "block", "desktop-grid": "grid",
    "mobile-flex": "none", "mobile-block": "none", "mobile-grid": "none",
    "nav-height": "62px", "page-pad": "32px",
    "grid-col-gap": "14px", "grid-row-gap": "14px", "cards-pad": "24px 28px",
    "content-pad": "40px 24px",
    "strip-cols": "repeat(auto-fill, minmax(280px, 1fr))", "strip-flow": "row", "strip-overflow": "visible",
    "auth-justify": "flex-start", "auth-pad": "60px 24px",
    "auth-card-bg": "var(--bg-card)", "auth-card-border": "1px solid var(--border)", "auth-card-pad": "36px 34px",
  },
  mobile: {
    "desktop-flex": "none", "desktop-block": "none", "desktop-grid": "none",
    "mobile-flex": "flex", "mobile-block": "block", "mobile-grid": "grid",
    "nav-height": "97px", "page-pad": "12px",
    "grid-col-gap": "10px", "grid-row-gap": "24px", "cards-pad": "14px 12px 96px",
    "content-pad": "16px 12px 24px",
    "strip-cols": "none", "strip-flow": "column", "strip-overflow": "auto",
    "auth-justify": "flex-end", "auth-pad": "24px 16px 20px",
    "auth-card-bg": "transparent", "auth-card-border": "none", "auth-card-pad": "0",
  },
};
const layoutVars = vars => Object.entries(vars).map(([k, v]) => `--${k}: ${v};`).join(" ");

// Show an element on one layout only: display: SHOW.mobileFlex is "flex" on
// phones and "none" on desktop. Pick the variant matching the element's display.
export const SHOW = {
  desktopFlex: "var(--desktop-flex)", desktopBlock: "var(--desktop-block)", desktopGrid: "var(--desktop-grid)",
  mobileFlex: "var(--mobile-flex)", mobileBlock: "var(--mobile-block)", mobileGrid: "var(--mobile-grid)",
};
// Height of the sticky navbar (one row on desktop, two on phones), the page's
// side padding, and the card grid's gaps and padding.
export const LAYOUT = {
  navHeight: "var(--nav-height)", pagePad: "var(--page-pad)",
  gridColGap: "var(--grid-col-gap)", gridRowGap: "var(--grid-row-gap)", cardsPad: "var(--cards-pad)",
  // Padding for reading / list pages (decks, news, dev log).
  contentPad: "var(--content-pad)",
};

// A card grid on desktop that becomes one sideways-scrolling row on phones:
// spread into the container's style. Phone items are `stripItem` wide.
export const STRIP = {
  display: "grid", gridTemplateColumns: "var(--strip-cols)", gridAutoFlow: "var(--strip-flow)",
  gridAutoColumns: "236px", overflowX: "var(--strip-overflow)", scrollbarWidth: "none",
};

export const BASE_STYLES = `
  :root { ${themeVars(THEMES.dark)} color-scheme: dark; }
  :root[data-theme="light"] { ${themeVars(THEMES.light)} color-scheme: light; }
  :root { ${layoutVars(LAYOUT_VARS.desktop)} }
  @media (max-width: ${MOBILE_MAX_WIDTH}px) { :root { ${layoutVars(LAYOUT_VARS.mobile)} } }
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
