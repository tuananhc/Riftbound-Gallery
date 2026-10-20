"use client";
import { useState } from "react";
import { COLORS, FONT_MONO, alpha } from "../../lib/data";

export default function SourceWidget({ source, selected, onSelect }) {
	const [hovered, setHovered] = useState(false);
	const highlighted = selected || hovered;

	return (
		<div
			onClick={() => onSelect(source.id)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				background: selected ? "linear-gradient(135deg, var(--bg-card), var(--bg-raised))" : COLORS.bgCard,
				border: `1px solid ${highlighted ? alpha(source.accentColor, 40) : COLORS.border}`,
				borderRadius: 0,
				padding: "clamp(12px, 3.5vw, 22px) clamp(12px, 3.5vw, 24px)",
				cursor: "pointer",
				transition: "all 0.25s ease",
				position: "relative",
				overflow: "hidden",
				boxShadow: selected
					? `0 0 28px ${source.glowColor}, inset 0 0 20px ${source.glowColor}`
					: hovered ? "0 4px 20px var(--shadow)" : "none",
				transform: hovered && !selected ? "translateY(-2px)" : "none",
			}}
		>
			{selected && (
				<div style={{
					position: "absolute", top: 10, right: 12,
					background: alpha(source.accentColor, 13),
					border: `1px solid ${alpha(source.accentColor, 33)}`,
					borderRadius: 0, padding: "2px 10px",
					fontSize: 9, fontFamily: FONT_MONO,
					letterSpacing: "0.15em", color: source.accentColor, fontWeight: 700,
				}}>
					SELECTED
				</div>
			)}

			<div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
				<div style={{
					width: 44, height: 44, borderRadius: 0, flexShrink: 0,
					background: source.glowColor,
					border: `1px solid ${alpha(source.accentColor, 27)}`,
					display: "flex", alignItems: "center", justifyContent: "center",
					fontSize: 20,
				}}>
					{source.icon}
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{
						fontSize: 15, fontWeight: 700,
						color: highlighted ? source.accentColor : COLORS.text,
						fontFamily: FONT_MONO,
						letterSpacing: "0.04em", transition: "color 0.2s", marginBottom: 2,
					}}>
						{source.name}
					</div>
					<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.06em" }}>
						{source.url}
					</div>
				</div>
				<div style={{ textAlign: "right", flexShrink: 0 }}>
					<div style={{ fontSize: 13, fontWeight: 700, color: source.accentColor, fontFamily: FONT_MONO }}>
						{source.deckCount}
					</div>
					<div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: FONT_MONO }}>DECKS</div>
				</div>
			</div>

			<div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: FONT_MONO, lineHeight: 1.6, marginBottom: 14 }}>
				{source.description}
			</div>

			<div style={{ display: "flex", gap: 6 }}>
				{source.tags.map(tag => (
					<span key={tag} style={{
						background: highlighted ? alpha(source.accentColor, 9) : COLORS.border,
						border: `1px solid ${highlighted ? alpha(source.accentColor, 27) : COLORS.borderHover}`,
						borderRadius: 0, padding: "2px 8px",
						fontSize: 9, color: highlighted ? source.accentColor : COLORS.textMuted,
						fontFamily: FONT_MONO, letterSpacing: "0.1em",
						transition: "all 0.2s",
					}}>
						{tag.toUpperCase()}
					</span>
				))}
			</div>
		</div>
	);
}
