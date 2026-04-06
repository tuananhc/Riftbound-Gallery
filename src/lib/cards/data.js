// ─── Card Data ─────────────────────────────────────────────────────────────────

export const COLOR_CONFIG = {
  Fire:   { glow: "#ff4d1a", bg: "#2a1008", accent: "#ff6b3d", icon: "🔥" },
  Water:  { glow: "#1a8fff", bg: "#081a2a", accent: "#4db8ff", icon: "💧" },
  Earth:  { glow: "#4caf50", bg: "#0a1f0a", accent: "#81c784", icon: "🌿" },
  Shadow: { glow: "#9c27b0", bg: "#1a0a2a", accent: "#ce93d8", icon: "🌑" },
  Light:  { glow: "#ffd700", bg: "#2a2208", accent: "#ffe57a", icon: "✨" },
  Arcane: { glow: "#00bcd4", bg: "#081a2a", accent: "#80deea", icon: "🔮" },
};

export const RARITY_CONFIG = {
  Common:    { color: "#9e9e9e", symbol: "◆" },
  Uncommon:  { color: "#4fc3f7", symbol: "◆" },
  Rare:      { color: "#ffd700", symbol: "◆" },
  Mythic:    { color: "#ff6d00", symbol: "◆" },
  Legendary: { color: "#e040fb", symbol: "◆" },
};

export const ALL_COLORS = ["Fire", "Water", "Earth", "Shadow", "Light", "Arcane"];
export const ALL_TAGS   = ["Creature", "Spell", "Trap", "Enchantment", "Artifact", "Hero"];

export const CARDS = [
  { id: 1,  name: "Emberveil Drake",     cost: 3, colors: ["Fire"],            tags: ["Creature"],              functionality: "Deal 2 damage to any target when this enters play. Flying.",                                                              rarity: "Rare",      power: 4, toughness: 2 },
  { id: 2,  name: "Tidecaller Sage",     cost: 2, colors: ["Water"],           tags: ["Creature", "Hero"],      functionality: "Draw a card when you cast a spell. Can block any number of creatures.",                                               rarity: "Uncommon",  power: 1, toughness: 4 },
  { id: 3,  name: "Rootbound Colossus",  cost: 6, colors: ["Earth"],           tags: ["Creature"],              functionality: "Trample. When this attacks, create two 1/1 Sapling tokens.",                                                          rarity: "Legendary", power: 7, toughness: 7 },
  { id: 4,  name: "Veilstep",            cost: 1, colors: ["Shadow"],          tags: ["Spell"],                 functionality: "Target creature gains Stealth until end of turn. Draw a card.",                                                        rarity: "Common",    power: null, toughness: null },
  { id: 5,  name: "Radiant Decree",      cost: 4, colors: ["Light"],           tags: ["Spell"],                 functionality: "Destroy all Shadow permanents. Gain 3 life for each permanent destroyed.",                                             rarity: "Rare",      power: null, toughness: null },
  { id: 6,  name: "Rift Conduit",        cost: 3, colors: ["Arcane"],          tags: ["Artifact"],              functionality: "Tap: Add one mana of any color. When tapped for mana, scry 1.",                                                        rarity: "Uncommon",  power: null, toughness: null },
  { id: 7,  name: "Ashen Phoenix",       cost: 5, colors: ["Fire", "Shadow"],  tags: ["Creature"],              functionality: "Flying. When this dies, return it to your hand and deal 1 damage to each opponent.",                                    rarity: "Mythic",    power: 5, toughness: 3 },
  { id: 8,  name: "Tidewrath Hex",       cost: 2, colors: ["Water", "Arcane"], tags: ["Trap"],                  functionality: "Counter target spell unless its controller pays 3. Scry 2.",                                                            rarity: "Rare",      power: null, toughness: null },
  { id: 9,  name: "Stoneweave Ward",     cost: 1, colors: ["Earth", "Light"],  tags: ["Enchantment"],           functionality: "Enchanted creature gets +1/+3. At the start of your turn, gain 1 life.",                                               rarity: "Common",    power: null, toughness: null },
  { id: 10, name: "The Rift Walker",     cost: 7, colors: ["Arcane", "Shadow"],tags: ["Hero"],                  functionality: "When this enters, look at the top 7 cards. You may cast any of them for free this turn.",                               rarity: "Legendary", power: 6, toughness: 6 },
  { id: 11, name: "Flamecall Cantrip",   cost: 1, colors: ["Fire"],            tags: ["Spell"],                 functionality: "Deal 1 damage to any target. Draw a card.",                                                                             rarity: "Common",    power: null, toughness: null },
  { id: 12, name: "Glacial Sentinel",    cost: 4, colors: ["Water", "Earth"],  tags: ["Creature"],              functionality: "Defender. Tap: Tap target creature an opponent controls. It doesn't untap next turn.",                                  rarity: "Uncommon",  power: 2, toughness: 6 },
  { id: 13, name: "Nightshroud Curse",   cost: 3, colors: ["Shadow"],          tags: ["Enchantment", "Trap"],   functionality: "When cast, each opponent discards a card. At end of turn, if they have no cards, deal 5 damage.",                       rarity: "Rare",      power: null, toughness: null },
  { id: 14, name: "Solarburst Hymn",     cost: 5, colors: ["Light", "Fire"],   tags: ["Spell"],                 functionality: "Deal 3 damage to each creature. Your creatures gain Indestructible until end of turn.",                                  rarity: "Mythic",    power: null, toughness: null },
  { id: 15, name: "Crystalweave Golem",  cost: 4, colors: ["Arcane", "Earth"], tags: ["Artifact", "Creature"],  functionality: "Vigilance. +1/+1 for each Artifact you control. Cannot be targeted by spells.",                                          rarity: "Uncommon",  power: 3, toughness: 3 },
  { id: 16, name: "Mirewail Specter",    cost: 2, colors: ["Shadow"],          tags: ["Creature"],              functionality: "Stealth. When this deals combat damage, target player mills 2.",                                                         rarity: "Common",    power: 2, toughness: 1 },
  { id: 17, name: "Sunpillar Cleric",    cost: 2, colors: ["Light"],           tags: ["Creature", "Hero"],      functionality: "At the start of your turn, gain 1 life. Sacrifice: prevent all damage to a creature until end of turn.",                 rarity: "Uncommon",  power: 1, toughness: 3 },
  { id: 18, name: "Galerift Serpent",    cost: 5, colors: ["Water"],           tags: ["Creature"],              functionality: "When this enters, return up to two target creatures to their owner's hands.",                                            rarity: "Rare",      power: 4, toughness: 5 },
];

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
