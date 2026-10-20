"use client";
import { COLORS, FONT_MONO, SHOW, alpha } from "../../lib/data";
import LegendSelect from "./LegendSelect";
import Dropdown from "../Dropdown";

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
			display: SHOW.desktopBlock,
			background: COLORS.bg,
			border: "1px solid var(--border)",
			borderRadius: 0,
			marginBottom: 24,
			overflow: "hidden",
		}}>
			<div style={{
				padding: "14px 20px",
				borderBottom: "1px solid var(--border)",
				display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
			}}>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.14em" }}>
						FILTER DECKS
					</span>
					{count > 0 && (
						<span style={{
							background: alpha(COLORS.accent, 13),
							border: `1px solid ${alpha(COLORS.accent, 27)}`,
							borderRadius: 0, padding: "1px 9px",
							fontSize: 10, color: COLORS.accent,
							fontFamily: FONT_MONO, letterSpacing: "0.1em",
						}}>
							{count} active
						</span>
					)}
				</div>
				{count > 0 && (
					<button onClick={onClear} style={{
						background: "none", border: "none", cursor: "pointer",
						fontSize: 11, color: COLORS.textMuted,
						fontFamily: FONT_MONO, letterSpacing: "0.1em",
						padding: "4px 8px", borderRadius: 0,
					}}>
						Clear all
					</button>
				)}
			</div>

			<div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
				<div>
					<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.14em", marginBottom: 10 }}>
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
						<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.14em", marginBottom: 10 }}>
							DECK TYPE
						</div>
						<div style={{ display: "flex", gap: 6 }}>
							{DECK_TYPES.map(t => {
								const on = filters.deckType === t.id;
								return (
									<button key={t.id} onClick={() => onChange("deckType", t.id)} style={{
										background: on ? COLORS.border : "none",
										border: `1px solid ${on ? alpha(COLORS.accent, 33) : COLORS.borderHover}`,
										borderRadius: 0, padding: "5px 12px",
										fontSize: 10, color: on ? COLORS.accent : COLORS.textMuted,
										fontFamily: FONT_MONO, letterSpacing: "0.1em",
										cursor: "pointer", transition: "all 0.15s",
									}}>
										{t.label}
									</button>
								);
							})}
						</div>
					</div>

					<div>
						<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.14em", marginBottom: 10 }}>
							RANKING
						</div>
						<Dropdown variant="compact" ariaLabel="Ranking" value={filters.ranking}
							onChange={v => onChange("ranking", v)} options={RANKINGS.map(r => [r.id, r.label])} />
					</div>

					<div>
						<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.14em", marginBottom: 10 }}>
							DATE RANGE
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<input
								type="date"
								value={filters.dateFrom}
								onChange={e => onChange("dateFrom", e.target.value)}
								style={{
									background: COLORS.bgRaised, border: "1px solid var(--border-hover)",
									borderRadius: 0, padding: "5px 10px",
									fontSize: 11, color: filters.dateFrom ? COLORS.text : COLORS.textDim,
									fontFamily: FONT_MONO,
									outline: "none",
								}}
							/>
							<span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONT_MONO }}>to</span>
							<input
								type="date"
								value={filters.dateTo}
								min={filters.dateFrom || undefined}
								onChange={e => onChange("dateTo", e.target.value)}
								style={{
									background: COLORS.bgRaised, border: "1px solid var(--border-hover)",
									borderRadius: 0, padding: "5px 10px",
									fontSize: 11, color: filters.dateTo ? COLORS.text : COLORS.textDim,
									fontFamily: FONT_MONO,
									outline: "none",
								}}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
