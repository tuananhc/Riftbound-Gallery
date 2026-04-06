// ─── Design Tokens ────────────────────────────────────────────────────────────

export const FONTS = ``;

export const COLORS = {
  bg:         "#080b12",
  bgAlt:      "#090c14",
  bgCard:     "#10121a",
  border:     "#1a1c28",
  borderHover:"#2a2c3a",
  text:       "#e8e0d0",
  textMuted:  "#6a6a8a",
  textDim:    "#3a3a5a",
  gold:       "#e8d090",
  goldDim:    "#8a7a50",
};

export const BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: ${COLORS.bg}; color: ${COLORS.text}; font-family: 'Segoe UI', system-ui, sans-serif; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0d1017; }
  ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 3px; }
  a { color: inherit; text-decoration: none; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shimmer { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
  .fade-up { animation: fadeUp 0.5s ease both; }
`;
