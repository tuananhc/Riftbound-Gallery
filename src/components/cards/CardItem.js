"use client";
import Image from "next/image";

export default function CardItem({ card, onClick, deckCount = 0 }) {
	const isBattlefield = card.card_type_text?.includes("Battlefield");
	const inDeck = deckCount > 0;

	return (
		<div onClick={onClick} style={{
			cursor: "pointer", borderRadius: 10, overflow: "visible", position: "relative",
			aspectRatio: "744 / 1039", background: "#0a0c14",
			transition: "transform 0.2s ease, box-shadow 0.2s ease, outline 0.15s ease",
			outline: inDeck ? "2px solid #34ed40" : "none",
			outlineOffset: "2px",
		}}
			onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.6)"; }}
			onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
		>
			{card.image
				? <Image src={card.image} alt={card.name} fill sizes="220px" style={{ objectFit: "contain", transform: isBattlefield ? "rotate(90deg) scale(1.396)" : "none" }} />
				: <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, opacity: 0.2 }}>🃏</div>
			}
			{card.banned && (
				<div style={{
					position: "absolute", top: 8, right: 8,
					background: "#e84a4a", color: "#fff", fontSize: 15, fontWeight: 700,
					padding: "2px 6px", borderRadius: 4, letterSpacing: "0.1em",
				}}>
					BANNED
				</div>
			)}
			{inDeck && (
				<div style={{
					position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)",
					background: "#34ed40", color: "#0a0c14", fontSize: 13, fontWeight: 900,
					width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center",
					justifyContent: "center", letterSpacing: "0.05em",
				}}>
					{deckCount}
				</div>
			)}
		</div>
	);
}
