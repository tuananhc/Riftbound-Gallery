"use client";
import { useState } from "react";
import { COLORS } from "../../lib/data";

export default function SourceWidget({ source, selected, onSelect }) {
	const [hovered, setHovered] = useState(false);
	const highlighted = selected || hovered;

	return (
		<div
			onClick={() => onSelect(source.id)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				background: selected ? "linear-gradient(135deg, #0d0f1a, #12141e)" : "#0d0f1a",
				border: `1px solid ${highlighted ? source.accentColor + "66" : "#1e2030"}`,
				borderRadius: 14,
				padding: "22px 24px",
				cursor: "pointer",
				transition: "all 0.25s ease",
				position: "relative",
				overflow: "hidden",
				boxShadow: selected
					? `0 0 28px ${source.glowColor}, inset 0 0 20px ${source.glowColor}`
					: hovered ? "0 4px 20px rgba(0,0,0,0.4)" : "none",
				transform: hovered && !selected ? "translateY(-2px)" : "none",
			}}
		>
			{selected && (
				<div style={{
					position: "absolute", top: 10, right: 12,
					background: source.accentColor + "22",
					border: `1px solid ${source.accentColor}55`,
					borderRadius: 20, padding: "2px 10px",
					fontSize: 9, fontFamily: "'Segoe UI', system-ui, sans-serif",
					letterSpacing: "0.15em", color: source.accentColor, fontWeight: 700,
				}}>
					SELECTED
				</div>
			)}

			<div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
				<div style={{
					width: 44, height: 44, borderRadius: 10, flexShrink: 0,
					background: source.glowColor,
					border: `1px solid ${source.accentColor}44`,
					display: "flex", alignItems: "center", justifyContent: "center",
					fontSize: 20,
				}}>
					{source.icon}
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{
						fontSize: 15, fontWeight: 700,
						color: highlighted ? source.accentColor : COLORS.text,
						fontFamily: "'Segoe UI', system-ui, sans-serif",
						letterSpacing: "0.04em", transition: "color 0.2s", marginBottom: 2,
					}}>
						{source.name}
					</div>
					<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.06em" }}>
						{source.url}
					</div>
				</div>
				<div style={{ textAlign: "right", flexShrink: 0 }}>
					<div style={{ fontSize: 13, fontWeight: 700, color: source.accentColor, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
						{source.deckCount}
					</div>
					<div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>DECKS</div>
				</div>
			</div>

			<div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", lineHeight: 1.6, marginBottom: 14 }}>
				{source.description}
			</div>

			<div style={{ display: "flex", gap: 6 }}>
				{source.tags.map(tag => (
					<span key={tag} style={{
						background: highlighted ? source.accentColor + "18" : "#1a1c28",
						border: `1px solid ${highlighted ? source.accentColor + "44" : "#2a2c3a"}`,
						borderRadius: 4, padding: "2px 8px",
						fontSize: 9, color: highlighted ? source.accentColor : COLORS.textMuted,
						fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em",
						transition: "all 0.2s",
					}}>
						{tag.toUpperCase()}
					</span>
				))}
			</div>
		</div>
	);
}
