"use client";
import Image from "next/image";
import parse, { Text, Element } from "html-react-parser";
import { ALL_COLORS, COLOR_CONFIG, cardGradient, cardGlow } from "../../lib/cards/data";
import CardText from "./CardText";

function Field({ label, html }) {
	const parsed = parse(html, {
		replace(node) {
			if (node instanceof Text) {
				return <CardText text={node.data} />;
			}
			if (node instanceof Element && node.name === "img") {
				return <Image {...node.attribs} alt="" width={20} height={20} style={{ objectFit: "contain", verticalAlign: "middle", margin: "0 3px" }} />;
			}
		},
	});

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: "0.05em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{label}</h3>
			<div style={{ display: "flex", flexDirection: label.includes("Ability") ? "column" : "row" }}>{parsed}</div>
		</div>
	);
}

export default function CardModal({ card, onClose, deckOpen, onAddToDeck, deckCount = 0, deckMax = 3 }) {
	if (!card) return null;

	console.log(card); // Debug: Log the card data when the modal is opened

	const colors = ALL_COLORS.filter(c => card.domain_text?.includes(c));
	const primaryGlow = colors.length > 0 ? COLOR_CONFIG[colors[0]].glow : "#2a2c3a";

	return (
		<div className="modal-overlay" onClick={onClose} style={{ display: "flex", flexDirection: "column"}}>
			<div className="modal-card" onClick={e => e.stopPropagation()} style={{
				width: "60vw", height: "70vh",
				background: colors.length > 0 ? cardGradient(colors) : "#10121a",
				border: `1px solid ${primaryGlow}55`,
				borderRadius: 16, overflow: "hidden", position: "relative",
				boxShadow: (colors.length > 0 ? cardGlow(colors) : "none") + ", 0 30px 80px rgba(0,0,0,0.8)",
				display: "flex", flexDirection: "column",
			}}>
				{/* Row 1: Title */}
				<div style={{ padding: "18px 24px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
					<button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "#4a4a6a", fontSize: 18, cursor: "pointer" }}>✕</button>
					<div style={{ fontSize: 20, fontWeight: 700, color: "#f0e8c8", letterSpacing: "0.05em", lineHeight: 1.2, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{card.name}</div>
				</div>

				{deckOpen && (
					<button
						onClick={() => onAddToDeck(card)}
						disabled={deckCount >= deckMax}
						style={{
							position: "absolute", bottom: 14, right: 14, zIndex: 10,
							background: deckCount >= deckMax ? "#1a1c28" : "#1a2040",
							border: `1px solid ${deckCount >= deckMax ? "#2a2c3a" : "#4a5090"}`,
							borderRadius: 8, padding: "8px 16px", cursor: deckCount >= deckMax ? "default" : "pointer",
							color: deckCount >= deckMax ? "#3a3a5a" : "#8890c0",
							fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 11,
							letterSpacing: "0.12em", fontWeight: 700, transition: "all 0.2s",
						}}
						onMouseEnter={e => { if (deckCount < deckMax) { e.currentTarget.style.background = "#242860"; e.currentTarget.style.color = "#e8d090"; e.currentTarget.style.borderColor = "#e8d090"; } }}
						onMouseLeave={e => { e.currentTarget.style.background = deckCount >= deckMax ? "#1a1c28" : "#1a2040"; e.currentTarget.style.color = deckCount >= deckMax ? "#3a3a5a" : "#8890c0"; e.currentTarget.style.borderColor = deckCount >= deckMax ? "#2a2c3a" : "#4a5090"; }}
					>
						{deckCount >= deckMax ? "MAX COPIES" : `ADD TO DECK${deckCount > 0 ? ` (${deckCount}/${deckMax})` : ""}`}
					</button>
				)}

				{/* Row 2: Image + Details */}
				<div style={{ display: "flex", flex: 1, minHeight: 0 }}>
					{/* Image */}
					<div style={{ width: "50%", flexShrink: 0, position: "relative", background: "#0a0c14" }}>
						{card.image
							? <Image src={card.image} alt={card.name} fill sizes="200px" style={{ objectFit: "contain", padding: "10%" }} />
							: <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, opacity: 0.2 }}>
								{colors.length > 0 ? COLOR_CONFIG[colors[0]].icon : "🃏"}
							  </div>
						}
					</div>

					{/* Details */}
					<div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 12, minWidth: 0, overflowY: "auto" }}>
						{card.banned && (
							<div style={{ display: "flex", alignItems: "center" }}>
								<div style={{
									background: "#e84a4a", color: "#fff", fontSize: 12, fontWeight: 700,
									padding: "4px 8px", borderRadius: 4, letterSpacing: "0.1em", width: "fit-content",
									marginRight: 12,
								}}>
									BANNED
								</div>
								<p>(View announcement <a href={card.banned_announcement} style={{ color: "#4a90e2", textDecoration: "underline" }} target="_blank" rel="noopener noreferrer">here</a>)</p>
							</div>
						)}
						{card.energy_html      && <Field label="Energy"      html={card.energy_html} />}
						{card.power_html       && <Field label="Power"       html={card.power_html} />}
						{card.might_html       && <Field label="Might"       html={card.might_html} />}
						{card.domain_html      && <Field label="Domain"      html={card.domain_html} />}
						{card.card_type_html   && <Field label="Type"        html={card.card_type_html} />}
						{card.rarity_html      && <Field label="Rarity"      html={card.rarity_html} />}
						{card.tags_html        && <Field label="Tags"        html={card.tags_html} />}
						{card.ability_html     && <Field label="Ability"     html={card.ability_html} />}
						{card.effect_html      && <Field label="Effect"      html={card.effect_html} />}
						{card.might_bonus_html && <Field label="Might Bonus" html={card.might_bonus_html} />}
						{card.artist_html      && <Field label="Artist"      html={card.artist_html} />}
						{card.card_set_html    && <Field label="Set"         html={card.card_set_html} />}
					</div>
				</div>
			</div>
		</div>
	);
}
