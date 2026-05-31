"use client";
import Image from "next/image";
import { COLORS } from "../../lib/data";

const FONT = "'Segoe UI', system-ui, sans-serif";

function SourceChips({ sources }) {
	return (
		<div style={{
			padding: "16px 24px",
			borderBottom: "1px solid #1e2030",
			display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
		}}>
			<div>
				<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, letterSpacing: "0.12em", marginBottom: 6 }}>
					PULLING FROM
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
					{sources.map(s => (
						<span key={s.id} style={{
							display: "inline-flex", alignItems: "center", gap: 6,
							background: s.accentColor + "15",
							border: `1px solid ${s.accentColor}44`,
							borderRadius: 20, padding: "3px 12px",
							fontSize: 11, color: s.accentColor,
							fontFamily: FONT, letterSpacing: "0.08em",
						}}>
							<span style={{ fontSize: 13 }}>{s.icon}</span>
							{s.name}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}

function SkeletonRows() {
	return (
		<div style={{ padding: "20px 24px" }}>
			{[...Array(6)].map((_, i) => (
				<div key={i} style={{
					display: "flex", alignItems: "center", gap: 16,
					padding: "14px 0",
					borderBottom: i < 5 ? "1px solid #1a1c28" : "none",
					opacity: 1 - i * 0.12,
				}}>
					<div style={{ width: 44, height: 60, borderRadius: 6, background: "#1a1c28", flexShrink: 0 }} />
					<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
						<div style={{ height: 12, background: "#1a1c28", borderRadius: 4, width: `${50 + (i % 3) * 14}%` }} />
						<div style={{ height: 9, background: "#14161f", borderRadius: 4, width: `${25 + (i % 2) * 15}%` }} />
					</div>
					<div style={{ width: 56, height: 22, background: "#1a1c28", borderRadius: 10, flexShrink: 0 }} />
				</div>
			))}
		</div>
	);
}

function DeckRow({ deck }) {
	const authorClean = deck.author?.replace(/^by/, "") ?? "Unknown";

	return (
		<a
			href={deck.href}
			target="_blank"
			rel="noopener noreferrer"
			style={{
				display: "flex", alignItems: "center", gap: 16,
				padding: "12px 24px", textDecoration: "none",
				borderBottom: "1px solid #1a1c28",
				transition: "background 0.15s",
			}}
			onMouseEnter={e => e.currentTarget.style.background = "#0d0f1a"}
			onMouseLeave={e => e.currentTarget.style.background = "transparent"}
		>
			{deck.thumbnail ? (
				<Image
					src={deck.thumbnail}
					alt={deck.name}
					width={44}
					height={60}
					style={{ objectFit: "contain", borderRadius: 6, flexShrink: 0, background: "#0d0f1a" }}
				/>
			) : (
				<div style={{ width: 44, height: 60, borderRadius: 6, background: "#1a1c28", flexShrink: 0 }} />
			)}

			<div style={{ flex: 1, minWidth: 0 }}>
				<div style={{
					fontSize: 13, fontWeight: 600, color: COLORS.text,
					fontFamily: FONT, marginBottom: 4,
					overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
				}}>
					{deck.name}
				</div>
				<div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT }}>
					{authorClean}
				</div>
			</div>

			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
				<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
				<polyline points="15 3 21 3 21 9" />
				<line x1="10" y1="14" x2="21" y2="3" />
			</svg>
		</a>
	);
}

export default function DeckResultsPanel({ sources, searching, decks, error }) {
	return (
		<div style={{
			background: "#0d0f1a",
			border: "1px solid #1e2030",
			borderRadius: 14,
			overflow: "hidden",
		}}>
			<SourceChips sources={sources} />

			{searching && (
				<>
					<div style={{ padding: "16px 24px 0", fontSize: 11, color: COLORS.textMuted, fontFamily: FONT, letterSpacing: "0.08em" }}>
						Crawling selected sources...
					</div>
					<SkeletonRows />
				</>
			)}

			{!searching && error && (
				<div style={{ padding: "32px 24px", textAlign: "center" }}>
					<div style={{ fontSize: 13, color: "#f87171", fontFamily: FONT, marginBottom: 6 }}>
						Crawl failed
					</div>
					<div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT, maxWidth: 480, margin: "0 auto" }}>
						{error}
					</div>
				</div>
			)}

			{!searching && !error && decks !== null && decks.length === 0 && (
				<div style={{ padding: "32px 24px", textAlign: "center" }}>
					<div style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: FONT }}>
						No decks found for the selected filters.
					</div>
				</div>
			)}

			{!searching && !error && decks !== null && decks.length > 0 && (
				<>
					<div style={{ padding: "12px 24px", borderBottom: "1px solid #1e2030", fontSize: 11, color: COLORS.textDim, fontFamily: FONT, letterSpacing: "0.08em" }}>
						{decks.length} deck{decks.length !== 1 ? "s" : ""} found
					</div>
					<div>
						{decks.map((deck, i) => (
							<DeckRow key={deck.id ?? i} deck={deck} />
						))}
					</div>
				</>
			)}
		</div>
	);
}
