"use client";
import Image from "next/image";
import { ALL_COLORS, COLOR_CONFIG, cardGradient, cardGlow } from "../../lib/data";

function Field({ label, html }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: "0.05em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{label}</h3>
			<div style={{ display: "flex" }} dangerouslySetInnerHTML={{ __html: html }} />
		</div>
	);
}

export default function CardModal({ card, onClose }) {
	if (!card) return null;

	const colors = ALL_COLORS.filter(c => card.domain_text?.includes(c));
	const primaryGlow = colors.length > 0 ? COLOR_CONFIG[colors[0]].glow : "#2a2c3a";

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-card" onClick={e => e.stopPropagation()} style={{
				width: 560, maxWidth: "90vw", height: "60vh",
				background: colors.length > 0 ? cardGradient(colors) : "#10121a",
				border: `1px solid ${primaryGlow}55`,
				borderRadius: 16, overflow: "hidden", position: "relative",
				boxShadow: (colors.length > 0 ? cardGlow(colors) : "none") + ", 0 30px 80px rgba(0,0,0,0.8)",
				display: "flex",
			}}>
				{/* Image */}
				<div style={{ width: 200, flexShrink: 0, position: "relative", background: "#0a0c14" }}>
					{card.image
						? <Image src={card.image} alt={card.name} fill sizes="200px" style={{ objectFit: "contain" }} />
						: <div style={{ height: "100%", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, opacity: 0.2 }}>
							{colors.length > 0 ? COLOR_CONFIG[colors[0]].icon : "🃏"}
						  </div>
					}
				</div>

				{/* Details */}
				<div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
					<button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "#4a4a6a", fontSize: 18, cursor: "pointer" }}>✕</button>

					<div style={{ fontSize: 20, fontWeight: 700, color: "#f0e8c8", letterSpacing: "0.05em", lineHeight: 1.2, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{card.name}</div>
					{card.energy_html      && <Field label="Energy"      html={card.energy_html} />}
					{card.might_html       && <Field label="Might"       html={card.might_html} />}
					{card.domain_html      && <Field label="Domain"      html={card.domain_html} />}
					{card.card_type_html   && <Field label="Type"        html={card.card_type_html} />}
					{card.rarity_html      && <Field label="Rarity"      html={card.rarity_html} />}
					{card.tags_html        && <Field label="Tags"        html={card.tags_html} />}
					{card.ability_html     && <Field label="Ability"     html={card.ability_html} />}
					{card.effect_html      && <Field label="Effect"      html={card.effect_html} />}
					{card.power_html       && <Field label="Power"       html={card.power_html} />}
					{card.might_bonus_html && <Field label="Might Bonus" html={card.might_bonus_html} />}
					{card.artist_html      && <Field label="Artist"      html={card.artist_html} />}
					{card.card_set_html    && <Field label="Set"         html={card.card_set_html} />}
				</div>
			</div>
		</div>
	);
}
