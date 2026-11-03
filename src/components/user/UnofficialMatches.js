"use client";
import { useState } from "react";
import { COLORS, FONT_MONO } from "../../lib/data";
import { TYPES, withResult } from "../../lib/unofficial";
import Dropdown from "../Dropdown";
import { LegendPick, ResultPick, ScorePick, NoteToggle } from "./MatchPicks";
import { NoteEditor } from "./MatchNotes";
import { TextInput } from "./NexusNight";

// ── Match History (Unofficial) ───────────────────────────────────────────────
// Games logged by hand that BoundRift never sees — online games, friendlies,
// testing (lib/unofficial.js). Each is a header (kind, opponent, date, delete)
// over a row laid out like an official History row: your legend | result and
// score | their legend | note. Every edit saves on its own (UserProfile), so
// there's no Save button. Desktop only — phones get MobileProfile's layout.
//
//   matches    the active account's unofficial matches, newest first
//   saveState  { [matchId]: "saving" | "saved" | "error" }
//   onChange   (match) → stores the edited match
//   onFlush    (matchId) → saves a pending edit now (a note box losing focus)

export const UNOFFICIAL_INTRO = "Unofficial games - online, friendlies, testing. They stay out of your stats unless you include them on the Data tab.";

export default function UnofficialMatches({ matches, legends, status, isGuest, saveState, onCreate, onChange, onDelete, onFlush }) {
	// Matches whose note box is open.
	const [openNotes, setOpenNotes] = useState(() => new Set());
	const toggleNote = id => setOpenNotes(prev => {
		const next = new Set(prev);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		return next;
	});

	return (
		<div style={{ fontFamily: FONT_MONO }}>
			<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
				<div style={{ flex: 1, minWidth: 0, fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5 }}>
					{UNOFFICIAL_INTRO}
					{isGuest && <span style={{ color: COLORS.textDim }}> As a guest they&rsquo;re kept in this browser only.</span>}
				</div>
				<button onClick={onCreate} disabled={status !== "ready"}
					onMouseEnter={e => { if (status === "ready") e.currentTarget.style.boxShadow = "0 0 18px color-mix(in srgb, var(--accent) 33%, transparent)"; }}
					onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
					style={{
						flexShrink: 0, padding: "5px 14px", borderRadius: 0, whiteSpace: "nowrap",
						background: status === "ready" ? COLORS.accent : COLORS.border, border: `1px solid ${status === "ready" ? COLORS.accent : COLORS.border}`,
						color: status === "ready" ? COLORS.bg : COLORS.textDim, cursor: status === "ready" ? "pointer" : "not-allowed",
						fontFamily: FONT_MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", transition: "all 0.2s",
					}}>
					+ LOG A MATCH
				</button>
			</div>

			{status === "loading" && <Hint>LOADING UNOFFICIAL MATCHES…</Hint>}
			{status === "error" && <Hint color={COLORS.loss}>Couldn&rsquo;t load your unofficial matches. Reload the page to try again.</Hint>}
			{status === "ready" && matches.length === 0 && (
				<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: "24px 16px", textAlign: "center", fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
					No unofficial matches yet. Log an online game or a friendly with <span style={{ color: COLORS.accent }}>+ LOG A MATCH</span>.
				</div>
			)}

			{matches.map(m => {
				const noteOpen = openNotes.has(m.matchId);
				const update = fields => onChange({ ...m, ...fields });
				return (
					<div key={m.matchId} style={{ marginBottom: 12 }}>
						{/* Header: kind, opponent, date, save state, delete */}
						<div style={{
							display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 4px 10px",
							background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, fontSize: 11,
						}}>
							<Dropdown variant="text" ariaLabel="Kind of match" value={m.type} options={TYPES} onChange={type => update({ type })} />
							<span style={{ color: COLORS.textDim }}>vs</span>
							<TextInput value={m.opponent} onChange={opponent => update({ opponent })} placeholder="Opponent name" ariaLabel="Opponent name"
								style={{ flex: 1, height: 26 }} />
							<TextInput type="date" value={m.date} onChange={date => date && update({ date })} ariaLabel="Date played"
								style={{ width: 140, height: 26, colorScheme: "inherit" }} />
							<SaveState state={saveState[m.matchId]} isGuest={isGuest} />
							<button onClick={() => onDelete(m.matchId)} aria-label="Delete this match" title="Delete this match"
								onMouseEnter={e => { e.currentTarget.style.color = COLORS.loss; e.currentTarget.style.borderColor = COLORS.loss; }}
								onMouseLeave={e => { e.currentTarget.style.color = COLORS.textDim; e.currentTarget.style.borderColor = COLORS.border; }}
								style={{
									width: 26, height: 26, flexShrink: 0, padding: 0, background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 0,
									color: COLORS.textDim, cursor: "pointer", fontFamily: FONT_MONO, fontSize: 11, transition: "all 0.15s",
								}}>✕</button>
						</div>
						{/* You | result + score | opponent | note — as an official row */}
						<div style={{
							display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr) auto",
							alignItems: "center", columnGap: 16,
							height: 50, padding: "0 4px", background: COLORS.bg,
							border: `1px solid ${COLORS.border}`, borderTop: "none",
						}}>
							<LegendPick side="left" player="You" champions={legends} value={m.myChampion}
								onSelect={myChampion => update({ myChampion })} />
							<div style={{ display: "grid", gridTemplateColumns: "48px 60px 48px", alignItems: "center", columnGap: 10 }}>
								<span style={{ display: "flex", justifyContent: "flex-end" }}>
									<ResultPick value={m.result} onSelect={result => onChange(withResult(m, result))} />
								</span>
								<span style={{ display: "flex", justifyContent: "center" }}>
									{m.result
										? <ScorePick result={m.result} value={m.score} onSelect={score => update({ score })} />
										: <span style={{ fontSize: 11, color: COLORS.textDim }}>—</span>}
								</span>
								{/* No Elo — unofficial games aren't rated */}
								<span />
							</div>
							<LegendPick side="right" player={m.opponent || "Opponent"} champions={legends} value={m.opponentChampion}
								onSelect={opponentChampion => update({ opponentChampion })} />
							<NoteToggle open={noteOpen} note={m.notes} onClick={() => toggleNote(m.matchId)} />
						</div>
						{noteOpen && (
							<div style={{ padding: 8, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderTop: "none" }}>
								<NoteEditor value={m.notes} onChange={notes => update({ notes })} onBlur={() => onFlush(m.matchId)}
									state={saveState[m.matchId]} isGuest={isGuest} autoFocus />
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

// Saving… / Saved / Not saved beside a match's delete button (signed in).
export function SaveState({ state, isGuest }) {
	if (isGuest || !state) return null;
	const [text, color] = state === "saving" ? ["SAVING…", COLORS.textDim] : state === "saved" ? ["SAVED", COLORS.win] : ["NOT SAVED", COLORS.loss];
	return <span style={{ fontSize: 9, letterSpacing: "0.12em", color, flexShrink: 0, minWidth: 56, textAlign: "right" }}>{text}</span>;
}

function Hint({ children, color }) {
	return <div style={{ fontSize: 11, color: color ?? COLORS.textDim, fontFamily: FONT_MONO, padding: "4px 0", letterSpacing: "0.06em" }}>{children}</div>;
}
