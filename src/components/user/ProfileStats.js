"use client";
import { COLORS, FONT_MONO } from "../../lib/data";
import { seasonLabel } from "../../lib/matchStats";

// ── Profile stats ────────────────────────────────────────────────────────────
// Headline numbers on the user card, from `summarize()` in lib/matchStats.js.
// StatSummary is the one-line version beside the name, with the toggle that
// expands the card; StatTiles is the full row shown when it's expanded.

const pct = rate => (rate == null ? "—" : `${Math.round(rate * 100)}%`);
const resultColor = { WIN: COLORS.win, LOSS: COLORS.loss, DRAW: COLORS.draw };

function Record({ record }) {
	return (
		<>
			<span style={{ color: COLORS.win }}>{record.wins}</span>-
			<span style={{ color: COLORS.loss }}>{record.losses}</span>-
			<span style={{ color: COLORS.draw }}>{record.draws}</span>
		</>
	);
}

export function StatSummary({ stats, ready, open, onToggle }) {
	return (
		<button onClick={onToggle} aria-expanded={open} title={open ? "Hide stats" : "Show stats"}
			onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.borderHover; }}
			onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
			style={{
				display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
				background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, borderRadius: 0,
				padding: "6px 10px", cursor: "pointer", fontFamily: FONT_MONO, fontSize: 12, color: COLORS.text,
				transition: "border-color 0.15s",
			}}>
			<span><span style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.14em" }}>ELO </span>
				<span style={{ color: COLORS.accent, fontWeight: 700 }}>{ready ? stats.last?.eloAfter ?? "—" : "—"}</span></span>
			<span>{ready ? <Record record={stats.record} /> : "—"}</span>
			<span>{ready ? pct(stats.record.winRate) : "—"}</span>
			<span aria-hidden="true" style={{ color: COLORS.textDim, fontSize: 10, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
		</button>
	);
}

function Tile({ label, value, valueColor, sub, subColor }) {
	return (
		<div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, padding: "8px 10px", minWidth: 0 }}>
			<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.14em" }}>{label}</div>
			<div style={{ fontSize: 18, fontWeight: 700, color: valueColor ?? COLORS.text, marginTop: 2, whiteSpace: "nowrap" }}>{value}</div>
			<div style={{ fontSize: 11, color: subColor ?? COLORS.textDim, minHeight: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
		</div>
	);
}

export function StatTiles({ stats, season, ready }) {
	const { record, streaks, last, peak } = stats;
	const change = last?.eloChange;
	const current = streaks.current;
	const peakDate = peak?.playedAt && new Date(peak.playedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
	return (
		<div style={{ marginTop: 10, fontFamily: FONT_MONO }}>
			<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.14em", marginBottom: 6 }}>
				{season ? seasonLabel(season).toUpperCase() : "ALL SAVED MATCHES"}
			</div>
			{!ready ? (
				<div style={{ fontSize: 11, color: COLORS.textDim }}>Stats appear once your saved matches load.</div>
			) : (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 6 }}>
					<Tile label="ELO" value={last?.eloAfter ?? "—"} valueColor={COLORS.accent}
						sub={change == null ? "" : `${change > 0 ? "+" : ""}${change} last`}
						subColor={change > 0 ? COLORS.win : change < 0 ? COLORS.loss : COLORS.textDim} />
					<Tile label="PEAK" value={peak?.eloAfter ?? "—"} sub={peakDate ?? ""} />
					<Tile label="RECORD" value={<Record record={record} />} sub={`${record.games} games`} />
					<Tile label="WIN%" value={pct(record.winRate)} sub={record.draws ? "draws count as games" : ""} />
					<Tile label="STREAK" value={current ? `${current.result[0]}${current.length}` : "—"}
						valueColor={current ? resultColor[current.result] : undefined}
						sub={streaks.bestWin ? `best W${streaks.bestWin}` : ""} />
				</div>
			)}
		</div>
	);
}
