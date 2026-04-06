"use client";
import { useState } from "react";
import { CARDS, COLOR_CONFIG, RARITY_CONFIG, cardGradient, cardGlow } from "../../lib/cards/data";
import { COLORS } from "../../lib/data";

// ── Mock Data ──────────────────────────────────────────────────────────────────

const USER = {
  username:  "Aethon",
  title:     "The Rift Wanderer",
  joinDate:  "March 2025",
  rank:      "Diamond II",
  avatar:    "🧙",
  stats: { wins: 142, losses: 58, draws: 4, winStreak: 7 },
};

const DECKS = [
  {
    id: 1,
    name: "Ashen Dominion",
    colors: ["Fire", "Shadow"],
    cardIds: [1, 7, 4, 11, 13],
    wins: 34, losses: 12,
    description: "Aggressive burn strategy with shadow recursion.",
    lastPlayed: "2 days ago",
  },
  {
    id: 2,
    name: "Tidewarden",
    colors: ["Water", "Arcane"],
    cardIds: [2, 6, 8, 12, 18],
    wins: 61, losses: 22,
    description: "Control and counter-spell archetype.",
    lastPlayed: "Yesterday",
  },
  {
    id: 3,
    name: "Verdant Rebirth",
    colors: ["Earth", "Light"],
    cardIds: [3, 5, 9, 17],
    wins: 47, losses: 24,
    description: "Midrange ramp into late-game bombs.",
    lastPlayed: "5 days ago",
  },
];

const MATCH_HISTORY = [
  { id: 1, result: "WIN",  opponent: "Kira_Vex",    deck: "Ashen Dominion",  turns: 8,  date: "Today, 14:32",    opponentDeck: "Storm Surge" },
  { id: 2, result: "WIN",  opponent: "Dusk_Oracle",  deck: "Tidewarden",     turns: 14, date: "Today, 11:18",    opponentDeck: "Arcane Flux" },
  { id: 3, result: "LOSS", opponent: "NullBlade99",  deck: "Ashen Dominion",  turns: 6,  date: "Yesterday",       opponentDeck: "Shadow Veil" },
  { id: 4, result: "WIN",  opponent: "Ember_Witch",  deck: "Verdant Rebirth", turns: 11, date: "Yesterday",       opponentDeck: "Blaze Tempo" },
  { id: 5, result: "WIN",  opponent: "Solstice_",    deck: "Tidewarden",     turns: 18, date: "2 days ago",      opponentDeck: "Glacial Lock" },
  { id: 6, result: "DRAW", opponent: "Phantasm_VII", deck: "Verdant Rebirth", turns: 20, date: "2 days ago",      opponentDeck: "Echoes" },
  { id: 7, result: "LOSS", opponent: "Marrow_King",  deck: "Ashen Dominion",  turns: 5,  date: "3 days ago",      opponentDeck: "Bone Harvest" },
  { id: 8, result: "WIN",  opponent: "Lyra_Dawn",    deck: "Tidewarden",     turns: 13, date: "4 days ago",      opponentDeck: "Light Control" },
];

const RANK_COLORS = {
  "Diamond II": { color: "#4fc3f7", glow: "#4fc3f744", icon: "💎" },
  "Platinum I": { color: "#9e9e9e", glow: "#9e9e9e44", icon: "🔷" },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function UserPage() {
  const [activeTab, setActiveTab]         = useState("decks");
  const [expandedDeck, setExpandedDeck]   = useState(null);
  const [historyFilter, setHistoryFilter] = useState("ALL");

  const totalGames = USER.stats.wins + USER.stats.losses + USER.stats.draws;
  const winRate    = Math.round((USER.stats.wins / totalGames) * 100);
  const rank       = RANK_COLORS[USER.rank] || { color: "#e8d090", glow: "#e8d09044", icon: "⭐" };

  const filteredHistory = MATCH_HISTORY.filter(m => historyFilter === "ALL" || m.result === historyFilter);

  return (
    <>
      <style>{`
        .tab-btn { background: transparent; border: none; border-bottom: 2px solid transparent; padding: 10px 20px; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; letter-spacing: 0.15em; color: #6a6a8a; cursor: pointer; transition: all 0.2s; }
        .tab-btn.active { color: #e8d090; border-bottom-color: #e8d090; }
        .tab-btn:hover:not(.active) { color: #aaa; }
        .deck-card { background: #10121a; border: 1px solid #1e2030; border-radius: 12px; overflow: hidden; transition: all 0.25s; cursor: pointer; }
        .deck-card:hover { border-color: #2a2c3a; transform: translateY(-2px); }
        .history-row { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-bottom: 1px solid #12141e; transition: background 0.15s; }
        .history-row:hover { background: #0d0f17; }
        .history-row:last-child { border-bottom: none; }
        .filter-pill { background: #12141e; border: 1px solid #1e2030; border-radius: 20px; padding: 5px 14px; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 10px; letter-spacing: 0.1em; color: #666; cursor: pointer; transition: all 0.2s; }
        .filter-pill.active { background: #1a1f35; border-color: #4a5090; color: #8890cc; }
        .stat-box { background: #10121a; border: 1px solid #1e2030; border-radius: 10px; padding: 18px; text-align: center; }
      `}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>

        {/* ── Profile Header ── */}
        <div style={{
          background: "linear-gradient(135deg, #0f1120 0%, #12101e 50%, #0f1120 100%)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16, padding: "32px 36px", marginBottom: 32,
          display: "flex", alignItems: "flex-start", gap: 28,
          position: "relative", overflow: "hidden",
        }}>
          {/* bg decoration */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #2a104044 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: 16, flexShrink: 0,
            background: "linear-gradient(135deg, #2a1040, #1a0830)",
            border: "2px solid #4a2060",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, boxShadow: "0 0 24px #6020a055",
          }}>{USER.avatar}</div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: COLORS.gold, letterSpacing: "0.08em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                {USER.username}
              </h1>
              <span style={{
                background: rank.glow, border: `1px solid ${rank.color}44`,
                borderRadius: 20, padding: "3px 12px",
                fontSize: 11, color: rank.color, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em",
              }}>{rank.icon} {USER.rank}</span>
            </div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: "italic", marginBottom: 16, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
              {USER.title}
            </div>
            <div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em" }}>
              MEMBER SINCE {USER.joinDate.toUpperCase()} &nbsp;·&nbsp; WIN STREAK: <span style={{ color: "#4caf50" }}>+{USER.stats.winStreak}</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            {[
              { label: "WINS",   value: USER.stats.wins,   color: "#4caf50" },
              { label: "LOSSES", value: USER.stats.losses, color: "#ef5350" },
              { label: "WIN%",   value: `${winRate}%`,     color: COLORS.gold },
            ].map(s => (
              <div key={s.label} className="stat-box" style={{ minWidth: 70 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{s.value}</div>
                <div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.15em", marginTop: 4, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ borderBottom: `1px solid ${COLORS.border}`, marginBottom: 28, display: "flex", gap: 0 }}>
          {[
            { id: "decks",   label: "MY DECKS"     },
            { id: "history", label: "MATCH HISTORY" },
          ].map(tab => (
            <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Decks Tab ── */}
        {activeTab === "decks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {DECKS.map(deck => {
              const primaryColor = COLOR_CONFIG[deck.colors[0]];
              const open = expandedDeck === deck.id;
              const deckCards = deck.cardIds.map(id => CARDS.find(c => c.id === id)).filter(Boolean);
              const wr = Math.round((deck.wins / (deck.wins + deck.losses)) * 100);

              return (
                <div key={deck.id} className="deck-card"
                  style={{ borderColor: open ? primaryColor.glow + "55" : "#1e2030", boxShadow: open ? `0 0 20px ${primaryColor.glow}22` : "none" }}>
                  {/* Header row */}
                  <div onClick={() => setExpandedDeck(open ? null : deck.id)}
                    style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 16,
                             background: open ? cardGradient(deck.colors) : "transparent" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {deck.colors.map(c => <span key={c} style={{ fontSize: 18 }}>{COLOR_CONFIG[c].icon}</span>)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.gold, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.06em" }}>{deck.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", fontStyle: "italic", marginTop: 2 }}>{deck.description}</div>
                    </div>
                    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#4caf50", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{wr}%</div>
                        <div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>WIN RATE</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{deck.wins}W {deck.losses}L</div>
                        <div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>RECORD</div>
                      </div>
                      <div style={{ fontSize: 16, color: COLORS.textDim, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>▾</div>
                    </div>
                  </div>

                  {/* Expanded: card previews */}
                  {open && (
                    <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${primaryColor.glow}22` }}>
                      <div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.15em", fontFamily: "'Segoe UI', system-ui, sans-serif", margin: "14px 0 10px" }}>
                        CARDS IN DECK ({deckCards.length})
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {deckCards.map(card => (
                          <div key={card.id} style={{
                            background: cardGradient(card.colors),
                            border: `1px solid ${COLOR_CONFIG[card.colors[0]].glow}44`,
                            borderRadius: 8, padding: "10px 12px",
                            minWidth: 140, flex: "1 1 140px", maxWidth: 180,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ fontSize: 12 }}>{card.colors.map(c => COLOR_CONFIG[c].icon).join("")}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.gold, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{card.cost}</span>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#e8d890", fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.03em", lineHeight: 1.2 }}>{card.name}</div>
                            <div style={{ fontSize: 10, color: RARITY_CONFIG[card.rarity].color, marginTop: 4, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                              {RARITY_CONFIG[card.rarity].symbol} {card.rarity}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 12, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.06em" }}>
                        LAST PLAYED: {deck.lastPlayed.toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* New deck CTA */}
            <button style={{
              background: "transparent", border: `1px dashed #2a2c3a`, borderRadius: 12,
              padding: "20px", color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif",
              fontSize: 11, letterSpacing: "0.15em", cursor: "pointer", transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.target.style.borderColor = "#4a4a6a"; e.target.style.color = "#8a8aaa"; }}
              onMouseLeave={e => { e.target.style.borderColor = "#2a2c3a"; e.target.style.color = COLORS.textDim; }}
            >
              + CREATE NEW DECK
            </button>
          </div>
        )}

        {/* ── History Tab ── */}
        {activeTab === "history" && (
          <div>
            {/* Filter pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["ALL", "WIN", "LOSS", "DRAW"].map(f => (
                <button key={f} className={`filter-pill ${historyFilter === f ? "active" : ""}`}
                  onClick={() => setHistoryFilter(f)}>{f}</button>
              ))}
              <span style={{ marginLeft: "auto", fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", alignSelf: "center", letterSpacing: "0.06em" }}>
                {filteredHistory.length} GAMES
              </span>
            </div>

            {/* Table */}
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr 60px", gap: 0,
                            padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`,
                            background: COLORS.bgAlt }}>
                {["RESULT", "OPPONENT", "MY DECK", "OPP. DECK", "TURNS"].map(h => (
                  <div key={h} style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.15em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{h}</div>
                ))}
              </div>

              {filteredHistory.map(match => {
                const resultColor = match.result === "WIN" ? "#4caf50" : match.result === "LOSS" ? "#ef5350" : "#ffd700";
                return (
                  <div key={match.id} className="history-row"
                    style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr 60px", gap: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: resultColor, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em" }}>
                      {match.result}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{match.opponent}</div>
                      <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.04em" }}>{match.date}</div>
                    </div>
                    <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", alignSelf: "center" }}>{match.deck}</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", alignSelf: "center" }}>{match.opponentDeck}</span>
                    <span style={{ fontSize: 13, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", alignSelf: "center" }}>{match.turns}</span>
                  </div>
                );
              })}

              {filteredHistory.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 12, letterSpacing: "0.1em" }}>
                  NO MATCHES FOUND
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
