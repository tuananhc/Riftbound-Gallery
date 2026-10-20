"use client";
import { useState } from "react";
import { COLORS, FONT_MONO, SHOW, alpha } from "../../lib/data";
import { legendLabel, titleCase } from "../../lib/cards/data";
import BottomSheet from "../BottomSheet";
import Dropdown from "../Dropdown";
import LegendIcon from "../cards/LegendIcon";
import { Chevron } from "../user/MatchStats";
import { DECK_TYPES, RANKINGS, activeFilterCount } from "./DeckFilters";

// ── Deck filters on phones ───────────────────────────────────────────────────
// The legend picker is the widest control (it's the main filter) and opens a
// searchable sheet; deck type is a 3-way toggle; ranking uses the phone's own
// picker and the date range opens a small sheet. Shown only at phone width.

const fieldBox = {
	height: 48, display: "flex", alignItems: "center", gap: 8, padding: "0 10px", minWidth: 0,
	background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, color: COLORS.text, fontFamily: FONT_MONO, cursor: "pointer", textAlign: "left",
};
const tiny = { fontSize: 9, letterSpacing: "0.14em", color: COLORS.textDim };
const fmt = iso => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");

export default function MobileDeckFilters({ legends, filters, onChange, onClear }) {
	const [sheet, setSheet] = useState(null);
	const count = activeFilterCount(filters);
	const legend = legends.find(l => l.name === filters.legend);
	const dates = filters.dateFrom || filters.dateTo ? `${fmt(filters.dateFrom) || "Any"} – ${fmt(filters.dateTo) || "Any"}` : "Any time";

	return (
		<div style={{ display: SHOW.mobileBlock, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, marginBottom: 20, fontFamily: FONT_MONO }}>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px 0 12px", height: 44, borderBottom: `1px solid ${COLORS.border}` }}>
				<span style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<span style={{ ...tiny, fontSize: 10, fontWeight: 700 }}>FILTER DECKS</span>
					{count > 0 && <span style={{ fontSize: 10, color: COLORS.accent, background: alpha(COLORS.accent, 13), border: `1px solid ${alpha(COLORS.accent, 27)}`, padding: "1px 8px" }}>{count} active</span>}
				</span>
				{count > 0 && <button onClick={onClear} style={{ height: 40, padding: "0 8px", background: "transparent", border: "none", color: COLORS.textMuted, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.1em", cursor: "pointer" }}>Clear all</button>}
			</div>
			<div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
				<button onClick={() => setSheet("legend")} style={{ ...fieldBox, height: 52, padding: "0 12px 0 8px", gap: 10 }}>
					{legend ? <LegendIcon legend={legend} size={34} /> : (
						<span style={{ width: 34, height: 34, flexShrink: 0, background: COLORS.bgHover, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: COLORS.textMuted }}>ANY</span>
					)}
					<span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
						<span style={tiny}>LEGEND</span>
						<span style={{ fontSize: 13, color: COLORS.textStrong, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{legend ? legendLabel(legend) : "Any legend"}</span>
					</span>
					<Chevron />
				</button>
				<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
					<span style={tiny}>DECK TYPE</span>
					<div style={{ display: "grid", gridTemplateColumns: "0.7fr 1fr 1.25fr", gap: 6 }}>
						{DECK_TYPES.map(t => {
							const on = filters.deckType === t.id;
							return (
								<button key={t.id} onClick={() => onChange("deckType", t.id)} aria-pressed={on} style={{
									height: 44, padding: "0 4px", whiteSpace: "nowrap", cursor: "pointer", fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.08em",
									background: on ? alpha(COLORS.accent, 13) : COLORS.bgRaised, border: `1px solid ${on ? COLORS.accentDim : COLORS.border}`, color: on ? COLORS.accent : COLORS.textMuted,
								}}>{t.label}</button>
							);
						})}
					</div>
				</div>
				<div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
					<Dropdown variant="field" label="RANKING" value={filters.ranking} onChange={v => onChange("ranking", v)} options={RANKINGS.map(r => [r.id, r.label])} />
					<button onClick={() => setSheet("dates")} style={fieldBox}>
						<span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
							<span style={tiny}>DATE RANGE</span>
							<span style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dates}</span>
						</span>
						<Chevron />
					</button>
				</div>
			</div>
			{sheet === "legend" && <LegendFilterSheet legends={legends} value={filters.legend} onPick={v => { onChange("legend", v); setSheet(null); }} onClose={() => setSheet(null)} />}
			{sheet === "dates" && <DateSheet filters={filters} onChange={onChange} onClose={() => setSheet(null)} />}
		</div>
	);
}

function LegendFilterSheet({ legends, value, onPick, onClose }) {
	const [query, setQuery] = useState("");
	const term = query.trim().toLowerCase();
	const list = legends.filter(l => l.tags_text.toLowerCase().includes(term) || l.name.toLowerCase().includes(term));
	const row = on => ({
		width: "100%", height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", fontFamily: FONT_MONO, cursor: "pointer", textAlign: "left",
		background: on ? COLORS.bgHover : "transparent", border: "none", borderBottom: `1px solid ${COLORS.border}`,
	});
	return (
		<BottomSheet title="FILTER BY LEGEND" height="78%" onClose={onClose}>
			<div style={{ position: "sticky", top: 0, zIndex: 1, background: COLORS.bgCard, padding: "8px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
				<input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search legends"
					style={{ width: "100%", height: 48, padding: "0 12px", background: COLORS.bgRaised, border: `1px solid ${COLORS.accent}`, outline: "none", color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: 16, caretColor: COLORS.accent }} />
			</div>
			{/* "Any legend" stays pinned first. */}
			<button onClick={() => onPick("")} style={row(value === "")}>
				<span style={{ width: 32, height: 32, flexShrink: 0, background: COLORS.bgHover, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: COLORS.textMuted }}>ANY</span>
				<span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: value === "" ? COLORS.accent : COLORS.textStrong }}>Any legend</span>
				{value === "" && <span style={{ color: COLORS.accent, fontWeight: 700 }}>✓</span>}
			</button>
			{list.map(l => (
				<button key={l.id} onClick={() => onPick(l.name)} style={row(l.name === value)}>
					<LegendIcon legend={l} size={32} />
					<span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
						<span style={{ color: l.name === value ? COLORS.accent : COLORS.textStrong, fontWeight: 700 }}>{l.tags_text}</span>
						<span style={{ color: COLORS.textMuted }}> - {titleCase(l.name)}</span>
					</span>
					{l.name === value && <span style={{ color: COLORS.accent, fontWeight: 700 }}>✓</span>}
				</button>
			))}
			<div style={{ height: "calc(16px + env(safe-area-inset-bottom))" }} />
		</BottomSheet>
	);
}

function DateSheet({ filters, onChange, onClose }) {
	const input = { width: "100%", height: 48, padding: "0 12px", background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: 16, outline: "none" };
	return (
		<BottomSheet title="DATE RANGE" onClose={onClose}
			footer={<>
				<button onClick={() => { onChange("dateFrom", ""); onChange("dateTo", ""); }} style={{ height: 48, padding: "0 16px", background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, color: COLORS.text, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer" }}>ANY TIME</button>
				<button onClick={onClose} style={{ flex: 1, height: 48, background: COLORS.accent, border: `1px solid ${COLORS.accent}`, color: COLORS.bg, fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer" }}>DONE</button>
			</>}>
			<div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
				<label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
					<span style={tiny}>FROM</span>
					<input type="date" value={filters.dateFrom} onChange={e => onChange("dateFrom", e.target.value)} style={input} />
				</label>
				<label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
					<span style={tiny}>TO</span>
					<input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={e => onChange("dateTo", e.target.value)} style={input} />
				</label>
			</div>
		</BottomSheet>
	);
}
