"use client";
import Image from "next/image";
import { COLORS } from "../../lib/data";
import { ALL_COLORS, COLOR_CONFIG } from "../../lib/cards/data";

const SECTIONS = [
	{ label: "Battlefields", match: t => t?.includes("Battlefield") },
	{ label: "Runes",        match: t => t?.includes("Rune") },
	{ label: "Units",        match: t => t?.includes("Unit") || t?.includes("Champion") },
	{ label: "Spells",       match: t => t?.includes("Spell") },
	{ label: "Gears",        match: t => t?.includes("Gear") },
];

function ChampionCard({ entry, role, onRemove }) {
	const { card } = entry;
	const colors = ALL_COLORS.filter(c => card.domain_text?.includes(c));
	const accent = colors.length > 0 ? COLOR_CONFIG[colors[0]].glow : "#2a2c3a";
	const isLegend = role === "legend";

	return (
		<div style={{ display: "flex", gap: 10, background: "#0d0f1a", border: `1px solid ${accent}55`, borderRadius: 8, padding: 8 }}>
			<div style={{ width: 52, flexShrink: 0, aspectRatio: "744/1039", position: "relative", borderRadius: 5, overflow: "hidden", background: "#0a0c14" }}>
				{card.image
					? <Image src={card.image} alt={card.name} fill sizes="52px" style={{ objectFit: "contain" }} />
					: <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, opacity: 0.2 }}>🃏</div>
				}
			</div>
			<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 4 }}>
				<div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: isLegend ? COLORS.gold : "#8890c0", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
					{isLegend ? "LEGEND" : "CHOSEN CHAMPION"}
				</div>
				<div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
					{isLegend ? `${card.tags_text} - ${card.name}` : card.name}
				</div>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
						{colors.map(c => (
							<Image key={c} src={COLOR_CONFIG[c].icon} alt={c} width={13} height={13} style={{ opacity: 0.85 }} />
						))}
						{colors.length === 0 && (
							<span style={{ fontSize: 12, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>COLORLESS</span>
						)}
					</div>
					<button className="deck-count-btn" onClick={() => onRemove(card.id)}>−</button>
				</div>
			</div>
		</div>
	);
}

function ChosenChampionSection({ legendEntry, championEntry, onRemove }) {
	if (!legendEntry && !championEntry) return null;
	return (
		<div style={{ padding: "10px 10px 6px", display: "flex", flexDirection: "column", gap: 8 }}>
			<span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>Legend</span>
			{legendEntry && <ChampionCard entry={legendEntry} role="legend" onRemove={onRemove} />}
			<span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>Chosen Champion</span>
			{championEntry && <ChampionCard entry={championEntry} role="champion" onRemove={onRemove} />}
		</div>
	);
}

function DeckSection({ label, entries, onAdd, onRemove }) {
	const sectionTotal = entries.reduce((sum, e) => sum + e.count, 0);
	return (
		<div style={{ marginBottom: 4 }}>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px 3px" }}>
				<span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{label.toUpperCase()}</span>
				<span style={{ fontSize: 12, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{sectionTotal}</span>
			</div>
			{entries.map(({ card, count }) => (
				<div key={card.id} className="deck-row">
					<span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.name}</span>
					<div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
						<button className="deck-count-btn" onClick={() => onRemove(card.id)}>−</button>
						<span style={{ fontWeight: 700, color: COLORS.gold, minWidth: 12, textAlign: "center", fontSize: 12 }}>{count}</span>
						<button className="deck-count-btn" onClick={() => onAdd(card, { stopPropagation: () => {} })} style={{ opacity: count >= 3 ? 0.3 : 1, pointerEvents: count >= 3 ? "none" : "auto" }}>+</button>
					</div>
				</div>
			))}
		</div>
	);
}

export default function DeckPanel({ deck, deckOpen, deckTotal, legendId, championId, onClose, onAdd, onRemove, onCopyList, onClear }) {
	const legendEntry   = deck.find(({ card }) => card.id === legendId)   ?? null;
	const championEntry = deck.find(({ card }) => card.id === championId) ?? null;
	const hasChampionSection = legendEntry || championEntry;

	const sections = SECTIONS.map(({ label, match }) => ({
		label,
		entries: deck.filter(({ card }) => card.id !== legendId && match(card.card_type_text)),
	})).filter(s => s.entries.length > 0);

	return (
		<div className="deck-panel" style={{ transform: deckOpen ? "translateX(0)" : "translateX(100%)" }}>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #1a1c28", flexShrink: 0 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: COLORS.gold, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>DECK BUILDER</span>
					<span style={{
						fontSize: 10,
						fontFamily: "'Segoe UI', system-ui, sans-serif",
						letterSpacing: "0.08em",
						padding: deckTotal > 0 ? "6px 8px" : "0",
						borderRadius: 4,
						color: deckTotal === 0 ? COLORS.textDim : deckTotal === 40 ? "#4ade80" : "#f87171",
						background: deckTotal === 0 ? "transparent" : deckTotal === 40 ? "#4ade8018" : "#f8717118",
					}}>
						{deckTotal > 0 ? `${deckTotal}/40 CARD${deckTotal !== 1 ? "S" : ""}` : "EMPTY"}
					</span>
				</div>
				<button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
			</div>

			<div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
				{deck.length === 0 ? (
					<div style={{ textAlign: "center", padding: "48px 16px", color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 11, letterSpacing: "0.12em", lineHeight: 2 }}>
						CHOOSE A LEGEND<br />TO START BUILDING
					</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column" }}>
						<ChosenChampionSection legendEntry={legendEntry} championEntry={championEntry} onAdd={onAdd} onRemove={onRemove} />
						{sections.map((s, i) => (
							<div key={s.label}>
								{(i > 0 || hasChampionSection) && <div style={{ height: 1, background: "#1a1c28", margin: "4px 10px" }} />}
								<DeckSection label={s.label} entries={s.entries} onAdd={onAdd} onRemove={onRemove} />
							</div>
						))}
					</div>
				)}
			</div>

			<div style={{ padding: "12px 16px", borderTop: "1px solid #1a1c28", display: "flex", gap: 8, flexShrink: 0 }}>
				<button
					onClick={onCopyList}
					disabled={deckTotal === 0}
					style={{ flex: 1, background: "transparent", border: "1px solid #2a2c3a", borderRadius: 6, padding: "8px", color: deckTotal === 0 ? "#2a2c3a" : "#888", fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", cursor: deckTotal === 0 ? "default" : "pointer", transition: "all 0.2s" }}
				>
					COPY LIST
				</button>
				<button
					onClick={onClear}
					style={{ flex: 1, background: "transparent", border: "1px solid #6a2a2a", borderRadius: 6, padding: "8px", color: "#cc6060", fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s" }}
					onMouseEnter={e => { e.currentTarget.style.background = "#2a1010"; e.currentTarget.style.borderColor = "#cc4444"; e.currentTarget.style.color = "#ff8080"; }}
					onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#6a2a2a"; e.currentTarget.style.color = "#cc6060"; }}
				>
					CLEAR DECK
				</button>
			</div>
		</div>
	);
}
