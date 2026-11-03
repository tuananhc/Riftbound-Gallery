"use client";
import { useState } from "react";
import { COLORS, FONT_MONO, alpha } from "../../lib/data";
import { legendLabel, titleCase } from "../../lib/cards/data";
import { SIDES, MAX_COPIES, matchupKey, newNote, sideOf, sideIsEmpty, addCard, setCount, total } from "../../lib/sideboardNotes";
import BottomSheet from "../BottomSheet";
import LegendIcon from "../cards/LegendIcon";
import RuneIcons from "../cards/RuneIcons";
import { Segmented } from "./MatchStats";

// ── Sideboard Notes tab ──────────────────────────────────────────────────────
// A binder of matchup plans. Pick your legend, then any opponent legend: its
// note opens beside the list (on a phone, in place of it), with the cards to
// bring in and take out and how to play it — separately on the play and on
// the draw, since the right swaps often differ. One note per matchup.
//
//   notes       every stored note (lib/sideboardNotes.js for the shape)
//   records     Map "myLegend|oppLegend" → record() of your games in it
//   myLegends   legend ids you play, most relevant first (the chips)
//   cards       the IN / OUT picker's cards, or null while loading
//   saveState   { "myLegend|oppLegend": "saving" | "saved" | "error" }

const LABEL = { fontSize: 10, letterSpacing: "0.14em", color: COLORS.textDim };
const MAX_RESULTS = 40;

export default function SideboardNotes({ notes, legends, records, myLegends, cards, cardsStatus, saveState, status, isGuest, mobile, onChange, onDelete, onFlush }) {
	const legendById = new Map(legends.map(l => [l.id, l]));
	const noteByKey = new Map(notes.map(n => [matchupKey(n.myLegend, n.oppLegend), n]));
	const [chosenYou, setYou] = useState(null);
	const [chosenOpp, setOpp] = useState(null);
	const [showing, setShowing] = useState(false); // phone: the note in place of the list
	const [query, setQuery] = useState("");
	const [pickingLegend, setPickingLegend] = useState(false);

	// Your legend: the one chosen, else the one you play most recently, else the
	// first. The chips are the legends you play plus whichever is selected.
	const you = chosenYou ?? myLegends.find(id => legendById.has(id)) ?? legends[0]?.id;
	const chips = [...new Set([...myLegends, you].filter(id => id && legendById.has(id)))];
	if (!you) return <Note>Legends haven&rsquo;t loaded — reload the page to try again.</Note>;

	// Opponents: noted matchups first, then the ones you've played most, then A–Z.
	const games = id => records.get(matchupKey(you, id))?.games ?? 0;
	const term = query.trim().toLowerCase();
	const opponents = legends
		.filter(l => !term || l.tags_text.toLowerCase().includes(term) || l.name.toLowerCase().includes(term))
		.sort((a, b) => Number(noteByKey.has(matchupKey(you, b.id))) - Number(noteByKey.has(matchupKey(you, a.id)))
			|| games(b.id) - games(a.id) || a.tags_text.localeCompare(b.tags_text));
	const opp = chosenOpp && legendById.has(chosenOpp) ? chosenOpp : opponents[0]?.id ?? null;
	const notedCount = notes.filter(n => n.myLegend === you).length;

	const openOpponent = id => { setOpp(id); setShowing(true); };

	const chipRow = (
		<div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }} role="group" aria-label="Your legend">
			{chips.map(id => {
				const on = id === you;
				return (
					<button key={id} onClick={() => { setYou(id); setShowing(false); }} aria-pressed={on} style={{
						height: mobile ? 44 : 36, display: "flex", alignItems: "center", gap: 8, padding: "0 12px 0 4px", flexShrink: 0, cursor: "pointer",
						background: on ? alpha(COLORS.accent, 12) : COLORS.bgRaised, border: `1px solid ${on ? COLORS.accent : COLORS.border}`,
						color: on ? COLORS.accent : COLORS.text, fontFamily: FONT_MONO, fontSize: 12, fontWeight: on ? 700 : 400, whiteSpace: "nowrap",
					}}>
						<LegendIcon legend={legendById.get(id)} size={mobile ? 34 : 28} />
						{legendById.get(id)?.tags_text}
					</button>
				);
			})}
			<button onClick={() => setPickingLegend(true)} style={{ ...secondaryButton, height: mobile ? 44 : 36, flexShrink: 0 }}>+ OTHER LEGEND</button>
		</div>
	);

	const list = (
		<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", minWidth: 0 }}>
			<div style={{ padding: 8, borderBottom: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
				<SearchInput value={query} onChange={setQuery} placeholder="Find an opponent legend…" mobile={mobile} ariaLabel="Find an opponent legend" />
				<span style={{ ...LABEL, fontSize: 9 }}>{notedCount} {notedCount === 1 ? "MATCHUP" : "MATCHUPS"} NOTED</span>
			</div>
			<div style={{ maxHeight: mobile ? "none" : 560, overflowY: mobile ? "visible" : "auto" }}>
				{opponents.map(l => {
					const has = noteByKey.has(matchupKey(you, l.id));
					const current = !mobile && l.id === opp;
					return (
						<button key={l.id} onClick={() => openOpponent(l.id)} aria-current={current || undefined}
							onMouseEnter={e => { if (!current) e.currentTarget.style.background = COLORS.bgHover; }}
							onMouseLeave={e => { if (!current) e.currentTarget.style.background = "transparent"; }}
							style={{
								width: "100%", minHeight: mobile ? 52 : 40, display: "grid", gridTemplateColumns: "10px auto minmax(0, 1fr) auto", gap: 8, alignItems: "center",
								padding: "4px 10px", background: current ? COLORS.bgHover : "transparent", border: "none", borderBottom: `1px solid ${COLORS.border}`,
								boxShadow: current ? `inset 2px 0 0 ${COLORS.accent}` : "none", cursor: "pointer", textAlign: "left", fontFamily: FONT_MONO,
							}}>
							<span title={has ? "Has a note" : "No note yet"} style={{
								width: 8, height: 8, borderRadius: "50%", border: `1px solid ${has ? COLORS.accent : COLORS.textDim}`, background: has ? COLORS.accent : "transparent",
							}} />
							<LegendIcon legend={l} size={mobile ? 32 : 24} />
							<span style={{ fontSize: 12, color: has ? COLORS.textStrong : COLORS.text, fontWeight: has ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.tags_text}</span>
							<Record record={records.get(matchupKey(you, l.id))} />
						</button>
					);
				})}
				{opponents.length === 0 && <Note>No legend matches &ldquo;{query}&rdquo;.</Note>}
			</div>
		</div>
	);

	const detail = opp && (
		<NoteDetail key={matchupKey(you, opp)} you={legendById.get(you)} opp={legendById.get(opp)}
			note={noteByKey.get(matchupKey(you, opp)) ?? null} record={records.get(matchupKey(you, opp))}
			cards={cards} cardsStatus={cardsStatus} saveState={saveState[matchupKey(you, opp)]} isGuest={isGuest} mobile={mobile}
			onChange={onChange} onDelete={() => onDelete(you, opp)} onFlush={() => onFlush(matchupKey(you, opp))}
			onBack={mobile ? () => setShowing(false) : null} />
	);

	return (
		<div style={{ fontFamily: FONT_MONO, display: "flex", flexDirection: "column", gap: 10 }}>
			<div style={{ fontSize: 11, lineHeight: 1.6, color: COLORS.textMuted }}>
				Your plan for each matchup: what to bring in, what to take out and how to play it, on the play and on the draw.
				{isGuest && <span style={{ color: COLORS.textDim }}> As a guest, notes stay in this browser only.</span>}
			</div>
			{status === "loading" && <Note>LOADING SIDEBOARD NOTES…</Note>}
			{status === "error" && <Note color={COLORS.loss}>Couldn&rsquo;t load your sideboard notes. Reload the page to try again — editing is off so a stored note isn&rsquo;t overwritten.</Note>}
			{status === "ready" && (<>
				{chipRow}
				{mobile
					? (showing ? detail : list)
					: (
						<div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", gap: 8, alignItems: "start" }}>
							{list}
							{detail}
						</div>
					)}
			</>)}
			{pickingLegend && (
				<LegendPickerSheet legends={legends} onPick={id => { setYou(id); setShowing(false); setPickingLegend(false); }} onClose={() => setPickingLegend(false)} />
			)}
		</div>
	);
}

// ── One matchup's note ───────────────────────────────────────────────────────

function NoteDetail({ you, opp, note, record, cards, cardsStatus, saveState, isGuest, mobile, onChange, onDelete, onFlush, onBack }) {
	const [side, setSide] = useState("play");
	const [confirmDelete, setConfirmDelete] = useState(false);
	const current = note ?? newNote(you.id, opp.id);
	const update = (which, fields) => onChange({ ...current, [which]: { ...sideOf(current, which), ...fields } });
	const copyFrom = (from, to) => onChange({ ...current, [to]: { ...sideOf(current, from) } });

	const saveText = isGuest ? "" : saveState === "saving" ? "SAVING…" : saveState === "error" ? "NOT SAVED — EDIT AGAIN TO RETRY" : saveState === "saved" ? "SAVED" : "";
	const sidePanel = which => {
		const other = which === "play" ? "draw" : "play";
		const s = sideOf(current, which);
		return (
			<SidePanel key={which} side={s} label={SIDES.find(([k]) => k === which)[1]} showLabel={!mobile}
				cards={cards} cardsStatus={cardsStatus} mobile={mobile}
				canCopy={sideIsEmpty(s) && !sideIsEmpty(sideOf(current, other))}
				copyLabel={`COPY FROM ${SIDES.find(([k]) => k === other)[1]}`}
				onCopy={() => copyFrom(other, which)}
				onChange={fields => update(which, fields)} onBlur={onFlush} />
		);
	};

	return (
		<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: mobile ? 12 : 14, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
			{onBack && <button onClick={onBack} style={{ ...secondaryButton, height: 44, alignSelf: "flex-start" }}>← ALL OPPONENTS</button>}
			<div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
				<LegendIcon legend={you} size={mobile ? 36 : 32} />
				<span style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.12em" }}>VS</span>
				<LegendIcon legend={opp} size={mobile ? 36 : 32} />
				<div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: "1 1 180px" }}>
					<span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
						{you.tags_text} vs {opp.tags_text}
					</span>
					<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.textMuted, minWidth: 0 }}>
						<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{legendLabel(opp)}</span>
						<RuneIcons domains={opp.domains} size={12} />
					</span>
				</div>
				<span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
					<Record record={record} long />
					<span style={{ ...LABEL, fontSize: 9, color: saveState === "error" ? COLORS.loss : COLORS.textDim }}>{saveText}</span>
				</span>
			</div>

			{mobile && <Segmented value={side} onChange={setSide} options={SIDES} />}
			{mobile
				? sidePanel(side)
				: <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>{SIDES.map(([which]) => sidePanel(which))}</div>}

			{note && (
				<button onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))} onBlur={() => setConfirmDelete(false)}
					style={{ ...secondaryButton, height: mobile ? 44 : 28, alignSelf: "flex-end", color: confirmDelete ? COLORS.loss : COLORS.textMuted, borderColor: confirmDelete ? COLORS.loss : COLORS.border }}>
					{confirmDelete ? "CONFIRM DELETE" : "DELETE NOTE"}
				</button>
			)}
		</div>
	);
}

function SidePanel({ side, label, showLabel, cards, cardsStatus, mobile, canCopy, copyLabel, onCopy, onChange, onBlur }) {
	const ins = total(side.in);
	const outs = total(side.out);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, ...(showLabel ? { borderLeft: `2px solid ${COLORS.border}`, paddingLeft: 12 } : {}) }}>
			{(showLabel || canCopy) && (
				<div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 24 }}>
					{showLabel && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: COLORS.textStrong }}>{label}</span>}
					{canCopy && <button onClick={onCopy} style={{ ...linkButton, marginLeft: "auto" }}>{copyLabel}</button>}
				</div>
			)}
			<CardList title="IN" sign="+" color={COLORS.win} list={side.in} cards={cards} cardsStatus={cardsStatus} mobile={mobile}
				onChange={list => onChange({ in: list })} />
			<CardList title="OUT" sign="−" color={COLORS.loss} list={side.out} cards={cards} cardsStatus={cardsStatus} mobile={mobile}
				onChange={list => onChange({ out: list })} />
			{/* A sideboard swap trades card for card, so uneven totals are worth a look. */}
			{(ins > 0 || outs > 0) && ins !== outs && (
				<div style={{ fontSize: 10, color: COLORS.textMuted }}>
					Bringing in <span style={{ color: COLORS.win }}>{ins}</span>, taking out <span style={{ color: COLORS.loss }}>{outs}</span> — your deck size changes by {ins - outs > 0 ? "+" : ""}{ins - outs}.
				</div>
			)}
			<label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				<span style={LABEL}>PLAN</span>
				<textarea value={side.plan} onChange={e => onChange({ plan: e.target.value })} maxLength={2000}
					placeholder="How to play it: what to mulligan for, their key turns, what to hold up…"
					onFocus={e => { e.target.style.borderColor = COLORS.accent; }}
					onBlur={e => { e.target.style.borderColor = COLORS.border; onBlur(); }}
					style={{
						minHeight: mobile ? 120 : 96, resize: "vertical", padding: "8px 10px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`,
						outline: "none", color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: mobile ? 16 : 12, lineHeight: 1.6, caretColor: COLORS.accent,
					}} />
			</label>
		</div>
	);
}

// IN or OUT: the cards with a − n + stepper each, and a picker to add more.
function CardList({ title, sign, color, list, cards, cardsStatus, mobile, onChange }) {
	const [adding, setAdding] = useState(false);
	const n = total(list);
	const stepper = { width: mobile ? 40 : 24, height: mobile ? 40 : 24, background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: "pointer", fontFamily: FONT_MONO, fontSize: 13 };
	const pick = card => { onChange(addCard(list, card)); setAdding(false); };
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<span style={{ ...LABEL, color }}>{title}</span>
				{n > 0 && <span style={{ fontSize: 10, color: COLORS.textDim }}>{sign}{n}</span>}
				<button onClick={() => setAdding(a => !a)} disabled={cardsStatus === "error"} aria-expanded={adding}
					style={{ ...linkButton, marginLeft: "auto", minHeight: mobile ? 40 : 24, color: cardsStatus === "error" ? COLORS.textDim : COLORS.accent }}>
					{cardsStatus === "error" ? "CARDS UNAVAILABLE" : "+ ADD CARD"}
				</button>
			</div>
			{list.length === 0 && !adding && <span style={{ fontSize: 11, color: COLORS.textDim, padding: "2px 0" }}>No changes.</span>}
			{list.map(c => (
				<div key={c.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center", padding: "3px 0", borderBottom: `1px solid ${COLORS.border}` }}>
					<span style={{ fontSize: 12, color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
						<span style={{ color, fontWeight: 700 }}>{sign}{c.count}</span> {titleCase(c.name ?? c.id)}
					</span>
					<span style={{ display: "flex", alignItems: "center", gap: 4 }}>
						<button onClick={() => onChange(setCount(list, c.id, c.count - 1))} aria-label={c.count === 1 ? `Remove ${c.name}` : `One fewer ${c.name}`} style={stepper}>{c.count === 1 ? "✕" : "−"}</button>
						<button onClick={() => onChange(setCount(list, c.id, c.count + 1))} disabled={c.count >= MAX_COPIES} aria-label={`One more ${c.name}`}
							style={{ ...stepper, opacity: c.count >= MAX_COPIES ? 0.4 : 1, cursor: c.count >= MAX_COPIES ? "not-allowed" : "pointer" }}>+</button>
					</span>
				</div>
			))}
			{adding && !mobile && (
				<div style={{ border: `1px solid ${COLORS.borderHover}`, background: COLORS.bgRaised }}>
					<CardSearch cards={cards} onPick={pick} maxHeight={240} />
				</div>
			)}
			{adding && mobile && (
				<BottomSheet height="80%" title={`ADD TO ${title}`} onClose={() => setAdding(false)}>
					<CardSearch cards={cards} onPick={pick} mobile />
				</BottomSheet>
			)}
		</div>
	);
}

function CardSearch({ cards, onPick, mobile, maxHeight }) {
	const [query, setQuery] = useState("");
	const term = query.trim().toLowerCase();
	const found = cards ? cards.filter(c => !term || c.name.toLowerCase().includes(term)).slice(0, MAX_RESULTS) : [];
	const row = {
		width: "100%", minHeight: mobile ? 52 : 34, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center",
		padding: mobile ? "6px 16px" : "4px 10px", background: "transparent", border: "none", borderBottom: `1px solid ${COLORS.border}`,
		cursor: "pointer", textAlign: "left", fontFamily: FONT_MONO,
	};
	return (
		<>
			<div style={{ position: "sticky", top: 0, zIndex: 1, background: mobile ? COLORS.bgCard : COLORS.bgRaised, padding: mobile ? "8px 16px" : 6, borderBottom: `1px solid ${COLORS.border}` }}>
				<input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search cards by name"
					onKeyDown={e => { if (e.key === "Enter" && found.length) onPick(found[0]); }} aria-label="Search cards"
					style={{ width: "100%", height: mobile ? 48 : 30, padding: "0 10px", background: COLORS.bg, border: `1px solid ${COLORS.accent}`, outline: "none", color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: mobile ? 16 : 12, caretColor: COLORS.accent }} />
			</div>
			<div style={{ maxHeight, overflowY: maxHeight ? "auto" : "visible" }}>
				{!cards && <Note>LOADING CARDS…</Note>}
				{found.map(c => (
					<button key={c.id} onClick={() => onPick(c)} style={row}
						onMouseEnter={e => { e.currentTarget.style.background = COLORS.bgHover; }}
						onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
						<span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
							<span style={{ fontSize: mobile ? 13 : 12, color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleCase(c.name)}</span>
							<span style={{ fontSize: 10, color: COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.type}</span>
						</span>
						<span style={{ display: "flex", alignItems: "center", gap: 6 }}>
							<RuneIcons domains={c.domains} size={12} />
							{c.cost !== "" && <span style={{ fontSize: 11, color: COLORS.textMuted, minWidth: 14, textAlign: "right" }}>{c.cost}</span>}
						</span>
					</button>
				))}
				{cards && found.length === 0 && <Note>No card matches &ldquo;{query}&rdquo;.</Note>}
				{cards && found.length === MAX_RESULTS && <div style={{ ...LABEL, fontSize: 9, padding: 8, textAlign: "center" }}>KEEP TYPING TO NARROW THE LIST</div>}
			</div>
			{mobile && <div style={{ height: "calc(16px + env(safe-area-inset-bottom))" }} />}
		</>
	);
}

function LegendPickerSheet({ legends, onPick, onClose }) {
	const [query, setQuery] = useState("");
	const term = query.trim().toLowerCase();
	const list = legends.filter(l => !term || l.tags_text.toLowerCase().includes(term) || l.name.toLowerCase().includes(term));
	return (
		<BottomSheet height="80%" title="YOUR LEGEND" onClose={onClose}>
			<div style={{ position: "sticky", top: 0, zIndex: 1, background: COLORS.bgCard, padding: "8px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
				<SearchInput value={query} onChange={setQuery} placeholder="Search legends" mobile autoFocus ariaLabel="Search legends"
					onEnter={() => list.length && onPick(list[0].id)} />
			</div>
			{list.map(l => (
				<button key={l.id} onClick={() => onPick(l.id)} style={{
					width: "100%", height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", background: "transparent",
					border: "none", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", textAlign: "left", fontFamily: FONT_MONO,
				}}>
					<LegendIcon legend={l} size={32} />
					<span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
						<span style={{ color: COLORS.textStrong, fontWeight: 700 }}>{l.tags_text}</span>
						<span style={{ color: COLORS.textMuted }}> - {titleCase(l.name)}</span>
					</span>
				</button>
			))}
			<div style={{ height: "calc(16px + env(safe-area-inset-bottom))" }} />
		</BottomSheet>
	);
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function Record({ record, long }) {
	if (!record?.games) return <span style={{ fontSize: 10, color: COLORS.textDim, whiteSpace: "nowrap" }}>{long ? "No games yet" : "—"}</span>;
	return (
		<span style={{ fontSize: 11, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
			<span style={{ color: COLORS.win }}>{record.wins}</span>-<span style={{ color: COLORS.loss }}>{record.losses}</span>
			{record.draws > 0 && <>-<span style={{ color: COLORS.draw }}>{record.draws}</span></>}
			{long && <span style={{ color: COLORS.textDim }}> · {Math.round(record.winRate * 100)}%</span>}
		</span>
	);
}

function SearchInput({ value, onChange, placeholder, mobile, autoFocus, ariaLabel, onEnter }) {
	return (
		<input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={ariaLabel} autoFocus={autoFocus}
			onKeyDown={e => { if (e.key === "Enter" && onEnter) onEnter(); }}
			onFocus={e => { e.target.style.borderColor = COLORS.accent; }}
			onBlur={e => { e.target.style.borderColor = COLORS.borderHover; }}
			style={{
				width: "100%", height: mobile ? 48 : 30, padding: "0 10px", background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`,
				outline: "none", color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: mobile ? 16 : 12, caretColor: COLORS.accent,
			}} />
	);
}

function Note({ children, color }) {
	return <div style={{ fontSize: 11, color: color ?? COLORS.textDim, padding: "8px 10px", letterSpacing: "0.04em" }}>{children}</div>;
}

const secondaryButton = {
	padding: "0 12px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted,
	fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
};
const linkButton = {
	background: "none", border: "none", padding: "2px 0", color: COLORS.accent, fontFamily: FONT_MONO,
	fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
};
