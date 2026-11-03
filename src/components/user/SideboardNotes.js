"use client";
import { useState } from "react";
import Image from "next/image";
import { COLORS, FONT_MONO, alpha } from "../../lib/data";
import { legendLabel, titleCase } from "../../lib/cards/data";
import { GAMES, MAX_COPIES, MAX_BATTLEFIELDS, matchupKey, newNote, gameOf, gameIsEmpty, addCard, setCount, total, differs } from "../../lib/sideboardNotes";
import BottomSheet from "../BottomSheet";
import LegendIcon from "../cards/LegendIcon";
import RuneIcons from "../cards/RuneIcons";

// ── Sideboard Notes tab ──────────────────────────────────────────────────────
// A binder of matchup plans. Pick your legend — and once, the three
// battlefields you bring with it — then any opponent legend. Its note covers
// game 1 (blind, main deck: battlefield + plan) and games 2–3 on the play and
// on the draw (battlefield, cards in, cards out, plan). On desktop the three
// sit side by side in one grid, so every row lines up across them; on a phone
// three summary tiles pick which game's rows to show.
//
//   notes          every stored note (lib/sideboardNotes.js for the shapes)
//   battlefieldSets [{ myLegend, battlefields: [id, …] }]
//   records        Map "myLegend|oppLegend" → record() of your games in it
//   myLegends      legend ids you play, most relevant first (the chips)
//   pickers        { cards, battlefields } for the pickers, or null while loading
//   saveState      { "myLegend|oppLegend": "saving" | "saved" | "error" }

const LABEL = { fontSize: 10, letterSpacing: "0.14em", color: COLORS.textDim };
const MAX_RESULTS = 40;
const gameLabel = game => GAMES.find(([k]) => k === game)[1];

export default function SideboardNotes({ notes, battlefieldSets, battlefieldError, legends, records, myLegends, pickers, cardsStatus, saveState, status, isGuest, mobile, onChange, onDelete, onFlush, onSetBattlefields }) {
	const legendById = new Map(legends.map(l => [l.id, l]));
	const bfById = new Map((pickers?.battlefields ?? []).map(b => [b.id, b]));
	const noteByKey = new Map(notes.map(n => [matchupKey(n.myLegend, n.oppLegend), n]));
	const [chosenYou, setYou] = useState(null);
	const [chosenOpp, setOpp] = useState(null);
	const [showing, setShowing] = useState(false); // phone: the note in place of the list
	const [query, setQuery] = useState("");
	const [pickingLegend, setPickingLegend] = useState(false);

	// Your legend: the one chosen, else the one you play most recently, else the
	// first. The chips are the legends you play plus whichever is selected.
	const you = chosenYou ?? myLegends.find(id => legendById.has(id)) ?? legends[0]?.id;
	if (!you) return <Note>Legends haven&rsquo;t loaded — reload the page to try again.</Note>;
	const chips = [...new Set([...myLegends, you].filter(id => id && legendById.has(id)))];
	const myBattlefields = battlefieldSets.find(s => s.myLegend === you)?.battlefields ?? [];

	// Opponents: noted matchups first, then the ones you've played most, then A–Z.
	const games = id => records.get(matchupKey(you, id))?.games ?? 0;
	const term = query.trim().toLowerCase();
	const opponents = legends
		.filter(l => !term || l.tags_text.toLowerCase().includes(term) || l.name.toLowerCase().includes(term))
		.sort((a, b) => Number(noteByKey.has(matchupKey(you, b.id))) - Number(noteByKey.has(matchupKey(you, a.id)))
			|| games(b.id) - games(a.id) || a.tags_text.localeCompare(b.tags_text));
	const opp = chosenOpp && legendById.has(chosenOpp) ? chosenOpp : opponents[0]?.id ?? null;
	const notedCount = notes.filter(n => n.myLegend === you).length;

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
			<div style={{ maxHeight: mobile ? "none" : 620, overflowY: mobile ? "visible" : "auto" }}>
				{opponents.map(l => {
					const note = noteByKey.get(matchupKey(you, l.id));
					const current = !mobile && l.id === opp;
					return (
						<button key={l.id} onClick={() => { setOpp(l.id); setShowing(true); }} aria-current={current || undefined}
							onMouseEnter={e => { if (!current) e.currentTarget.style.background = COLORS.bgHover; }}
							onMouseLeave={e => { if (!current) e.currentTarget.style.background = "transparent"; }}
							style={{
								width: "100%", minHeight: mobile ? 52 : 40, display: "grid", gridTemplateColumns: "10px auto minmax(0, 1fr) auto auto", gap: 8, alignItems: "center",
								padding: "4px 10px", background: current ? COLORS.bgHover : "transparent", border: "none", borderBottom: `1px solid ${COLORS.border}`,
								boxShadow: current ? `inset 2px 0 0 ${COLORS.accent}` : "none", cursor: "pointer", textAlign: "left", fontFamily: FONT_MONO,
							}}>
							<span title={note ? "Has a note" : "No note yet"} style={{
								width: 8, height: 8, borderRadius: "50%", border: `1px solid ${note ? COLORS.accent : COLORS.textDim}`, background: note ? COLORS.accent : "transparent",
							}} />
							<LegendIcon legend={l} size={mobile ? 32 : 24} />
							<span style={{ fontSize: 12, color: note ? COLORS.textStrong : COLORS.text, fontWeight: note ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.tags_text}</span>
							{/* The battlefield picked for blind / play / draw */}
							{note ? (
								<span title="Battlefields: blind / on the play / on the draw" style={{ display: "flex", gap: 2 }}>
									{GAMES.map(([game]) => <BattlefieldArt key={game} battlefield={bfById.get(gameOf(note, game).battlefield)} picked={Boolean(gameOf(note, game).battlefield)} width={14} />)}
								</span>
							) : <span />}
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
			myBattlefields={myBattlefields} bfById={bfById} pickers={pickers} cardsStatus={cardsStatus}
			saveState={saveState[matchupKey(you, opp)]} isGuest={isGuest} mobile={mobile}
			onChange={onChange} onDelete={() => onDelete(you, opp)} onFlush={() => onFlush(matchupKey(you, opp))}
			onBack={mobile ? () => setShowing(false) : null} />
	);

	return (
		<div style={{ fontFamily: FONT_MONO, display: "flex", flexDirection: "column", gap: 10 }}>
			<div style={{ fontSize: 11, lineHeight: 1.6, color: COLORS.textMuted }}>
				Your plan for each matchup: the battlefield and plan for game 1, then what to bring in and take out on the play and on the draw.
				{isGuest && <span style={{ color: COLORS.textDim }}> As a guest, notes stay in this browser only.</span>}
			</div>
			{status === "loading" && <Note>LOADING SIDEBOARD NOTES…</Note>}
			{status === "error" && <Note color={COLORS.loss}>Couldn&rsquo;t load your sideboard notes. Reload the page to try again — editing is off so a stored note isn&rsquo;t overwritten.</Note>}
			{status === "ready" && (<>
				{chipRow}
				{(!mobile || !showing) && (
					<BattlefieldStrip legend={legendById.get(you)} ids={myBattlefields} bfById={bfById} pickers={pickers} cardsStatus={cardsStatus} failed={battlefieldError === you}
						mobile={mobile} onChange={ids => onSetBattlefields(you, ids)} />
				)}
				{mobile
					? (showing ? detail : list)
					: (
						<div style={{ display: "grid", gridTemplateColumns: "270px minmax(0, 1fr)", gap: 8, alignItems: "start" }}>
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

// ── Your battlefields ────────────────────────────────────────────────────────
// The three battlefields you bring with a legend; each game picks one of them.

function BattlefieldStrip({ legend, ids, bfById, pickers, cardsStatus, failed, mobile, onChange }) {
	const [adding, setAdding] = useState(false);
	const full = ids.length >= MAX_BATTLEFIELDS;
	const add = bf => { onChange([...ids, bf.id]); setAdding(false); };
	const available = (pickers?.battlefields ?? []).filter(b => !ids.includes(b.id));
	return (
		<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: mobile ? 10 : "8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
			<div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
				<span style={LABEL}>YOUR BATTLEFIELDS · {legend?.tags_text?.toUpperCase()}</span>
				{ids.length === 0 && !failed && <span style={{ fontSize: 11, color: COLORS.textMuted }}>Add the three you bring with {legend?.tags_text}; each game below picks from them.</span>}
				{failed && <span role="alert" style={{ fontSize: 11, color: COLORS.loss }}>Couldn&rsquo;t save your battlefields, so the change was undone. Try again.</span>}
			</div>
			<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
				{ids.map(id => {
					const bf = bfById.get(id);
					return (
						<span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "3px 4px 3px 3px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, minWidth: 0 }}>
							<BattlefieldArt battlefield={bf} picked width={mobile ? 48 : 40} />
							<span style={{ fontSize: 12, color: COLORS.textStrong, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 }}>{bf ? titleCase(bf.name) : "…"}</span>
							<button onClick={() => onChange(ids.filter(x => x !== id))} aria-label={`Remove ${bf?.name ?? "battlefield"}`}
								style={{ width: mobile ? 40 : 24, height: mobile ? 40 : 24, background: "transparent", border: "none", color: COLORS.textDim, cursor: "pointer", fontFamily: FONT_MONO }}>✕</button>
						</span>
					);
				})}
				{!full && (
					<button onClick={() => setAdding(a => !a)} disabled={cardsStatus === "error"} aria-expanded={adding}
						style={{ ...secondaryButton, height: mobile ? 48 : 36, borderStyle: "dashed", color: cardsStatus === "error" ? COLORS.textDim : COLORS.accent }}>
						{cardsStatus === "error" ? "BATTLEFIELDS UNAVAILABLE" : `+ ADD BATTLEFIELD (${ids.length}/${MAX_BATTLEFIELDS})`}
					</button>
				)}
			</div>
			{adding && !mobile && (
				<div style={{ border: `1px solid ${COLORS.borderHover}`, background: COLORS.bgRaised }}>
					<PickerSearch items={pickers ? available : null} onPick={add} maxHeight={260} placeholder="Search battlefields" battlefields />
				</div>
			)}
			{adding && mobile && (
				<BottomSheet height="80%" title="ADD A BATTLEFIELD" onClose={() => setAdding(false)}>
					<PickerSearch items={pickers ? available : null} onPick={add} mobile placeholder="Search battlefields" battlefields />
				</BottomSheet>
			)}
		</div>
	);
}

// ── One matchup's note ───────────────────────────────────────────────────────

function NoteDetail({ you, opp, note, record, myBattlefields, bfById, pickers, cardsStatus, saveState, isGuest, mobile, onChange, onDelete, onFlush, onBack }) {
	const [phoneGame, setPhoneGame] = useState("blind");
	const [confirmDelete, setConfirmDelete] = useState(false);
	const current = note ?? newNote(you.id, opp.id);
	const update = (game, fields) => onChange({ ...current, [game]: { ...gameOf(current, game), ...fields } });
	const copyFrom = (from, to) => onChange({ ...current, [to]: { ...gameOf(current, from) } });
	const other = game => (game === "play" ? "draw" : "play");
	const swaps = game => (game === "blind" ? "Main deck" : `+${total(gameOf(current, game).in)} / −${total(gameOf(current, game).out)}`);
	const saveText = isGuest ? "" : saveState === "saving" ? "SAVING…" : saveState === "error" ? "NOT SAVED — EDIT AGAIN TO RETRY" : saveState === "saved" ? "SAVED" : "";

	// The four parts of a game, shared by the desktop grid and the phone stack.
	const battlefieldPart = game => (
		<BattlefieldChoice value={gameOf(current, game).battlefield} options={myBattlefields} bfById={bfById} mobile={mobile}
			game={gameLabel(game)} onPick={id => update(game, { battlefield: id === gameOf(current, game).battlefield ? null : id })} />
	);
	const cardsPart = (game, kind) => (
		<CardList kind={kind} list={gameOf(current, game)[kind]} otherList={gameOf(current, other(game))[kind]}
			cards={pickers?.cards ?? null} cardsStatus={cardsStatus} mobile={mobile} onChange={list => update(game, { [kind]: list })} />
	);
	const balance = game => {
		const g = gameOf(current, game);
		const ins = total(g.in);
		const outs = total(g.out);
		// A sideboard swap trades card for card, so uneven totals are worth a look.
		return (ins > 0 || outs > 0) && ins !== outs && (
			<div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 6 }}>
				In <span style={{ color: COLORS.win }}>{ins}</span>, out <span style={{ color: COLORS.loss }}>{outs}</span> — deck size {ins - outs > 0 ? "+" : ""}{ins - outs}.
			</div>
		);
	};
	const planPart = game => (
		<textarea value={gameOf(current, game).plan} onChange={e => update(game, { plan: e.target.value })} maxLength={2000}
			aria-label={`Plan ${gameLabel(game).toLowerCase()}`}
			placeholder={game === "blind" ? "Game 1: what to mulligan for, their key turns…" : "What changes: what to hold up, how to pace it…"}
			onFocus={e => { e.target.style.borderColor = COLORS.accent; }}
			onBlur={e => { e.target.style.borderColor = COLORS.border; onFlush(); }}
			style={{
				width: "100%", minHeight: mobile ? 120 : 90, resize: "vertical", padding: "8px 10px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`,
				outline: "none", color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: mobile ? 16 : 12, lineHeight: 1.6, caretColor: COLORS.accent,
			}} />
	);
	const copyButton = game => game !== "blind" && gameIsEmpty(gameOf(current, game)) && !gameIsEmpty(gameOf(current, other(game))) && (
		<button onClick={() => copyFrom(other(game), game)} style={{ ...linkButton, alignSelf: "flex-start", minHeight: mobile ? 40 : 0 }}>
			COPY FROM {gameLabel(other(game))}
		</button>
	);

	const header = (
		<div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
			<LegendIcon legend={you} size={mobile ? 36 : 32} />
			<span style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.12em" }}>VS</span>
			<LegendIcon legend={opp} size={mobile ? 36 : 32} />
			<div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: "1 1 180px" }}>
				<span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{you.tags_text} vs {opp.tags_text}</span>
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
	);

	// Desktop: one grid — a header row, then BATTLEFIELD / IN / OUT / PLAN rows
	// across the three games, so each row starts level in every column.
	const cell = { padding: 10, borderTop: `1px solid ${COLORS.border}`, borderLeft: `1px solid ${COLORS.border}`, minWidth: 0 };
	const rowLabel = { ...cell, borderLeft: "none", ...LABEL, paddingTop: 12 };
	const blindCell = { ...cell, fontSize: 11, color: COLORS.textDim, background: alpha(COLORS.bgAlt, 60) };
	const grid = (
		<div style={{ display: "grid", gridTemplateColumns: "104px repeat(3, minmax(0, 1fr))", border: `1px solid ${COLORS.border}` }}>
			<div style={{ background: COLORS.bgAlt }} />
			{GAMES.map(([game, label, sub]) => (
				<div key={game} style={{ padding: 10, borderLeft: `1px solid ${COLORS.border}`, background: COLORS.bgAlt, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
					<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: COLORS.textStrong }}>{label}</span>
					<span style={{ fontSize: 10, color: COLORS.textDim }}>{sub}</span>
					{copyButton(game)}
				</div>
			))}
			<div style={rowLabel}>BATTLEFIELD</div>
			{GAMES.map(([game]) => <div key={game} style={cell}>{battlefieldPart(game)}</div>)}
			<div style={{ ...rowLabel, color: COLORS.win }}>IN</div>
			<div style={blindCell}>Main deck</div>
			{["play", "draw"].map(game => <div key={game} style={cell}>{cardsPart(game, "in")}</div>)}
			<div style={{ ...rowLabel, color: COLORS.loss }}>OUT</div>
			<div style={blindCell}>—</div>
			{["play", "draw"].map(game => <div key={game} style={cell}>{cardsPart(game, "out")}{balance(game)}</div>)}
			<div style={rowLabel}>PLAN</div>
			{GAMES.map(([game]) => <div key={game} style={cell}>{planPart(game)}</div>)}
		</div>
	);

	// Phone: a summary tile per game (its battlefield and swaps) that picks
	// which game's parts show below, in the same order as the desktop rows.
	const section = { padding: 12, borderTop: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 8 };
	const phone = (<>
		<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4 }} role="group" aria-label="Game">
			{GAMES.map(([game]) => {
				const on = game === phoneGame;
				const bf = bfById.get(gameOf(current, game).battlefield);
				return (
					<button key={game} onClick={() => setPhoneGame(game)} aria-pressed={on} style={{
						display: "flex", flexDirection: "column", gap: 4, padding: 6, minWidth: 0, textAlign: "left", cursor: "pointer", fontFamily: FONT_MONO,
						background: on ? alpha(COLORS.accent, 10) : COLORS.bgRaised, border: `1px solid ${on ? COLORS.accent : COLORS.border}`,
					}}>
						<span style={{ fontSize: 9, letterSpacing: "0.12em", fontWeight: 700, color: on ? COLORS.accent : COLORS.textDim }}>{game === "blind" ? "BLIND" : game === "play" ? "PLAY" : "DRAW"}</span>
						<BattlefieldArt battlefield={bf} picked={Boolean(gameOf(current, game).battlefield)} width="100%" />
						<span style={{ fontSize: 10, color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bf ? titleCase(bf.name) : "No battlefield"}</span>
						<span style={{ fontSize: 10, color: COLORS.textMuted }}>{swaps(game)}</span>
					</button>
				);
			})}
		</div>
		<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
			<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: COLORS.textStrong }}>{gameLabel(phoneGame)}</span>
			<span style={{ marginLeft: "auto" }}>{copyButton(phoneGame)}</span>
		</div>
		<div style={{ border: `1px solid ${COLORS.border}` }}>
			<div style={{ ...section, borderTop: "none" }}><span style={LABEL}>BATTLEFIELD</span>{battlefieldPart(phoneGame)}</div>
			{phoneGame === "blind"
				? <div style={section}><span style={LABEL}>CARDS</span><span style={{ fontSize: 11, color: COLORS.textDim }}>Main deck — no changes in game 1.</span></div>
				: (<>
					<div style={section}><span style={{ ...LABEL, color: COLORS.win }}>IN</span>{cardsPart(phoneGame, "in")}</div>
					<div style={section}><span style={{ ...LABEL, color: COLORS.loss }}>OUT</span>{cardsPart(phoneGame, "out")}{balance(phoneGame)}</div>
				</>)}
			<div style={section}><span style={LABEL}>PLAN</span>{planPart(phoneGame)}</div>
		</div>
	</>);

	return (
		<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: mobile ? 12 : 14, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
			{onBack && <button onClick={onBack} style={{ ...secondaryButton, height: 44, alignSelf: "flex-start" }}>← ALL OPPONENTS</button>}
			{header}
			{mobile ? phone : grid}
			{!mobile && <span style={{ fontSize: 10, color: COLORS.textDim }}><span style={{ display: "inline-block", width: 6, height: 6, background: COLORS.accent, marginRight: 6 }} />differs between on the play and on the draw</span>}
			{note && (
				<button onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))} onBlur={() => setConfirmDelete(false)}
					style={{ ...secondaryButton, height: mobile ? 44 : 28, alignSelf: "flex-end", color: confirmDelete ? COLORS.loss : COLORS.textMuted, borderColor: confirmDelete ? COLORS.loss : COLORS.border }}>
					{confirmDelete ? "CONFIRM DELETE" : "DELETE NOTE"}
				</button>
			)}
		</div>
	);
}

// One game's battlefield: the pick, and your three to choose from (click the
// picked one again to clear it).
function BattlefieldChoice({ value, options, bfById, mobile, game, onPick }) {
	const picked = value ? bfById.get(value) : null;
	const stray = value && !options.includes(value);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
			<div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
				<BattlefieldArt battlefield={picked} picked={Boolean(value)} width={mobile ? 56 : 44} />
				<span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
					<span style={{ fontSize: 12, fontWeight: 700, color: value ? COLORS.textStrong : COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
						{value ? titleCase(picked?.name ?? "…") : "Not chosen"}
					</span>
					{stray && <span style={{ fontSize: 10, color: COLORS.loss }}>Not in your battlefields</span>}
				</span>
			</div>
			{options.length > 0 ? (
				<div style={{ display: "flex", gap: 4 }} role="group" aria-label={`Battlefield ${game.toLowerCase()}`}>
					{options.map(id => {
						const on = id === value;
						return (
							<button key={id} onClick={() => onPick(id)} aria-pressed={on} title={bfById.get(id) ? titleCase(bfById.get(id).name) : id}
								onMouseEnter={e => { if (!on) e.currentTarget.style.opacity = "1"; }}
								onMouseLeave={e => { if (!on) e.currentTarget.style.opacity = "0.55"; }}
								style={{
									padding: 0, lineHeight: 0, background: "none", cursor: "pointer", opacity: on ? 1 : 0.55,
									border: `1px solid ${on ? COLORS.accent : COLORS.border}`, outline: on ? `1px solid ${COLORS.accent}` : "none",
								}}>
								<BattlefieldArt battlefield={bfById.get(id)} picked width={mobile ? 56 : 34} bare />
							</button>
						);
					})}
				</div>
			) : <span style={{ fontSize: 10, color: COLORS.textDim }}>Add your battlefields above to pick one.</span>}
		</div>
	);
}

// IN or OUT: the cards with a − n + stepper each, and a picker to add more.
// A blue square marks a card the other game (play ↔ draw) doesn't swap the same way.
function CardList({ kind, list, otherList, cards, cardsStatus, mobile, onChange }) {
	const [adding, setAdding] = useState(false);
	const sign = kind === "in" ? "+" : "−";
	const color = kind === "in" ? COLORS.win : COLORS.loss;
	const stepper = { width: mobile ? 40 : 22, height: mobile ? 40 : 22, background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: "pointer", fontFamily: FONT_MONO, fontSize: 12, padding: 0 };
	const pick = card => { onChange(addCard(list, card)); setAdding(false); };
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
			{list.length === 0 && !adding && <span style={{ fontSize: 11, color: COLORS.textDim }}>No changes.</span>}
			{list.map(c => (
				<div key={c.id} style={{ display: "grid", gridTemplateColumns: "6px minmax(0, 1fr) auto", gap: 6, alignItems: "center", minHeight: mobile ? 44 : 24 }}>
					<span title={differs(c, otherList) ? "Not the same on the play and on the draw" : undefined}
						style={{ width: 6, height: 6, background: differs(c, otherList) ? COLORS.accent : "transparent" }} />
					<span style={{ fontSize: 12, color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
						<span style={{ color, fontWeight: 700 }}>{sign}{c.count}</span> {titleCase(c.name ?? c.id)}
					</span>
					<span style={{ display: "flex", gap: 3 }}>
						<button onClick={() => onChange(setCount(list, c.id, c.count - 1))} aria-label={c.count === 1 ? `Remove ${c.name}` : `One fewer ${c.name}`} style={stepper}>{c.count === 1 ? "✕" : "−"}</button>
						<button onClick={() => onChange(setCount(list, c.id, c.count + 1))} disabled={c.count >= MAX_COPIES} aria-label={`One more ${c.name}`}
							style={{ ...stepper, opacity: c.count >= MAX_COPIES ? 0.4 : 1, cursor: c.count >= MAX_COPIES ? "not-allowed" : "pointer" }}>+</button>
					</span>
				</div>
			))}
			<button onClick={() => setAdding(a => !a)} disabled={cardsStatus === "error"} aria-expanded={adding}
				style={{ ...linkButton, alignSelf: "flex-start", minHeight: mobile ? 40 : 22, color: cardsStatus === "error" ? COLORS.textDim : COLORS.accent }}>
				{cardsStatus === "error" ? "CARDS UNAVAILABLE" : "+ ADD CARD"}
			</button>
			{adding && !mobile && (
				<div style={{ border: `1px solid ${COLORS.borderHover}`, background: COLORS.bgRaised }}>
					<PickerSearch items={cards} onPick={pick} maxHeight={240} placeholder="Search cards by name" />
				</div>
			)}
			{adding && mobile && (
				<BottomSheet height="80%" title={kind === "in" ? "BRING IN" : "TAKE OUT"} onClose={() => setAdding(false)}>
					<PickerSearch items={cards} onPick={pick} mobile placeholder="Search cards by name" />
				</BottomSheet>
			)}
		</div>
	);
}

// Searchable list of cards or battlefields; Enter takes the first match.
function PickerSearch({ items, onPick, mobile, maxHeight, placeholder, battlefields }) {
	const [query, setQuery] = useState("");
	const term = query.trim().toLowerCase();
	const found = items ? items.filter(c => !term || c.name.toLowerCase().includes(term)).slice(0, MAX_RESULTS) : [];
	const row = {
		width: "100%", minHeight: mobile ? 52 : 34, display: "grid", gridTemplateColumns: battlefields ? "auto minmax(0, 1fr)" : "minmax(0, 1fr) auto", gap: 8, alignItems: "center",
		padding: mobile ? "6px 16px" : "4px 10px", background: "transparent", border: "none", borderBottom: `1px solid ${COLORS.border}`,
		cursor: "pointer", textAlign: "left", fontFamily: FONT_MONO,
	};
	return (
		<>
			<div style={{ position: "sticky", top: 0, zIndex: 1, background: mobile ? COLORS.bgCard : COLORS.bgRaised, padding: mobile ? "8px 16px" : 6, borderBottom: `1px solid ${COLORS.border}` }}>
				<input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder}
					onKeyDown={e => { if (e.key === "Enter" && found.length) onPick(found[0]); }}
					style={{ width: "100%", height: mobile ? 48 : 30, padding: "0 10px", background: COLORS.bg, border: `1px solid ${COLORS.accent}`, outline: "none", color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: mobile ? 16 : 12, caretColor: COLORS.accent }} />
			</div>
			<div style={{ maxHeight, overflowY: maxHeight ? "auto" : "visible" }}>
				{!items && <Note>LOADING CARDS…</Note>}
				{found.map(c => (
					<button key={c.id} onClick={() => onPick(c)} style={row}
						onMouseEnter={e => { e.currentTarget.style.background = COLORS.bgHover; }}
						onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
						{battlefields ? (<>
							<BattlefieldArt battlefield={c} picked width={mobile ? 64 : 48} />
							<span style={{ fontSize: mobile ? 13 : 12, color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleCase(c.name)}</span>
						</>) : (<>
							<span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
								<span style={{ fontSize: mobile ? 13 : 12, color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleCase(c.name)}</span>
								<span style={{ fontSize: 10, color: COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.type}</span>
							</span>
							<span style={{ display: "flex", alignItems: "center", gap: 6 }}>
								<RuneIcons domains={c.domains} size={12} />
								{c.cost !== "" && <span style={{ fontSize: 11, color: COLORS.textMuted, minWidth: 14, textAlign: "right" }}>{c.cost}</span>}
							</span>
						</>)}
					</button>
				))}
				{items && found.length === 0 && <Note>{term ? <>Nothing matches &ldquo;{query}&rdquo;.</> : "Nothing left to add."}</Note>}
				{items && found.length === MAX_RESULTS && <div style={{ ...LABEL, fontSize: 9, padding: 8, textAlign: "center" }}>KEEP TYPING TO NARROW THE LIST</div>}
			</div>
			{mobile && <div style={{ height: "calc(16px + env(safe-area-inset-bottom))" }} />}
		</>
	);
}

// A battlefield's card art (landscape). Empty and dashed when none is picked;
// a plain box while the card list is still loading.
function BattlefieldArt({ battlefield, picked, width, bare }) {
	return (
		<span style={{
			position: "relative", display: "inline-block", flexShrink: 0, width, aspectRatio: "1039 / 744", overflow: "hidden",
			background: picked ? COLORS.bgHover : "transparent", border: bare ? "none" : `1px ${picked ? "solid" : "dashed"} ${picked ? COLORS.borderHover : COLORS.border}`,
		}}>
			{battlefield?.image && <Image src={battlefield.image} alt="" fill sizes="120px" style={{ objectFit: "cover" }} />}
		</span>
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
