// ─── Card Data ─────────────────────────────────────────────────────────────────

export const COLOR_CONFIG = {
  Fury:   { glow: "#ff4d1a", bg: "#2a1008", accent: "#ff6b3d", icon: "https://riftbound.s3.us-east-1.amazonaws.com/resources/Rune_Fury.svg" },
  Mind:  { glow: "#1a8fff", bg: "#081a2a", accent: "#4db8ff", icon: "https://riftbound.s3.us-east-1.amazonaws.com/resources/Rune_Mind.svg" },
  Calm:  { glow: "#4caf50", bg: "#0a1f0a", accent: "#81c784", icon: "https://riftbound.s3.us-east-1.amazonaws.com/resources/Rune_Calm.svg" },
  Chaos: { glow: "#9c27b0", bg: "#1a0a2a", accent: "#ce93d8", icon: "https://riftbound.s3.us-east-1.amazonaws.com/resources/Rune_Chaos.svg" },
  Order:  { glow: "#ffd700", bg: "#2a2208", accent: "#ffe57a", icon: "https://riftbound.s3.us-east-1.amazonaws.com/resources/Rune_Order.svg" },
  Body: { glow: "#ff9500", bg: "#081a2a", accent: "#fcb437", icon: "https://riftbound.s3.us-east-1.amazonaws.com/resources/Rune_Body.svg" },
};

export const RARITY_CONFIG = {
  Common:    { color: "#9e9e9e", symbol: "◆" },
  Uncommon:  { color: "#4fc3f7", symbol: "◆" },
  Rare:      { color: "#ffd700", symbol: "◆" },
  Mythic:    { color: "#ff6d00", symbol: "◆" },
  Legendary: { color: "#e040fb", symbol: "◆" },
};

export const ALL_COLORS = ["Mind", "Body", "Chaos", "Calm", "Order", "Fury"];
export const ALL_TAGS   = ["Unit", "Spell", "Champion", "Legend", "Token", "Gear", "Battlefield"];

export const TAGS_IMG = {
  "Unit": "https://riftbound.s3.us-east-1.amazonaws.com/resources/Type_Unit.png",
  "Spell": "https://riftbound.s3.us-east-1.amazonaws.com/resources/Type_Spell.png",
  "Champion": "https://riftbound.s3.us-east-1.amazonaws.com/resources/Type_Champion.png",
  "Legend": "https://riftbound.s3.us-east-1.amazonaws.com/resources/Type_Legend.png",
  "Token": "https://riftbound.s3.us-east-1.amazonaws.com/resources/Type_Gear.png",
  "Gear": "https://riftbound.s3.us-east-1.amazonaws.com/resources/Type_Gear.png",
  "Battlefield": "https://riftbound.s3.us-east-1.amazonaws.com/resources/Type_Battlefield.png"
}

export const cardGradient = (colors) => {
  if (colors.length === 1) {
    const c = COLOR_CONFIG[colors[0]];
    return `radial-gradient(ellipse at top left, ${c.bg} 0%, #0d0d14 70%)`;
  }
  const stops = colors.map((col, i) => {
    const pct = (i / (colors.length - 1)) * 100;
    return `${COLOR_CONFIG[col].bg} ${pct}%`;
  });
  return `linear-gradient(135deg, ${stops.join(", ")})`;
};

export const cardGlow = (colors) =>
  colors.map((c, i) => `0 0 ${18 + i * 4}px 2px ${COLOR_CONFIG[c].glow}44`).join(", ");

export const KEYWORD_STYLES = {
	"Action": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Reaction": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Ambush": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Hidden": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Legion": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Repeat": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Accelerate":  { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Shield": { background: "#c23667", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Assault": { background: "#c23667", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Tank": { background: "#c23667", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Backline": { background: "#c23667", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Hunt": { background: "#99b03b", color: "#000", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Temporary": { background: "#99b03b", color: "#000", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Deflect": { background: "#99b03b", color: "#000", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Deathknell": { background: "#99b03b", color: "#000", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Ganking": { background: "#99b03b", color: "#000", textTransform: "uppercase", transform: "skewX(-12deg)" },
  "Level": { background: "#99b03b", color: "#000", textTransform: "uppercase", transform: "skewX(-12deg)" },
};
