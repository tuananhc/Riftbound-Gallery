"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { COLORS, FONT_MONO, alpha } from "../../lib/data";
import {
	sortChronological, seasonsOf, seasonLabel, filterMatches, eloSeries, recordsBy,
	matchupGrid, matchupExtremes, mostPlayedOpponent,
} from "../../lib/matchStats";
import RuneIcons from "../cards/RuneIcons";

// ── Data tab ─────────────────────────────────────────────────────────────────
// Analysis of the active account's saved matches. Opens on Overview (Elo over
// time, results by your legend and by opponent legend); Matchups switches to the
// your-legend × opponent-legend grid. The headline numbers live on the user card.

const LABEL = { fontSize: 10, color: COLORS.textDim, letterSpacing: "0.14em", fontFamily: FONT_MONO };
const MAX_MATCHUP_COLS = 8;

const pct = rate => `${Math.round(rate * 100)}%`;
const wld = r => `${r.wins}-${r.losses}${r.draws ? `-${r.draws}` : ""}`;

// Above 50% tints toward win, below toward loss, stronger the further from even.
function rateTint(rate) {
	const d = (rate - 0.5) * 2;
	if (Math.abs(d) < 0.01) return COLORS.bgHover;
	return alpha(d > 0 ? COLORS.win : COLORS.loss, Math.round(18 + 42 * Math.abs(d)));
}

export default function MatchStats({ matches, legends, status }) {
	const [view, setView] = useState("overview");
	// null = the latest season, "all" = every season.
	const [seasonChoice, setSeasonChoice] = useState(null);
	const [legend, setLegend] = useState("");

	if (status === "loading") return <Note>Loading your saved matches…</Note>;
	if (status === "error") return <Note color={COLORS.loss}>Couldn&rsquo;t load your saved matches. Reload the page to try again.</Note>;
	if (!matches.length) return <Note>No saved matches yet. Load them in History with Search, then save.</Note>;

	const legendById = new Map(legends.map(l => [l.id, l]));
	const seasons = seasonsOf(matches);
	const season = seasonChoice === "all" ? null : seasonChoice ?? seasons[0] ?? null;
	const inSeason = filterMatches(matches, { season, legend: null });
	const filtered = sortChronological(filterMatches(inSeason, { season: null, legend: legend || null }));
	const myLegends = recordsBy(inSeason, m => m.myChampion).map(r => r.key);

	return (
		<div style={{ fontFamily: FONT_MONO }}>
			{/* Filters, then the Overview / Matchups switch */}
			<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 12 }}>
				<Select value={season ?? "all"} onChange={v => { setSeasonChoice(v); setLegend(""); }}
					options={[...seasons.map(s => [s, seasonLabel(s)]), ["all", "All seasons"]]} />
				<Select value={legend} onChange={setLegend}
					options={[["", "All legends"], ...myLegends.map(id => [id, legendById.get(id)?.tags_text ?? id])]} />
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
				? <Note>No saved matches for this filter.</Note>
				: view === "overview"
					? <Overview matches={filtered} legendById={legendById} />
					: <Matchups matches={filtered} legendById={legendById} />}
		</div>
	);
}

// ── Overview ─────────────────────────────────────────────────────────────────
// Elo over time beside your legends, then opponent legends full width.

function Overview({ matches, legendById }) {
	const mine = recordsBy(matches, m => m.myChampion);
	const theirs = recordsBy(matches, m => m.opponentChampion).slice(0, MAX_MATCHUP_COLS);
	return (
		<>
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 8 }}>
				<Panel title="ELO OVER TIME">
					<EloChart series={eloSeries(matches)} />
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

function EloChart({ series }) {
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
	const line = series.map((m, i) => `${x(i)},${y(m.eloAfter)}`).join(" ");
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
					<polygon points={`${x(0)},${h - PAD.bottom} ${line} ${x(series.length - 1)},${h - PAD.bottom}`} style={{ fill: alpha(COLORS.accent, 8) }} />
					<polyline points={line} style={{ fill: "none", stroke: COLORS.accent, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" }} />
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
	const shownCols = cols.slice(0, MAX_MATCHUP_COLS);
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
						display: "grid", gridTemplateColumns: `110px repeat(${shownCols.length}, minmax(52px, 1fr))`,
						gap: 2, fontSize: 11, textAlign: "center", minWidth: 110 + shownCols.length * 54,
					}}>
						<span />
						{shownCols.map(c => (
							<span key={c} title={name(c)} style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
								<LegendIcon legend={legendById.get(c)} size={22} />
							</span>
						))}
						{rows.map(r => (
							<RowCells key={r} r={r} cols={shownCols} cells={cells} legendById={legendById} name={name} />
						))}
					</div>
					{cols.length > shownCols.length && (
						<div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4 }}>
							{`Showing the ${MAX_MATCHUP_COLS} opponent legends you’ve faced most.`}
						</div>
					)}
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

// Square champion icon from S3, falling back to the card art, then the initial.
function LegendIcon({ legend, size }) {
	const [failed, setFailed] = useState(false);
	const src = !failed && legend?.icon ? legend.icon : legend?.image;
	return (
		<div style={{
			position: "relative", width: size, height: size, flexShrink: 0, overflow: "hidden",
			background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`,
			display: "flex", alignItems: "center", justifyContent: "center",
			fontSize: 10, color: COLORS.textDim, fontFamily: FONT_MONO,
		}}>
			{src
				? <Image src={src} alt="" fill sizes={`${size}px`} style={{ objectFit: "cover", objectPosition: failed ? "top" : "center" }}
					onError={() => setFailed(true)} />
				: legend?.tags_text?.[0] ?? "?"}
		</div>
	);
}

function Select({ value, onChange, options }) {
	return (
		<select value={value} onChange={e => onChange(e.target.value)}
			onFocus={e => { e.target.style.borderColor = COLORS.accentDim; }}
			onBlur={e => { e.target.style.borderColor = COLORS.border; }}
			style={{
				background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, borderRadius: 0,
				color: COLORS.textMuted, fontFamily: FONT_MONO, fontSize: 11, padding: "4px 8px", outline: "none", cursor: "pointer",
			}}>
			{options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
		</select>
	);
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
