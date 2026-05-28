"use client";
import { COLORS } from "../../lib/data";

export default function DeckResultsPanel({ sources }) {
	const sourceList = sources.map(s => s.name).join(", ");

	return (
		<div style={{
			background: "#0d0f1a",
			border: "1px solid #1e2030",
			borderRadius: 14,
			overflow: "hidden",
		}}>
			<div style={{
				padding: "18px 24px",
				borderBottom: "1px solid #1e2030",
				display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
			}}>
				<div>
					<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.12em", marginBottom: 6 }}>
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
								fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em",
							}}>
								<span style={{ fontSize: 13 }}>{s.icon}</span>
								{s.name}
							</span>
						))}
					</div>
				</div>
				<div style={{
					display: "inline-flex", alignItems: "center", gap: 8,
					background: "#1a1c28",
					border: "1px solid #2a2c3a",
					borderRadius: 8, padding: "8px 16px",
					fontSize: 10, color: COLORS.textMuted,
					fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.12em",
				}}>
					<span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 6px #34d399" }} />
					CRAWLER PENDING
				</div>
			</div>

			<div style={{ padding: "24px" }}>
				<div style={{ marginBottom: 20, fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", lineHeight: 1.7 }}>
					Decklists from <span style={{ color: COLORS.text }}>{sourceList}</span> will appear here once the crawler is live.
					Results will be merged and sorted by source, date, and popularity.
				</div>

				{[...Array(5)].map((_, i) => (
					<div key={i} style={{
						display: "flex", alignItems: "center", gap: 16,
						padding: "14px 16px",
						background: i % 2 === 0 ? "#0a0c14" : "transparent",
						borderRadius: 8, marginBottom: 4,
						opacity: 1 - i * 0.15,
					}}>
						<div style={{ width: 36, height: 36, borderRadius: 6, background: "#1a1c28", flexShrink: 0 }} />
						<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
							<div style={{ height: 11, background: "#1a1c28", borderRadius: 4, width: `${55 + (i % 3) * 15}%` }} />
							<div style={{ height: 9, background: "#14161f", borderRadius: 4, width: `${30 + (i % 2) * 20}%` }} />
						</div>
						<div style={{ width: 60, height: 20, background: "#1a1c28", borderRadius: 10, flexShrink: 0 }} />
						<div style={{ width: 40, height: 20, background: "#14161f", borderRadius: 10, flexShrink: 0 }} />
					</div>
				))}

				<div style={{ textAlign: "center", paddingTop: 16 }}>
					<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em" }}>
						— SCRAPING INTEGRATION COMING SOON —
					</div>
				</div>
			</div>
		</div>
	);
}
