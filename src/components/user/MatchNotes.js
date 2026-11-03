"use client";
import { useState } from "react";
import { COLORS, FONT_MONO, alpha } from "../../lib/data";
import { titleCase } from "../../lib/cards/data";
import { playedLabel, seasonLabel } from "../../lib/matchStats";
import LegendIcon from "../cards/LegendIcon";
import Dropdown from "../Dropdown";

// ── Match notes ──────────────────────────────────────────────────────────────
// A free-text note per match — what happened, what went wrong — written from
// a History row, and the NOTES tab that reads them back, narrowed to one
// matchup by your legend and the opponent's.
//
// Notes ride along in the per-match picks ({ mine, opponent, score, notes }).
// Signed in, UserProfile saves each one on its own shortly after typing stops
// (see setNote); a guest's stay in the tab's draft until they log in and save.

// Matches MAX_NOTES in lambda/saveMatchHistory.mjs.
export const MAX_NOTE = 2000;

const LABEL = { fontSize: 10, letterSpacing: "0.14em", color: COLORS.textDim };
const RESULT_COLOR = { win: COLORS.win, loss: COLORS.loss, draw: COLORS.draw };
// Filter values besides a legend id.
const ANY = "any";
const NONE = "none";

// A page with lines — the note button on a match row. Filled while it has a note.
export function NoteIcon({ size = 14, filled }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
			<rect x="2.5" y="1.5" width="11" height="13" fill={filled ? "currentColor" : "none"} fillOpacity={filled ? 0.18 : 0} />
			<path d="M5 5.5h6M5 8h6M5 10.5h4" />
		</svg>
	);
}

// The note box: a textarea with the character count and, signed in, whether
// the note has saved. `state` is "saving" | "saved" | "error" | undefined.
export function NoteEditor({ value, onChange, onBlur, state, isGuest, disabled, mobile, autoFocus }) {
	const status = disabled
		? ["Notes can't be edited until your saved matches load.", COLORS.loss]
		: isGuest
			? ["Kept in this tab until you log in and save.", COLORS.textDim]
			: state === "saving"
				? ["SAVING…", COLORS.textDim]
				: state === "saved"
					? ["SAVED", COLORS.win]
					: state === "error"
						? ["Couldn't save — keep typing or click away to try again.", COLORS.loss]
						: ["Saves as you type.", COLORS.textDim];
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: FONT_MONO }}>
			<textarea
				aria-label="Match notes"
				value={value ?? ""}
				maxLength={MAX_NOTE}
				disabled={disabled}
				autoFocus={autoFocus}
				placeholder="What happened? What went wrong — mulligan, misplays, their key turns…"
				onChange={e => onChange(e.target.value)}
				onFocus={e => { e.target.style.borderColor = COLORS.accentDim; }}
				onBlur={e => { e.target.style.borderColor = COLORS.borderHover; onBlur?.(); }}
				style={{
					width: "100%", minHeight: mobile ? 180 : 72, boxSizing: "border-box", resize: "vertical",
					padding: mobile ? 12 : "6px 8px", background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, borderRadius: 0,
					color: COLORS.textStrong, caretColor: COLORS.accent, outline: "none",
					fontFamily: FONT_MONO, fontSize: mobile ? 16 : 12, lineHeight: 1.6,
				}}
			/>
			<div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, letterSpacing: "0.06em" }}>
				<span style={{ color: status[1], flex: 1, minWidth: 0 }}>{status[0]}</span>
				<span style={{ color: COLORS.textDim, flexShrink: 0 }}>{(value ?? "").length} / {MAX_NOTE}</span>
			</div>
		</div>
	);
}

// ── Notes tab ────────────────────────────────────────────────────────────────
// `entries` are the matches with a note, newest first:
//   [{ key, account, match, mine, opponent, score, notes }]
// where match is a History row (lib/history.js) and account the linked
// account's name (shown when there's more than one).

export default function MatchNotes({ entries, legends, status, seasonName, showAccount, mobile, onGoToHistory }) {
	const [mine, setMine] = useState(ANY);
	const [opponent, setOpponent] = useState(ANY);
	const legendById = new Map(legends.map(l => [l.id, l]));
	const fits = (value, id) => value === ANY || (value === NONE ? !id : id === value);
	const shown = entries.filter(e => fits(mine, e.mine) && fits(opponent, e.opponent));
	// Each side offers the legends among the notes the other side's filter
	// leaves, so every choice has at least one note.
	const options = (side, other, otherValue, label) => {
		const counts = new Map();
		for (const e of entries) {
			if (fits(otherValue, e[other])) counts.set(e[side] ?? NONE, (counts.get(e[side] ?? NONE) ?? 0) + 1);
		}
		const picked = [...counts].filter(([id]) => id !== NONE && legendById.has(id))
			.sort(([a], [b]) => legendById.get(a).tags_text.localeCompare(legendById.get(b).tags_text))
			.map(([id, n]) => [id, `${legendById.get(id).tags_text} (${n})`]);
		return [[ANY, label], ...picked, ...(counts.has(NONE) ? [[NONE, `Not picked (${counts.get(NONE)})`]] : [])];
	};
	const mineOptions = options("mine", "opponent", opponent, "Any legend");
	const opponentOptions = options("opponent", "mine", mine, "Any legend");
	const tally = result => shown.filter(e => e.match.result === result).length;
	const filtered = mine !== ANY || opponent !== ANY;

	if (status === "loading") return <Hint>LOADING NOTES…</Hint>;
	if (status === "error") return <Hint color={COLORS.loss}>Couldn&rsquo;t load your saved matches, so their notes can&rsquo;t be shown. Reload the page to try again.</Hint>;
	if (entries.length === 0) {
		return (
			<div style={{
				background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: mobile ? "36px 20px" : "24px 16px",
				display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", fontFamily: FONT_MONO,
			}}>
				<div style={LABEL}>NO NOTES YET</div>
				<div style={{ fontSize: mobile ? 13 : 12, lineHeight: 1.6, color: COLORS.text, maxWidth: 420 }}>
					No match in {seasonName} has a note. Open a match&rsquo;s note in History and write down what happened &mdash; they&rsquo;ll collect here by matchup.
				</div>
				<button onClick={onGoToHistory} style={{
					height: mobile ? 48 : 28, padding: "0 16px", background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, borderRadius: 0,
					color: COLORS.accent, cursor: "pointer", fontFamily: FONT_MONO, fontSize: mobile ? 11 : 10, letterSpacing: "0.12em", fontWeight: 700,
				}}>GO TO HISTORY</button>
			</div>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: mobile ? 12 : 8, fontFamily: FONT_MONO }}>
			<div style={mobile
				? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }
				: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
				<Dropdown variant={mobile ? "field" : "compact"} label="YOU" ariaLabel="Your legend" value={mine} options={mineOptions} onChange={setMine} />
				<Dropdown variant={mobile ? "field" : "compact"} label="VS" ariaLabel="Opponent legend" value={opponent} options={opponentOptions} onChange={setOpponent} />
				{!mobile && filtered && <ClearButton onClick={() => { setMine(ANY); setOpponent(ANY); }} />}
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: COLORS.textMuted }}>
				<span>{shown.length} {shown.length === 1 ? "note" : "notes"}</span>
				<span style={{ color: COLORS.textDim }}>·</span>
				<span><span style={{ color: COLORS.win }}>{tally("win")}W</span> <span style={{ color: COLORS.loss }}>{tally("loss")}L</span>{tally("draw") > 0 && <> <span style={{ color: COLORS.draw }}>{tally("draw")}D</span></>}</span>
				{mobile && filtered && <span style={{ marginLeft: "auto" }}><ClearButton mobile onClick={() => { setMine(ANY); setOpponent(ANY); }} /></span>}
			</div>
			{shown.map(e => <NoteCard key={e.key} entry={e} legendById={legendById} showAccount={showAccount} mobile={mobile} />)}
		</div>
	);
}

function NoteCard({ entry, legendById, showAccount, mobile }) {
	const { match: m } = entry;
	const color = RESULT_COLOR[m.result] ?? COLORS.textDim;
	const when = playedLabel(m.date ?? m.month, { day: "numeric", month: "short", year: "numeric" }) || seasonLabel(m.season);
	const where = [m.event?.name, when, showAccount && entry.account].filter(Boolean).join(" · ");
	return (
		<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}>
			<div style={{ display: "flex", alignItems: "center", gap: 10, padding: mobile ? "10px 10px 8px" : "6px 10px", borderBottom: `1px solid ${COLORS.border}`, flexWrap: mobile ? "wrap" : "nowrap" }}>
				<span style={{
					minWidth: 44, height: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
					background: alpha(color, 14), color, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
				}}>{m.result.toUpperCase()}</span>
				<span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: mobile ? "1 1 100%" : "0 1 auto", order: mobile ? 3 : 0 }}>
					<Side legend={legendById.get(entry.mine)} />
					<span style={{ fontSize: 10, color: COLORS.textDim, flexShrink: 0 }}>{entry.score ?? "vs"}</span>
					<Side legend={legendById.get(entry.opponent)} name={m.opponent_name} />
				</span>
				<span style={{ marginLeft: "auto", fontSize: 10, color: COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
					{where}
				</span>
			</div>
			<div style={{ padding: mobile ? 12 : "8px 10px", fontSize: mobile ? 13 : 12, lineHeight: 1.6, color: COLORS.text, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
				{entry.notes}
			</div>
		</div>
	);
}

// One side of the matchup: the legend's icon and name (or "—" when it wasn't
// picked), and the opponent's name under theirs.
function Side({ legend, name }) {
	return (
		<span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
			{legend
				? <LegendIcon legend={legend} size={22} />
				: <span style={{ width: 22, height: 22, flexShrink: 0, border: `1px dashed ${COLORS.borderHover}` }} />}
			<span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
				<span title={legend ? `${legend.tags_text} - ${titleCase(legend.name)}` : undefined}
					style={{ fontSize: 12, color: legend ? COLORS.textStrong : COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
					{legend ? legend.tags_text : "—"}
				</span>
				{name && <span style={{ fontSize: 10, color: COLORS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>}
			</span>
		</span>
	);
}

function ClearButton({ onClick, mobile }) {
	return (
		<button onClick={onClick}
			onMouseEnter={e => { e.currentTarget.style.color = COLORS.accent; }}
			onMouseLeave={e => { e.currentTarget.style.color = COLORS.textMuted; }}
			style={{
				height: mobile ? 44 : "auto", padding: mobile ? "0 4px" : 0, margin: mobile ? "-12px 0" : 0, background: "transparent", border: "none",
				color: COLORS.textMuted, cursor: "pointer", fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em",
			}}>
			CLEAR FILTERS
		</button>
	);
}

function Hint({ children, color }) {
	return <div style={{ fontSize: 11, color: color ?? COLORS.textDim, fontFamily: FONT_MONO, padding: "4px 0", lineHeight: 1.6 }}>{children}</div>;
}
