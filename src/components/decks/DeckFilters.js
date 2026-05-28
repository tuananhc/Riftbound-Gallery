"use client";
import { COLORS } from "../../lib/data";
import LegendSelect from "./LegendSelect";

export const DECK_TYPES = [
	{ id: "all",        label: "ALL" },
	{ id: "tournament", label: "TOURNAMENT" },
	{ id: "submitted",  label: "USER-SUBMITTED" },
];

export const RANKINGS = [
	{ id: "popular",  label: "Most Popular" },
	{ id: "winrate",  label: "Highest Win Rate" },
	{ id: "newest",   label: "Newest First" },
	{ id: "oldest",   label: "Oldest First" },
];

export const FILTER_DEFAULTS = {
	legend:   "",
	dateFrom: "",
	dateTo:   "",
	deckType: "all",
	ranking:  "popular",
};

export function activeFilterCount(filters) {
	return (
		(filters.legend !== "" ? 1 : 0) +
		(filters.dateFrom || filters.dateTo ? 1 : 0) +
		(filters.deckType !== "all" ? 1 : 0) +
		(filters.ranking !== "popular" ? 1 : 0)
	);
}

export default function DeckFilters({ legends, filters, onChange, onClear }) {
	const count = activeFilterCount(filters);

	return (
		<div style={{
			background: "#0a0c14",
			border: "1px solid #1e2030",
			borderRadius: 14,
			marginBottom: 24,
			overflow: "hidden",
		}}>
			<div style={{
				padding: "14px 20px",
				borderBottom: "1px solid #1e2030",
				display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
			}}>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.14em" }}>
						FILTER DECKS
					</span>
					{count > 0 && (
						<span style={{
							background: COLORS.gold + "20",
							border: `1px solid ${COLORS.gold}44`,
							borderRadius: 20, padding: "1px 9px",
							fontSize: 10, color: COLORS.gold,
							fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em",
						}}>
							{count} active
						</span>
					)}
				</div>
				{count > 0 && (
					<button onClick={onClear} style={{
						background: "none", border: "none", cursor: "pointer",
						fontSize: 11, color: COLORS.textMuted,
						fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em",
						padding: "4px 8px", borderRadius: 6,
					}}>
						Clear all
					</button>
				)}
			</div>

			<div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
				<div>
					<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.14em", marginBottom: 10 }}>
						LEGEND
					</div>
					<LegendSelect
						legends={legends}
						value={filters.legend}
						onChange={v => onChange("legend", v)}
					/>
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr", gap: 28 }}>
					<div>
						<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.14em", marginBottom: 10 }}>
							DECK TYPE
						</div>
						<div style={{ display: "flex", gap: 6 }}>
							{DECK_TYPES.map(t => {
								const on = filters.deckType === t.id;
								return (
									<button key={t.id} onClick={() => onChange("deckType", t.id)} style={{
										background: on ? "#1e2030" : "none",
										border: `1px solid ${on ? COLORS.gold + "55" : "#2a2c3a"}`,
										borderRadius: 6, padding: "5px 12px",
										fontSize: 10, color: on ? COLORS.gold : COLORS.textMuted,
										fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em",
										cursor: "pointer", transition: "all 0.15s",
									}}>
										{t.label}
									</button>
								);
							})}
						</div>
					</div>

					<div>
						<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.14em", marginBottom: 10 }}>
							RANKING
						</div>
						<select
							value={filters.ranking}
							onChange={e => onChange("ranking", e.target.value)}
							style={{
								background: "#12141e", border: "1px solid #2a2c3a",
								borderRadius: 6, padding: "5px 32px 5px 12px",
								fontSize: 11, color: COLORS.text,
								fontFamily: "'Segoe UI', system-ui, sans-serif",
								cursor: "pointer", outline: "none",
								colorScheme: "dark",
								appearance: "none",
								backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236a6a8a'/%3E%3C/svg%3E")`,
								backgroundRepeat: "no-repeat",
								backgroundPosition: "right 10px center",
							}}
						>
							{RANKINGS.map(r => (
								<option key={r.id} value={r.id}>{r.label}</option>
							))}
						</select>
					</div>

					<div>
						<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.14em", marginBottom: 10 }}>
							DATE RANGE
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<input
								type="date"
								value={filters.dateFrom}
								onChange={e => onChange("dateFrom", e.target.value)}
								style={{
									background: "#12141e", border: "1px solid #2a2c3a",
									borderRadius: 6, padding: "5px 10px",
									fontSize: 11, color: filters.dateFrom ? COLORS.text : COLORS.textDim,
									fontFamily: "'Segoe UI', system-ui, sans-serif",
									outline: "none", colorScheme: "dark",
								}}
							/>
							<span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>to</span>
							<input
								type="date"
								value={filters.dateTo}
								min={filters.dateFrom || undefined}
								onChange={e => onChange("dateTo", e.target.value)}
								style={{
									background: "#12141e", border: "1px solid #2a2c3a",
									borderRadius: 6, padding: "5px 10px",
									fontSize: 11, color: filters.dateTo ? COLORS.text : COLORS.textDim,
									fontFamily: "'Segoe UI', system-ui, sans-serif",
									outline: "none", colorScheme: "dark",
								}}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
