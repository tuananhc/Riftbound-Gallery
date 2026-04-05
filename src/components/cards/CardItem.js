"use client";
import { ALL_COLORS, ALL_TAGS, COLOR_CONFIG, RARITY_CONFIG, cardGradient, cardGlow } from "../../lib/data";

export default function CardItem({ card, onClick }) {
	const colors  = ALL_COLORS.filter(c => card.domain_text?.includes(c));
	const tags    = ALL_TAGS.filter(t => card.tags_text?.includes(t));
	const primary = colors.length > 0 ? COLOR_CONFIG[colors[0]] : { glow: "#3a3a5a", accent: "#888", icon: "?" };
	const rarity  = RARITY_CONFIG[card.rarity_text] || RARITY_CONFIG.Common;

	return (
		<div className="card-item" onClick={onClick}
			style={{ background: colors.length > 0 ? cardGradient(colors) : "#10121a", borderColor: primary.glow + "33" }}
			onMouseEnter={e => { e.currentTarget.style.boxShadow = colors.length > 0 ? cardGlow(colors) : "none"; e.currentTarget.style.borderColor = primary.glow + "77"; }}
			onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = primary.glow + "33"; }}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
				<div style={{ display: "flex", gap: 4 }}>{colors.map(c => <span key={c} style={{ fontSize: 13 }}>{COLOR_CONFIG[c].icon}</span>)}</div>
				<div className="cost-badge">{card.energy_text}</div>
			</div>
			<div style={{ fontSize: 13, fontWeight: 700, color: "#e8d890", letterSpacing: "0.04em", lineHeight: 1.3, marginBottom: 8, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{card.name}</div>
			<div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
				{tags.map(t => <span key={t} className="tag-chip" style={{ fontSize: 9, padding: "1px 6px" }}>{t}</span>)}
			</div>
			<div style={{ fontSize: 11, color: "#6a6a8a", fontFamily: "'Segoe UI', system-ui, sans-serif", lineHeight: 1.5, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
				{card.ability_text}
			</div>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
				<span style={{ fontSize: 10, color: rarity.color, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{rarity.symbol} {card.rarity_text?.toUpperCase()}</span>
				{card.power_text && <span style={{ fontSize: 12, color: "#6a6a8a", fontFamily: "'Segoe UI', system-ui, sans-serif", fontWeight: 700 }}>{card.power_text}</span>}
			</div>
		</div>
	);
}
