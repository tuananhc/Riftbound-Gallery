"use client";
import { useState } from "react";
import { COLORS, FONT_MONO, alpha } from "../../lib/data";
import { titleCase } from "../../lib/cards/data";
import { scoreOptions } from "../../lib/matchStats";
import { newGame } from "../../lib/nexusDrafts";
import BottomSheet from "../BottomSheet";
import Dropdown from "../Dropdown";
import LegendIcon from "../cards/LegendIcon";

// ── Nexus Night tab ──────────────────────────────────────────────────────────
// Log the games of a local event as you play them — opponent, legends, result,
// score — so nothing is forgotten by the time UVS / EloShowdown publish the
// results. Each drafted game then finds its real match (lib/nexusDrafts.js) and
// fills that History row's picks, ready to review and save.
//
//   drafts      the active account's drafts, newest first
//   matches     Map gameId → EloShowdown point the game was matched to
//   savedById   Map matchId → saved MatchHistory item (says what's stored)
//   saveState   { [draftId]: "saving" | "saved" | "error" }

const LABEL = { fontSize: 10, letterSpacing: "0.14em", color: COLORS.textDim };
const RESULTS = [["WIN", "W"], ["LOSS", "L"], ["DRAW", "D"]];
const RESULT_COLOR = { WIN: COLORS.win, LOSS: COLORS.loss, DRAW: COLORS.draw };

export default function NexusNight({ drafts, legends, matches, savedById, saveState, status, isGuest, mobile, onCreate, onChange, onDelete, onGoToHistory }) {
	const legendById = new Map(legends.map(l => [l.id, l]));
	return (
		<div style={{ fontFamily: FONT_MONO, display: "flex", flexDirection: "column", gap: mobile ? 12 : 10 }}>
			<div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
				<div style={{ flex: "1 1 260px", fontSize: 11, lineHeight: 1.6, color: COLORS.textMuted }}>
					Log games as you play them. Once UVS posts the results, press Search in History and
					each game fills in its match, ready to save.
					{isGuest && <span style={{ color: COLORS.textDim }}> As a guest, drafts stay in this browser only.</span>}
				</div>
				<button onClick={onCreate} style={{ ...primaryButton, height: mobile ? 48 : 30, width: mobile ? "100%" : "auto" }}>+ NEW EVENT</button>
			</div>
			{status === "loading" && <div style={{ ...LABEL, padding: "6px 0" }}>LOADING DRAFTS…</div>}
			{status === "error" && <div style={{ fontSize: 11, color: COLORS.loss }}>Couldn&rsquo;t load your drafts. Reload the page to try again.</div>}
			{status === "ready" && drafts.length === 0 && (
				<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: "28px 20px", textAlign: "center", fontSize: 12, color: COLORS.textMuted }}>
					No events drafted. Start one when you sit down for round 1.
				</div>
			)}
			{drafts.map(d => (
				<EventCard key={d.draftId} draft={d} legendById={legendById} legends={legends} matches={matches} savedById={savedById}
					saveState={saveState[d.draftId]} mobile={mobile} onChange={onChange} onDelete={onDelete} onGoToHistory={onGoToHistory} />
			))}
		</div>
	);
}

function EventCard({ draft, legends, legendById, matches, savedById, saveState, mobile, onChange, onDelete, onGoToHistory }) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const update = fields => onChange({ ...draft, ...fields });
	const setGame = (id, fields) => update({ games: draft.games.map(g => (g.id === id ? { ...g, ...fields } : g)) });
	const statuses = draft.games.map(g => gameStatus(g, matches, savedById));
	const allSaved = statuses.length > 0 && statuses.every(s => s.kind === "saved");
	const record = { WIN: 0, LOSS: 0, DRAW: 0 };
	for (const g of draft.games) if (g.result) record[g.result]++;

	return (
		<div style={{ background: COLORS.bgCard, border: `1px solid ${allSaved ? COLORS.accentDim : COLORS.border}` }}>
			{/* Event name, date, record and save state */}
			<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: mobile ? 12 : "8px 10px", borderBottom: `1px solid ${COLORS.border}` }}>
				<TextInput value={draft.eventName ?? ""} onChange={v => update({ eventName: v })} placeholder="Nexus Night" mobile={mobile}
					ariaLabel="Event name" style={{ flex: "1 1 200px", fontWeight: 700, color: COLORS.accent }} />
				<TextInput type="date" value={draft.date} onChange={v => v && update({ date: v })} mobile={mobile} ariaLabel="Event date" style={{ width: mobile ? 160 : 150, colorScheme: "inherit" }} />
				<span style={{ fontSize: 12, whiteSpace: "nowrap" }}>
					<span style={{ color: COLORS.win }}>{record.WIN}</span>-<span style={{ color: COLORS.loss }}>{record.LOSS}</span>
					{record.DRAW > 0 && <>-<span style={{ color: COLORS.draw }}>{record.DRAW}</span></>}
				</span>
				<span style={{ ...LABEL, marginLeft: "auto", color: saveState === "error" ? COLORS.loss : COLORS.textDim }}>
					{saveState === "saving" ? "SAVING…" : saveState === "error" ? "NOT SAVED — RETRYING ON NEXT EDIT" : saveState === "saved" ? "SAVED" : ""}
				</span>
			</div>

			{draft.games.map((g, i) => (
				<GameRow key={g.id} game={g} round={i + 1} status={statuses[i]} legends={legends} legendById={legendById} mobile={mobile}
					onChange={fields => setGame(g.id, fields)}
					onRemove={draft.games.length > 1 ? () => update({ games: draft.games.filter(x => x.id !== g.id) }) : null}
					onGoToHistory={onGoToHistory} />
			))}

			<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: mobile ? 12 : "8px 10px", borderTop: `1px solid ${COLORS.border}` }}>
				<button onClick={() => update({ games: [...draft.games, newGame(draft.games.at(-1))] })} disabled={draft.games.length >= 20}
					style={{ ...secondaryButton, height: mobile ? 44 : 28 }}>+ ADD ROUND</button>
				{allSaved && <span style={{ fontSize: 11, color: COLORS.accent }}>Every game is saved to History — this draft can go.</span>}
				<button onClick={() => (confirmDelete ? onDelete(draft.draftId) : setConfirmDelete(true))} onBlur={() => setConfirmDelete(false)}
					style={{ ...secondaryButton, height: mobile ? 44 : 28, marginLeft: "auto", color: confirmDelete ? COLORS.loss : COLORS.textMuted, borderColor: confirmDelete ? COLORS.loss : COLORS.border }}>
					{confirmDelete ? "CONFIRM DELETE" : "DELETE DRAFT"}
				</button>
			</div>
		</div>
	);
}

// Where a drafted game stands against the real results.
function gameStatus(game, matches, savedById) {
	const point = matches.get(game.id);
	if (!game.opponent?.trim()) return { kind: "empty" };
	if (!point) return { kind: "waiting" };
	const real = point.result?.toUpperCase();
	const mismatch = game.result && real && game.result !== real ? real : null;
	const saved = savedById.get(String(point.match_id));
	const stored = saved && (!game.myChampion || saved.myChampion) && (!game.opponentChampion || saved.opponentChampion);
	return { kind: stored ? "saved" : "found", mismatch };
}

function StatusChip({ status, onGoToHistory }) {
	const chip = { fontSize: 9, letterSpacing: "0.12em", fontWeight: 700, whiteSpace: "nowrap", padding: "3px 6px", border: "1px solid", background: "transparent", fontFamily: FONT_MONO };
	if (status.kind === "empty") return <span style={{ ...chip, borderColor: "transparent", color: COLORS.textDim }}>ADD OPPONENT</span>;
	if (status.kind === "waiting") return <span title="No EloShowdown match with this opponent near the event date yet" style={{ ...chip, borderColor: COLORS.border, color: COLORS.textDim }}>WAITING</span>;
	if (status.kind === "saved") return <span style={{ ...chip, borderColor: COLORS.accentDim, color: COLORS.accent }}>SAVED ✓</span>;
	return (
		<button onClick={onGoToHistory} title="Matched to an EloShowdown result — review and save it in History"
			style={{ ...chip, cursor: "pointer", borderColor: COLORS.accent, color: COLORS.bg, background: COLORS.accent }}>FOUND → SAVE</button>
	);
}

function GameRow({ game, round, status, legends, legendById, mobile, onChange, onRemove, onGoToHistory }) {
	const [choosing, setChoosing] = useState(null); // "myChampion" | "opponentChampion"
	const scores = game.result ? scoreOptions(game.result) : [];
	const pickLegend = id => { onChange({ [choosing]: id }); setChoosing(null); };
	const setResult = r => onChange({ result: r === game.result ? null : r, score: scoreOptions(r).includes(game.score) && r !== game.result ? game.score : null });

	const resultToggle = (
		<div style={{ display: "flex" }}>
			{RESULTS.map(([r, short]) => {
				const on = game.result === r;
				return (
					<button key={r} onClick={() => setResult(r)} aria-pressed={on} aria-label={r} style={{
						width: mobile ? 44 : 30, height: mobile ? 44 : 30, marginLeft: -1, cursor: "pointer", fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
						background: on ? alpha(RESULT_COLOR[r], 18) : COLORS.bgRaised, border: `1px solid ${on ? RESULT_COLOR[r] : COLORS.border}`,
						color: on ? RESULT_COLOR[r] : COLORS.textMuted, position: "relative", zIndex: on ? 1 : 0,
					}}>{short}</button>
				);
			})}
		</div>
	);
	const score = (
		<span style={{ opacity: scores.length ? 1 : 0.4, pointerEvents: scores.length ? "auto" : "none" }}>
			<Dropdown variant="compact" ariaLabel="Final score" value={game.score ?? ""}
				options={[["", "SCORE"], ...scores.map(s => [s, s])]} onChange={v => onChange({ score: v || null })} />
		</span>
	);
	const remove = onRemove && (
		<button onClick={onRemove} aria-label={`Remove round ${round}`} style={{ width: mobile ? 44 : 28, height: mobile ? 44 : 28, background: "transparent", border: "none", color: COLORS.textDim, cursor: "pointer", fontFamily: FONT_MONO, fontSize: 13 }}>✕</button>
	);
	const legendField = (side, label) => (
		<LegendField legend={legendById.get(game[side])} label={label} mobile={mobile} active={choosing === side}
			onClick={() => setChoosing(c => (c === side ? null : side))} />
	);

	return (
		<div style={{ borderTop: round > 1 ? `1px solid ${COLORS.border}` : "none" }}>
			{mobile ? (
				<div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<span style={{ ...LABEL, width: 24 }}>R{round}</span>
						<TextInput value={game.opponent} onChange={v => onChange({ opponent: v })} placeholder="Opponent name" mobile ariaLabel={`Round ${round} opponent`} style={{ flex: 1 }} />
						{remove}
					</div>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
						{legendField("myChampion", "YOU")}
						{legendField("opponentChampion", "THEM")}
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
						{resultToggle}
						{score}
						<span style={{ marginLeft: "auto" }}><StatusChip status={status} onGoToHistory={onGoToHistory} /></span>
					</div>
				</div>
			) : (
				<div style={{
					display: "grid", alignItems: "center", gap: 8, padding: "6px 10px",
					gridTemplateColumns: "24px minmax(120px, 1fr) minmax(130px, 1fr) minmax(130px, 1fr) auto 84px 96px 28px",
				}}>
					<span style={LABEL}>R{round}</span>
					<TextInput value={game.opponent} onChange={v => onChange({ opponent: v })} placeholder="Opponent name" ariaLabel={`Round ${round} opponent`} />
					{legendField("myChampion", "YOU")}
					{legendField("opponentChampion", "THEM")}
					{resultToggle}
					{score}
					<StatusChip status={status} onGoToHistory={onGoToHistory} />
					{remove ?? <span />}
				</div>
			)}
			{status.mismatch && (
				<div style={{ padding: mobile ? "0 12px 10px" : "0 10px 6px 42px", fontSize: 10, color: COLORS.textMuted }}>
					EloShowdown has this as a <span style={{ color: RESULT_COLOR[status.mismatch], fontWeight: 700 }}>{status.mismatch}</span> — History uses their result.
				</div>
			)}
			{choosing && !mobile && (
				<div style={{ margin: "0 10px 8px 42px", border: `1px solid ${COLORS.borderHover}`, background: COLORS.bgRaised }}>
					<LegendList legends={legends} current={game[choosing]} onPick={pickLegend} maxHeight={260} />
				</div>
			)}
			{choosing && mobile && (
				<BottomSheet height="80%" title={choosing === "myChampion" ? "YOUR LEGEND" : "OPPONENT LEGEND"}
					subtitle={`R${round}${game.opponent ? ` · vs ${game.opponent}` : ""}`} onClose={() => setChoosing(null)}>
					<LegendList legends={legends} current={game[choosing]} onPick={pickLegend} mobile />
				</BottomSheet>
			)}
		</div>
	);
}

function LegendField({ legend, label, mobile, active, onClick }) {
	return (
		<button onClick={onClick} aria-expanded={active} style={{
			height: mobile ? 48 : 30, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 8px",
			background: COLORS.bgRaised, border: `1px solid ${active ? COLORS.accentDim : COLORS.border}`, cursor: "pointer",
			fontFamily: FONT_MONO, textAlign: "left", color: COLORS.text,
		}}>
			{legend ? <LegendIcon legend={legend} size={mobile ? 30 : 20} /> : <span style={{ ...LABEL, fontSize: 9 }}>{label}</span>}
			<span style={{ flex: 1, minWidth: 0, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: legend ? COLORS.textStrong : COLORS.textDim }}>
				{legend ? legend.tags_text : "pick legend"}
			</span>
		</button>
	);
}

// Searchable legend list: inline under the row on desktop, in a sheet on phones.
function LegendList({ legends, current, onPick, mobile, maxHeight }) {
	const [query, setQuery] = useState("");
	const term = query.trim().toLowerCase();
	const list = legends.filter(l => l.tags_text.toLowerCase().includes(term) || l.name.toLowerCase().includes(term));
	const row = { width: "100%", height: mobile ? 52 : 34, display: "flex", alignItems: "center", gap: 10, padding: mobile ? "0 16px" : "0 10px", background: "transparent", border: "none", borderBottom: `1px solid ${COLORS.border}`, fontFamily: FONT_MONO, cursor: "pointer", textAlign: "left" };
	return (
		<>
			<div style={{ position: "sticky", top: 0, zIndex: 1, background: mobile ? COLORS.bgCard : COLORS.bgRaised, padding: mobile ? "8px 16px" : 6, borderBottom: `1px solid ${COLORS.border}` }}>
				<input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search legends"
					onKeyDown={e => { if (e.key === "Enter" && list.length) onPick(list[0].id); }}
					style={{ width: "100%", height: mobile ? 48 : 30, padding: "0 10px", background: COLORS.bg, border: `1px solid ${COLORS.accent}`, outline: "none", color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: mobile ? 16 : 12, caretColor: COLORS.accent }} />
			</div>
			<div style={{ maxHeight, overflowY: maxHeight ? "auto" : "visible" }}>
				{current && (
					<button onClick={() => onPick(null)} style={{ ...row, color: COLORS.loss, fontSize: 11, letterSpacing: "0.08em" }}>✕ CLEAR PICK</button>
				)}
				{list.map(l => (
					<button key={l.id} onClick={() => onPick(l.id)} style={{ ...row, background: l.id === current ? COLORS.bgHover : "transparent" }}
						onMouseEnter={e => { if (l.id !== current) e.currentTarget.style.background = COLORS.bgHover; }}
						onMouseLeave={e => { if (l.id !== current) e.currentTarget.style.background = "transparent"; }}>
						<LegendIcon legend={l} size={mobile ? 32 : 22} />
						<span style={{ flex: 1, minWidth: 0, fontSize: mobile ? 13 : 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
							<span style={{ color: l.id === current ? COLORS.accent : COLORS.textStrong, fontWeight: 700 }}>{l.tags_text}</span>
							<span style={{ color: COLORS.textMuted }}> - {titleCase(l.name)}</span>
						</span>
						{l.id === current && <span style={{ color: COLORS.accent, fontWeight: 700 }}>✓</span>}
					</button>
				))}
				{list.length === 0 && <div style={{ padding: 16, textAlign: "center", ...LABEL }}>NO LEGEND MATCHES</div>}
			</div>
			{mobile && <div style={{ height: "calc(16px + env(safe-area-inset-bottom))" }} />}
		</>
	);
}

// 16px type on phones so iOS doesn't zoom in on focus.
function TextInput({ value, onChange, placeholder, mobile, ariaLabel, type = "text", style }) {
	return (
		<input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={ariaLabel}
			onFocus={e => { e.target.style.borderColor = COLORS.accent; }}
			onBlur={e => { e.target.style.borderColor = COLORS.border; }}
			style={{
				height: mobile ? 44 : 30, minWidth: 0, padding: "0 10px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`,
				outline: "none", color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: mobile ? 16 : 12, caretColor: COLORS.accent, ...style,
			}} />
	);
}

const primaryButton = {
	padding: "0 14px", background: COLORS.accent, border: `1px solid ${COLORS.accent}`, color: COLORS.bg,
	fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer", whiteSpace: "nowrap",
};
const secondaryButton = {
	padding: "0 12px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted,
	fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
};
