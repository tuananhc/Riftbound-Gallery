// ─── Design Tokens ────────────────────────────────────────────────────────────
//
// Dark grey theme: flat near-black surfaces, hairline grey borders, square
// corners, monospace type, and a single cool grey-blue accent. Emphasis comes
// from brightness, not hue — the only saturated colours left are semantic
// (win/loss/draw) and the game's own rune/rarity colours in lib/cards/data.js.

export const FONTS = ``;

// One stack for the whole UI — never hardcode a font name in a component.
export const FONT_MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const COLORS = {
  bg:         "#121212", // page background
  bgAlt:      "#161616", // sidebar / secondary surface
  bgCard:     "#1a1a1a", // card background
  bgRaised:   "#202020", // inputs, buttons, raised rows
  bgHover:    "#242424", // row / menu item hover
  border:     "#333333", // default hairline border
  borderHover:"#4a4a4a",
  text:       "#d8d8d8", // primary text
  textMuted:  "#8a8a8d", // secondary text
  textDim:    "#5f5f62", // disabled / hint text
  accent:     "#8fa3bf", // cool grey-blue — links, active states, figures
  accentDim:  "#5d6e86",
  accentGlow: "#8fa3bf33",
  // Semantic result colours (unchanged by the theme).
  win:        "#5fbf5f",
  loss:       "#cc6060",
  draw:       "#bdb76b",
};

export const BASE_STYLES = `
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
