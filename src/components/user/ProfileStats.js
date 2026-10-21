"use client";
import { COLORS, FONT_MONO } from "../../lib/data";
import { seasonLabel } from "../../lib/matchStats";

// ── Profile stats ────────────────────────────────────────────────────────────
// Headline numbers on the user card, from `summarize()` in lib/matchStats.js.
// StatTiles is the full row, always shown under the name.

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
