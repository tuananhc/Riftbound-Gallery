"use client";
import { useState, useEffect, useRef } from "react";
import { COLORS, FONT_MONO, alpha } from "../../lib/data";
import {
	sortChronological, filterMatches, eloSeries, recordsBy, seasonOfMatch, seasonLabel,
	matchupGrid, matchupExtremes, mostPlayedOpponent,
} from "../../lib/matchStats";
import RuneIcons from "../cards/RuneIcons";
import LegendIcon from "../cards/LegendIcon";
import Dropdown from "../Dropdown";

// ── Data tab ─────────────────────────────────────────────────────────────────
// Analysis of the active account's saved matches. Opens on Overview (Elo over
// time, results by your legend and by opponent legend); Matchups switches to the
// your-legend × opponent-legend grid. The headline numbers live on the user card.

const LABEL = { fontSize: 10, color: COLORS.textDim, letterSpacing: "0.14em", fontFamily: FONT_MONO };

const pct = rate => `${Math.round(rate * 100)}%`;
const wld = r => `${r.wins}-${r.losses}${r.draws ? `-${r.draws}` : ""}`;

// Elo restarts each season, so the Elo line breaks where the season changes:
// runs of consecutive points in one season → [{ season, start, end }] (indexes
// into the series, end inclusive).
function seasonRuns(series, seasons) {
	const runs = [];
	series.forEach((m, i) => {
		const season = seasonOfMatch(m, seasons);
		if (runs.at(-1)?.season === season) runs.at(-1).end = i;
		else runs.push({ season, start: i, end: i });
	});
	return runs;
}

// "Season 4: Vendetta" → "S4"; a slug without a number keeps its label.
function shortSeason(slug, seasons) {
	if (!slug) return "";
	const name = seasons?.find(s => s.slug === slug)?.name ?? seasonLabel(slug);
	const n = name.match(/season\s*(\d+)/i)?.[1];
	return n ? `S${n}` : name.toUpperCase();
}

// Above 50% tints toward win, below toward loss, stronger the further from even.
function rateTint(rate) {
	const d = (rate - 0.5) * 2;
	if (Math.abs(d) < 0.01) return COLORS.bgHover;
	return alpha(d > 0 ? COLORS.win : COLORS.loss, Math.round(18 + 42 * Math.abs(d)));
}

// The season comes from the selector beside the DATA / HISTORY tabs: `season`
// is its slug (null = all seasons), `seasonName` its label, and `seasons` is
// EloShowdown's list, used to place rows saved without a season by date.
// `mobile` switches to the phone layouts; `onGoToHistory` lets the phone empty
// state jump to the History tab, where picks are made.
export default function MatchStats({ matches, legends, status, season, seasonName, seasons, mobile, onGoToHistory }) {
	const [view, setView] = useState("overview");
	const [legend, setLegend] = useState("");

	if (status === "loading") return <Note>Loading your saved matches…</Note>;
	if (status === "error") return <Note color={COLORS.loss}>Couldn&rsquo;t load your saved matches. Reload the page to try again.</Note>;
	if (!matches.length) return <Note>No saved matches yet. Load them in History with Search, then save.</Note>;

	const legendById = new Map(legends.map(l => [l.id, l]));
	const inSeason = filterMatches(matches, { season, legend: null, seasons });
	const filtered = sortChronological(filterMatches(inSeason, { legend: legend || null }));
	const myLegends = recordsBy(inSeason, m => m.myChampion).map(r => r.key);
	const legendOptions = [["", "All"], ...myLegends.map(id => [id, legendById.get(id)?.tags_text ?? id])];
	const emptyNote = season ? `No saved matches in ${seasonName ?? "this season"}${legend ? " for this legend" : ""}.` : "No saved matches for this filter.";

	if (mobile) {
		const hasPicks = filtered.some(m => m.myChampion || m.opponentChampion);
		return (
			<div style={{ fontFamily: FONT_MONO, display: "flex", flexDirection: "column", gap: 12 }}>
				<FieldSelect label="LEGEND" value={legend} options={legendOptions} onChange={setLegend} />
				<Segmented value={view} onChange={setView} options={[["overview", "OVERVIEW"], ["matchups", "MATCHUPS"]]} />
				{filtered.length === 0
					? <Note>{emptyNote}</Note>
					: !hasPicks
						? <NoPicksYet onGoToHistory={onGoToHistory} />
						: view === "overview"
							? <MobileOverview matches={filtered} legendById={legendById} seasons={seasons} />
							: <MobileMatchups matches={filtered} legendById={legendById} />}
			</div>
		);
	}

	return (
		<div style={{ fontFamily: FONT_MONO }}>
			{/* Filters, then the Overview / Matchups switch */}
			<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 12 }}>
				<Select value={legend} onChange={setLegend}
					options={[["", "All legends"], ...legendOptions.slice(1)]} />
				<div style={{ marginLeft: "auto", display: "flex" }}>
					{[["overview", "OVERVIEW"], ["matchups", "MATCHUPS"]].map(([key, text]) => (
						<button key={key} onClick={() => setView(key)} aria-pressed={view === key}
							style={{
								padding: "4px 12px", marginLeft: -1, borderRadius: 0, cursor: "pointer",
								border: `1px solid ${view === key ? COLORS.accentDim : COLORS.border}`,
								background: view === key ? COLORS.accentGlow : COLORS.bgRaised,
								color: view === key ? COLORS.accent : COLORS.textMuted,
								fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.14em",
								position: "relative", zIndex: view === key ? 1 : 0,
							}}>
							{text}
						</button>
					))}
				</div>
			</div>

			{filtered.length === 0
				? <Note>{emptyNote}</Note>
				: view === "overview"
					? <Overview matches={filtered} legendById={legendById} seasons={seasons} />
					: <Matchups matches={filtered} legendById={legendById} />}
		</div>
	);
}

// ── Overview ─────────────────────────────────────────────────────────────────
// Elo over time beside your legends, then opponent legends full width.

function Overview({ matches, legendById, seasons }) {
	const mine = recordsBy(matches, m => m.myChampion);
	const theirs = recordsBy(matches, m => m.opponentChampion);
	return (
		<>
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 8 }}>
				<Panel title="ELO OVER TIME">
					<EloChart series={eloSeries(matches)} seasons={seasons} />
				</Panel>
				<Panel title="BY YOUR LEGEND">
					{mine.length
						? mine.map(r => <LegendRecord key={r.key} legend={legendById.get(r.key)} id={r.key} record={r} color={COLORS.accent} />)
						: <Hint>Pick your legends in History to see this.</Hint>}
				</Panel>
			</div>
			<div style={{ marginTop: 8 }}>
				<Panel title="VS OPPONENT LEGEND">
					{theirs.length ? (
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", columnGap: 24 }}>
							{theirs.map(r => <LegendRecord key={r.key} legend={legendById.get(r.key)} id={r.key} record={r}
								color={r.winRate > 0.5 ? COLORS.win : r.winRate < 0.5 ? COLORS.loss : COLORS.textDim} />)}
						</div>
					) : <Hint>Pick opponent legends in History to see this.</Hint>}
				</Panel>
			</div>
		</>
	);
}

// Line of Elo after each match, with a crosshair + tooltip on hover. Drawn at
// the container's real pixel width (not a stretched viewBox), so axis text and
// strokes stay the same size however wide the panel is.
const CHART_HEIGHT = 180;
const PAD = { left: 38, right: 6, top: 8, bottom: 8 };

function EloChart({ series, seasons }) {
	const wrapRef = useRef(null);
	const [width, setWidth] = useState(0);
	const [hover, setHover] = useState(null);
	const drawable = series.length >= 2;

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;
		const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
		observer.observe(el);
		return () => observer.disconnect();
	}, [drawable]);

	if (!drawable) return <Hint>Elo shows here once two or more saved matches have it — Search and save in History.</Hint>;

	const elos = series.map(m => m.eloAfter);
	const step = Math.max(...elos) - Math.min(...elos) > 300 ? 100 : 50;
	const min = Math.floor((Math.min(...elos) - 5) / step) * step;
	const max = Math.ceil((Math.max(...elos) + 5) / step) * step;
	const h = CHART_HEIGHT;
	const x = i => PAD.left + (i * (width - PAD.left - PAD.right)) / (series.length - 1);
	const y = e => PAD.top + ((max - e) * (h - PAD.top - PAD.bottom)) / (max - min);
	const runs = seasonRuns(series, seasons);
	const lineOf = run => series.slice(run.start, run.end + 1).map((m, k) => `${x(run.start + k)},${y(m.eloAfter)}`).join(" ");
	const ticks = [];
	for (let t = min; t <= max; t += step) ticks.push(t);
	const m = hover != null ? series[hover] : null;

	function onMove(e) {
		const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
		const i = Math.round(((px - PAD.left) / (width - PAD.left - PAD.right)) * (series.length - 1));
		setHover(Math.max(0, Math.min(series.length - 1, i)));
	}

	return (
		<div ref={wrapRef} style={{ position: "relative", height: h }}>
			{width > 0 && (
				<svg width={width} height={h} role="img"
					aria-label={`Elo over ${series.length} matches, from ${elos[0]} to ${elos.at(-1)}`}
					onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: "block" }}>
					{ticks.map(t => (
						<g key={t}>
							<line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} style={{ stroke: COLORS.bgHover }} />
							<text x={0} y={y(t) + 4} style={{ fill: COLORS.textDim, fontSize: 11, fontFamily: FONT_MONO }}>{t}</text>
						</g>
					))}
					{runs.map(run => (
						<g key={run.start}>
							<polygon points={`${x(run.start)},${h - PAD.bottom} ${lineOf(run)} ${x(run.end)},${h - PAD.bottom}`} style={{ fill: alpha(COLORS.accent, 8) }} />
							<polyline points={lineOf(run)} style={{ fill: "none", stroke: COLORS.accent, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" }} />
							{run.start === run.end && <circle cx={x(run.start)} cy={y(series[run.start].eloAfter)} r={2.5} style={{ fill: COLORS.accent }} />}
						</g>
					))}
					{runs.length > 1 && runs.map((run, i) => {
						// Divider halfway between the last match of one season and the first of the next.
						const left = i === 0 ? PAD.left : (x(run.start - 1) + x(run.start)) / 2;
						return (
							<g key={`s${run.start}`}>
								{i > 0 && <line x1={left} x2={left} y1={PAD.top} y2={h - PAD.bottom} style={{ stroke: COLORS.borderHover, strokeDasharray: "3 3" }} />}
								<text x={left + 4} y={PAD.top + 10} style={{ fill: COLORS.textDim, fontSize: 10, letterSpacing: "0.1em", fontFamily: FONT_MONO }}>{shortSeason(run.season, seasons)}</text>
							</g>
						);
					})}
					{m && (
						<>
							<line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={h - PAD.bottom} style={{ stroke: COLORS.borderHover }} />
							<circle cx={x(hover)} cy={y(m.eloAfter)} r={4} style={{ fill: COLORS.accent, stroke: COLORS.bgCard, strokeWidth: 2 }} />
						</>
					)}
				</svg>
			)}
			{m && (
				<div style={{
					position: "absolute", top: 0, pointerEvents: "none",
					...(hover > series.length / 2 ? { right: width - x(hover) + 10 } : { left: x(hover) + 10 }),
					background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: "6px 8px",
					fontSize: 11, color: COLORS.text, whiteSpace: "nowrap", boxShadow: `0 4px 12px ${COLORS.shadow}`,
				}}>
					<div style={{ color: COLORS.textDim }}>{m.playedAt ? new Date(m.playedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""} · vs {m.opponent}</div>
					<div>
						<span style={{ color: COLORS.accent, fontWeight: 700 }}>{m.eloAfter}</span>
						{m.eloChange != null && m.eloChange !== 0 && (
							<span style={{ color: m.eloChange > 0 ? COLORS.win : COLORS.loss }}> {m.eloChange > 0 ? "+" : ""}{m.eloChange}</span>
						)}
						<span style={{ color: COLORS.textDim }}> {m.result}</span>
					</div>
				</div>
			)}
		</div>
	);
}

// One legend's games and win rate, with a bar for the rate.
function LegendRecord({ legend, id, record, color }) {
	return (
		<div title={`${legend?.tags_text ?? id}: ${wld(record)} (${pct(record.winRate)})`}
			style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", gap: 8, alignItems: "center", marginBottom: 8, fontSize: 12 }}>
			<LegendIcon legend={legend} size={20} />
			<div style={{ minWidth: 0 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.text }}>
					<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{legend?.tags_text ?? id}</span>
					<RuneIcons domains={legend?.domains} size={12} />
				</div>
				<div style={{ height: 4, background: COLORS.bgHover, marginTop: 4 }}>
					<div style={{ width: pct(record.winRate), height: 4, background: color }} />
				</div>
			</div>
			<span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
				{pct(record.winRate)} <span style={{ color: COLORS.textDim }}>{record.games}</span>
			</span>
		</div>
	);
}

// ── Matchups ─────────────────────────────────────────────────────────────────

function Matchups({ matches, legendById }) {
	const { rows, cols, cells } = matchupGrid(matches);
	const { best, toughest } = matchupExtremes(cells);
	const opponent = mostPlayedOpponent(matches);
	const name = id => legendById.get(id)?.tags_text ?? id;
	const pair = key => key.split("|").map(name).join(" vs ");

	return (
		<>
			<div style={{ ...LABEL, marginBottom: 6 }}>YOUR LEGEND × OPPONENT LEGEND · WIN% (GAMES)</div>
			{rows.length === 0 ? (
				<Hint>Pick both legends on a match in History to see matchups.</Hint>
			) : (
				<div style={{ overflowX: "auto", marginBottom: 12 }}>
					<div style={{
						display: "grid", gridTemplateColumns: `110px repeat(${cols.length}, minmax(52px, 1fr))`,
						gap: 2, fontSize: 11, textAlign: "center", minWidth: 110 + cols.length * 54,
					}}>
						<span />
						{cols.map(c => (
							<span key={c} title={name(c)} style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
								<LegendIcon legend={legendById.get(c)} size={22} />
							</span>
						))}
						{rows.map(r => (
							<RowCells key={r} r={r} cols={cols} cells={cells} legendById={legendById} name={name} />
						))}
					</div>
				</div>
			)}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
				<Callout title="BEST MATCHUP" body={best ? pair(best.key) : "—"}
					sub={best ? `${wld(best)} · ${pct(best.winRate)}` : "Needs 2+ games in a matchup"} subColor={best ? COLORS.win : undefined} />
				<Callout title="TOUGHEST" body={toughest ? pair(toughest.key) : "—"}
					sub={toughest ? `${wld(toughest)} · ${pct(toughest.winRate)}` : "Needs 2+ games in a matchup"} subColor={toughest ? COLORS.loss : undefined} />
				<Callout title="MOST PLAYED OPPONENT" body={opponent?.name ?? "—"}
					sub={opponent ? `${opponent.games} games · ${wld(opponent)}` : ""} />
			</div>
		</>
	);
}

function RowCells({ r, cols, cells, legendById, name }) {
	return (
		<>
			<span style={{ display: "flex", alignItems: "center", gap: 6, textAlign: "left", fontSize: 12, color: COLORS.text, minWidth: 0 }}>
				<LegendIcon legend={legendById.get(r)} size={20} />
				<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name(r)}</span>
			</span>
			{cols.map(c => {
				const cell = cells.get(`${r}|${c}`);
				return cell ? (
					<span key={c} title={`${name(r)} vs ${name(c)}: ${wld(cell)} (${pct(cell.winRate)})`}
						style={{ background: rateTint(cell.winRate), color: COLORS.text, padding: "7px 0", lineHeight: 1.2 }}>
						{pct(cell.winRate)}<div style={{ fontSize: 10, color: COLORS.textMuted }}>({cell.games})</div>
					</span>
				) : (
					<span key={c} style={{ background: COLORS.bgCard, color: COLORS.textDim, padding: "7px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>·</span>
				);
			})}
		</>
	);
}

// ── Shared pieces ────────────────────────────────────────────────────────────

function Select({ value, onChange, options, label }) {
	return <Dropdown variant="compact" value={value} options={options} onChange={onChange} label={label} ariaLabel={label ?? "Legend"} />;
}

function Panel({ title, children }) {
	return (
		<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: 10, minWidth: 0 }}>
			<div style={{ ...LABEL, marginBottom: 10 }}>{title}</div>
			{children}
		</div>
	);
}

function Callout({ title, body, sub, subColor }) {
	return (
		<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: 10, minWidth: 0 }}>
			<div style={LABEL}>{title}</div>
			<div style={{ fontSize: 12, color: COLORS.text, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{body}</div>
			<div style={{ fontSize: 11, color: subColor ?? COLORS.textDim }}>{sub}</div>
		</div>
	);
}

function Note({ children, color }) {
	return <div style={{ fontSize: 11, color: color ?? COLORS.textMuted, fontFamily: FONT_MONO, padding: "6px 0" }}>{children}</div>;
}

function Hint({ children }) {
	return <div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONT_MONO, padding: "4px 0" }}>{children}</div>;
}

// ── Phone layouts ────────────────────────────────────────────────────────────

// 48px labelled field (phones, filter cards).
export function FieldSelect(props) {
	return <Dropdown variant="field" {...props} />;
}

export function Chevron({ color }) {
	return (
		<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ flexShrink: 0, color: color ?? COLORS.textDim }}>
			<path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
		</svg>
	);
}

// Two-way switch in a recessed track; the active half is lifted and blue.
export function Segmented({ value, onChange, options }) {
	return (
		<div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, 1fr)`, border: `1px solid ${COLORS.border}`, background: COLORS.bgAlt, padding: 3, gap: 3 }}>
			{options.map(([key, text]) => (
				<button key={key} onClick={() => onChange(key)} aria-pressed={value === key} style={{
					height: 38, border: "none", fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.14em", fontWeight: 700, cursor: "pointer",
					background: value === key ? COLORS.bgHover : "transparent", color: value === key ? COLORS.accent : COLORS.textMuted,
				}}>{text}</button>
			))}
		</div>
	);
}

function NoPicksYet({ onGoToHistory }) {
	return (
		<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
			<div style={LABEL}>NO LEGEND DATA YET</div>
			<div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>Pick your legends in History to see this.</div>
			{onGoToHistory && (
				<button onClick={onGoToHistory} style={{
					height: 44, padding: "0 18px", background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`,
					color: COLORS.text, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer",
				}}>GO TO HISTORY →</button>
			)}
		</div>
	);
}

function MobileOverview({ matches, legendById, seasons }) {
	const mine = recordsBy(matches, m => m.myChampion);
	const theirs = recordsBy(matches, m => m.opponentChampion);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: 12 }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
					<span style={LABEL}>ELO OVER TIME</span>
					<span style={{ fontSize: 10, color: COLORS.textDim }}>DRAG TO SCRUB</span>
				</div>
				<ScrubChart series={eloSeries(matches)} seasons={seasons} />
			</div>
			<LegendList title="BY YOUR LEGEND" rows={mine} legendById={legendById} tone={() => COLORS.accent} emptyHint="Pick your legends in History to see this." />
			<LegendList title="VS OPPONENT LEGEND" rows={theirs} legendById={legendById} colored
				tone={r => r.winRate > 0.5 ? COLORS.win : r.winRate < 0.5 ? COLORS.loss : COLORS.textDim}
				emptyHint="Pick opponent legends in History to see this." />
		</div>
	);
}

function LegendList({ title, rows, legendById, tone, colored, emptyHint }) {
	return (
		<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}>
			<div style={{ ...LABEL, padding: "12px 12px 4px" }}>{title}</div>
			{rows.length === 0 && <div style={{ padding: "8px 12px 12px" }}><Hint>{emptyHint}</Hint></div>}
			{rows.map(r => {
				const legend = legendById.get(r.key);
				return (
					<div key={r.key} title={`${legend?.tags_text ?? r.key}: ${wld(r)}`} style={{
						display: "grid", gridTemplateColumns: "32px minmax(0, 1fr) 64px 44px", gap: 10, alignItems: "center",
						padding: "8px 12px", minHeight: 52, borderTop: `1px solid ${COLORS.border}`,
					}}>
						<LegendIcon legend={legend} size={32} />
						<div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
							<span style={{ fontSize: 13, color: COLORS.textStrong, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{legend?.tags_text ?? r.key}</span>
							<RuneIcons domains={legend?.domains} size={13} />
						</div>
						<span style={{ height: 4, background: COLORS.bgHover, position: "relative" }}>
							<span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct(r.winRate), background: tone(r) }} />
						</span>
						<span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
							<span style={{ fontSize: 14, fontWeight: 700, color: colored ? tone(r) : COLORS.textStrong }}>{pct(r.winRate)}</span>
							<span style={{ fontSize: 9, color: COLORS.textDim }}>{r.games} G</span>
						</span>
					</div>
				);
			})}
		</div>
	);
}

// Elo line you scrub by pressing and dragging. The crosshair snaps to the
// nearest match, the tooltip pins to the top and stays inside the panel, and
// after a touch it lingers for 2s.
const SCRUB_HEIGHT = 150;
const SCRUB_LINGER_MS = 2000;
const fmtDate = (d, opts) => (d ? new Date(d).toLocaleDateString("en-GB", opts).toUpperCase() : "");

function ScrubChart({ series, seasons }) {
	const [index, setIndex] = useState(null);
	const linger = useRef(null);
	useEffect(() => () => clearTimeout(linger.current), []);
	if (series.length < 2) return <Hint>Elo shows here once two or more saved matches have it — Search and save in History.</Hint>;

	const elos = series.map(m => m.eloAfter);
	const max = Math.max(...elos);
	const min = Math.min(...elos);
	const span = max - min || 1;
	const x = i => (i / (series.length - 1)) * 100;
	const y = e => ((max - e) / span) * 100;
	const runs = seasonRuns(series, seasons);
	const pointsOf = run => series.slice(run.start, run.end + 1).map((m, k) => `${x(run.start + k) * 3},${y(m.eloAfter) * 1.5}`).join(" ");
	// Season boundaries, as % across: halfway between one season's last match and the next's first.
	const edges = runs.map((run, i) => (i === 0 ? 0 : (x(run.start - 1) + x(run.start)) / 2));
	const m = index != null ? series[index] : null;

	function scrub(e) {
		clearTimeout(linger.current);
		const rect = e.currentTarget.getBoundingClientRect();
		const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
		setIndex(Math.round(f * (series.length - 1)));
	}
	function release(e) {
		clearTimeout(linger.current);
		if (e.pointerType === "touch") linger.current = setTimeout(() => setIndex(null), SCRUB_LINGER_MS);
		else setIndex(null);
	}

	const change = m?.eloChange;
	const resColor = m?.result === "WIN" ? COLORS.win : m?.result === "LOSS" ? COLORS.loss : COLORS.draw;
	return (
		<>
			<div style={{ display: "flex", gap: 6 }}>
				<div style={{ position: "relative", width: 32, height: SCRUB_HEIGHT, flexShrink: 0, fontSize: 9, color: COLORS.textDim }}>
					<span style={{ position: "absolute", top: -5, right: 0 }}>{max}</span>
					<span style={{ position: "absolute", top: SCRUB_HEIGHT / 2 - 5, right: 0 }}>{Math.round((max + min) / 2)}</span>
					<span style={{ position: "absolute", bottom: -5, right: 0 }}>{min}</span>
				</div>
				<div onPointerDown={scrub} onPointerMove={e => { if (e.pointerType !== "touch" || e.buttons) scrub(e); }}
					onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
					role="img" aria-label={`Elo over ${series.length} matches, from ${elos[0]} to ${elos.at(-1)}`}
					style={{ position: "relative", flex: 1, height: SCRUB_HEIGHT, touchAction: "none", cursor: "crosshair" }}>
					<svg viewBox={`0 0 300 ${SCRUB_HEIGHT}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
						{[0, SCRUB_HEIGHT / 2, SCRUB_HEIGHT].map(gy => (
							<line key={gy} x1="0" x2="300" y1={gy} y2={gy} vectorEffect="non-scaling-stroke" style={{ stroke: COLORS.border, strokeWidth: 1 }} />
						))}
						{runs.map((run, i) => (
							<g key={run.start}>
								{i > 0 && <line x1={edges[i] * 3} x2={edges[i] * 3} y1="0" y2={SCRUB_HEIGHT} vectorEffect="non-scaling-stroke" style={{ stroke: COLORS.borderHover, strokeWidth: 1, strokeDasharray: "3 3" }} />}
								<polyline points={pointsOf(run)} vectorEffect="non-scaling-stroke" style={{ fill: "none", stroke: COLORS.accent, strokeWidth: 1.75 }} />
							</g>
						))}
					</svg>
					{/* Season tags sit in HTML, since text in the stretched SVG would distort. */}
					{runs.length > 1 && runs.map((run, i) => (
						<span key={run.start} style={{ position: "absolute", top: 2, left: `calc(${edges[i]}% + 4px)`, fontSize: 9, letterSpacing: "0.1em", color: COLORS.textDim, pointerEvents: "none" }}>
							{shortSeason(run.season, seasons)}
						</span>
					))}
					{runs.filter(run => run.start === run.end).map(run => (
						<span key={`dot${run.start}`} style={{ position: "absolute", left: `${x(run.start)}%`, top: `${y(series[run.start].eloAfter)}%`, width: 4, height: 4, margin: "-2px 0 0 -2px", background: COLORS.accent, pointerEvents: "none" }} />
					))}
					{m && (
						<>
							<span style={{ position: "absolute", top: 0, bottom: 0, left: `${x(index)}%`, width: 1, background: COLORS.borderHover }} />
							<span style={{ position: "absolute", left: `${x(index)}%`, top: `${y(m.eloAfter)}%`, width: 9, height: 9, margin: "-4px 0 0 -4px", background: COLORS.accent, border: `2px solid ${COLORS.bgCard}` }} />
							<div style={{
								position: "absolute", top: -6, width: 148, pointerEvents: "none",
								left: `clamp(0px, calc(${x(index)}% - 74px), calc(100% - 148px))`,
								background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, boxShadow: `0 8px 24px ${COLORS.shadow}`,
								padding: "8px 10px", display: "flex", flexDirection: "column", gap: 3,
							}}>
								<span style={{ fontSize: 9, letterSpacing: "0.1em", color: COLORS.textDim }}>{fmtDate(m.playedAt, { day: "numeric", month: "short", year: "numeric" })}</span>
								<span style={{ fontSize: 11, color: COLORS.textStrong, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>vs {m.opponent}</span>
								<span style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 11 }}>
									<span style={{ color: COLORS.accent, fontWeight: 700, fontSize: 14 }}>{m.eloAfter}</span>
									{change != null && change !== 0 && <span style={{ color: resColor }}>{change > 0 ? "+" : ""}{change}</span>}
									<span style={{ marginLeft: "auto", color: resColor, fontWeight: 700, letterSpacing: "0.1em", fontSize: 10 }}>{m.result}</span>
								</span>
							</div>
						</>
					)}
				</div>
			</div>
			<div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 38, marginTop: 8, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em" }}>
				{[series[0], series[Math.floor((series.length - 1) / 2)], series.at(-1)].map((p, i) => (
					<span key={i}>{fmtDate(p.playedAt, { day: "numeric", month: "short" })}</span>
				))}
			</div>
		</>
	);
}

// Your legend × opponent legend, swiping sideways with your column frozen.
function MobileMatchups({ matches, legendById }) {
	const { rows, cols, cells } = matchupGrid(matches);
	const { best, toughest } = matchupExtremes(cells);
	const opponent = mostPlayedOpponent(matches);
	const tint = rate => {
		const amt = Math.round(10 + Math.abs(rate - 0.5) * 2 * 34);
		return rate === 0.5 ? COLORS.bgHover : alpha(rate > 0.5 ? COLORS.win : COLORS.loss, amt);
	};
	const frozen = { position: "sticky", left: 0, zIndex: 2, width: 92, flexShrink: 0, background: COLORS.bgCard, borderRight: `1px solid ${COLORS.border}` };
	const pair = key => key.split("|").map(id => legendById.get(id));
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: 12 }}>
					<span style={LABEL}>YOU × OPPONENT</span>
					<span style={{ fontSize: 10, color: COLORS.textDim }}>SWIPE →</span>
				</div>
				{rows.length === 0 ? (
					<div style={{ padding: "0 12px 12px" }}><Hint>Pick both legends on a match in History to see matchups.</Hint></div>
				) : (
					<div style={{ overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", borderTop: `1px solid ${COLORS.border}` }}>
						<div style={{ width: "max-content" }}>
							<div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}` }}>
								<div style={{ ...frozen, display: "flex", alignItems: "flex-end", padding: 8, fontSize: 9, letterSpacing: "0.1em", color: COLORS.textDim }}>YOU ↓ / OPP →</div>
								{cols.map(c => (
									<div key={c} style={{ width: 64, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 2px" }}>
										<LegendIcon legend={legendById.get(c)} size={26} />
										<span style={{ fontSize: 9, color: COLORS.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 60 }}>{legendById.get(c)?.tags_text ?? c}</span>
									</div>
								))}
							</div>
							{rows.map(r => (
								<div key={r} style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}` }}>
									<div style={{ ...frozen, display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
										<LegendIcon legend={legendById.get(r)} size={26} />
										<span style={{ fontSize: 11, color: COLORS.textStrong, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{legendById.get(r)?.tags_text ?? r}</span>
									</div>
									{cols.map(c => {
										const cell = cells.get(`${r}|${c}`);
										return (
											<div key={c} style={{
												width: 64, height: 52, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
												background: cell ? tint(cell.winRate) : "transparent", borderRight: `1px solid ${COLORS.bgCard}`,
											}}>
												<span style={{ fontSize: 12, fontWeight: 700, color: cell ? COLORS.textStrong : COLORS.textDim }}>{cell ? pct(cell.winRate) : "—"}</span>
												{cell && <span style={{ fontSize: 9, color: COLORS.textMuted }}>({cell.games})</span>}
											</div>
										);
									})}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
			<MobileCallout label="BEST MATCHUP" legends={best && pair(best.key)} value={best && pct(best.winRate)} sub={best && `(${best.games})`} color={COLORS.win} />
			<MobileCallout label="TOUGHEST MATCHUP" legends={toughest && pair(toughest.key)} value={toughest && pct(toughest.winRate)} sub={toughest && `(${toughest.games})`} color={COLORS.loss} />
			<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
				<span style={LABEL}>MOST PLAYED OPPONENT</span>
				{opponent ? (
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<span style={{ fontSize: 12, color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opponent.name}</span>
						<span style={{ fontSize: 10, color: COLORS.textDim, whiteSpace: "nowrap" }}>{opponent.games} games</span>
						<span style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 4 }}>
							<span style={{ fontSize: 18, fontWeight: 700, color: opponent.winRate >= 0.5 ? COLORS.win : COLORS.loss }}>{pct(opponent.winRate)}</span>
							<span style={{ fontSize: 10, color: COLORS.textDim }}>win</span>
						</span>
					</div>
				) : <Hint>No matches yet.</Hint>}
			</div>
		</div>
	);
}

function MobileCallout({ label, legends, value, sub, color }) {
	return (
		<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
			<span style={LABEL}>{label}</span>
			{legends ? (
				<div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
					<LegendIcon legend={legends[0]} size={30} />
					<span style={{ fontSize: 12, color: COLORS.textStrong, whiteSpace: "nowrap" }}>{legends[0]?.tags_text}</span>
					<span style={{ fontSize: 10, color: COLORS.textDim }}>vs</span>
					<LegendIcon legend={legends[1]} size={30} />
					<span style={{ fontSize: 12, color: COLORS.textStrong, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{legends[1]?.tags_text}</span>
					<span style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 4, flexShrink: 0 }}>
						<span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
						<span style={{ fontSize: 10, color: COLORS.textDim }}>{sub}</span>
					</span>
				</div>
			) : <Hint>Needs 2+ games in a matchup.</Hint>}
		</div>
	);
}
