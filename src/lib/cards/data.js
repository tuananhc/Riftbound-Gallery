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
export const ALL_TAGS   = ["Legend", "Champion", "Unit", "Spell", "Token", "Gear", "Battlefield"];

export const TAGS_IMG = {
  "Legend": "https://riftbound.s3.us-east-1.amazonaws.com/resources/Type_Legend.png",
  "Champion": "https://riftbound.s3.us-east-1.amazonaws.com/resources/Type_Champion.png",
  "Unit": "https://riftbound.s3.us-east-1.amazonaws.com/resources/Type_Unit.png",
  "Spell": "https://riftbound.s3.us-east-1.amazonaws.com/resources/Type_Spell.png",
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

// ─── Champion Icons ───────────────────────────────────────────────────────────
// Square champion portraits in S3. Filenames strip whitespace and punctuation
// from the champion name in a legend's `tags_text` — "Lee Sin" → "LeeSin.png",
// "Kai'Sa" → "KaiSa.png". Not every champion has one yet, so callers fall back
// to the card art on error.

export const CHAMPION_ICON_BASE = "https://riftbound.s3.us-east-1.amazonaws.com/champion_icons";

export function championIconUrl(championName) {
	const name = championName?.split(",")[0].replace(/[^A-Za-z0-9]/g, "");
	return name ? `${CHAMPION_ICON_BASE}/${name}.png` : null;
}

// ─── Legends ──────────────────────────────────────────────────────────────────

// A card id's base printing — alternate arts repeat the number past the set size
// (e.g. "OGN-123/300" is base, "OGN-301/300" is an alt art of it).
export function isBaseCard(id) {
	const match = id?.match(/-(\d+)[^/]*\/(\d+)/);
	if (!match) return true;
	return parseInt(match[1], 10) < parseInt(match[2], 10);
}

// Card names are stored in caps ("EMPEROR OF THE SANDS"); this is display-only —
// filters and saved decks still match on the raw name.
const MINOR_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);
export function titleCase(str) {
	return str.toLowerCase().split(" ").map((word, i) =>
		i > 0 && MINOR_WORDS.has(word) ? word : word.replace(/(^|-)(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
	).join(" ");
}

// "Azir - Emperor of the Sands" — how a legend option is labelled in the pickers.
export function legendLabel(legend) {
	const name = titleCase(legend.name);
	return legend.tags_text ? `${legend.tags_text} - ${name}` : name;
}

// The legend options used by the champion pickers, sorted by champion name.
export function legendOptions(cards) {
	return cards
		.filter(c => c.card_type_text?.includes("Legend") && isBaseCard(c.id))
		.map(c => ({
			id: c.id,
			name: c.name,
			image: c.image ?? null,
			tags_text: c.tags_text ?? "",
			icon: championIconUrl(c.tags_text),
		}))
		.sort((a, b) => a.tags_text.localeCompare(b.tags_text) || a.name.localeCompare(b.name));
}
