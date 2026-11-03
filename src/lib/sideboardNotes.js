// Sideboard notes: one per matchup — your legend vs the opponent's. Game 1 is
// played blind with the main deck, so it gets a battlefield and a plan; games
// 2–3 get a battlefield, the cards to bring in and take out, and a plan, kept
// separately for when you're on the play and on the draw. Each game's
// battlefield is one of the three you bring with that legend.
//
// Signed-in users' notes are stored by lambda/sideboardNotes.mjs; a guest's
// stay in this browser (localStorage).
//
// Note:  { myLegend, oppLegend, blind: Game, play: Game, draw: Game, updatedAt? }
// Game:  { battlefield, in: [{ id, name, count }], out: [...], plan } — blind has no in / out
// Set:   { myLegend, battlefields: [id, id, id] }

const LOCAL_NOTES = "riftbound-sideboard-notes";
const LOCAL_SETS = "riftbound-sideboard-battlefields";

// [key, label, sub-label, can swap cards]
export const GAMES = [
	["blind", "BLIND", "Game 1 · main deck", false],
	["play", "ON THE PLAY", "Games 2–3", true],
	["draw", "ON THE DRAW", "Games 2–3", true],
];
export const MAX_COPIES = 3;
export const MAX_BATTLEFIELDS = 3;

export const matchupKey = (myLegend, oppLegend) => `${myLegend}|${oppLegend}`;

export function newNote(myLegend, oppLegend) {
	return { myLegend, oppLegend };
}

// A game as stored can be missing parts; fill them in for editing.
export function gameOf(note, game) {
	const g = note?.[game] ?? {};
	return { battlefield: g.battlefield ?? null, in: g.in ?? [], out: g.out ?? [], plan: g.plan ?? "" };
}

export function gameIsEmpty(g) {
	return !g.battlefield && !g.in.length && !g.out.length && !g.plan.trim();
}

export function noteIsEmpty(note) {
	return GAMES.every(([game]) => gameIsEmpty(gameOf(note, game)));
}

// Add one copy of a card to a list (up to MAX_COPIES), or start it at 1.
export function addCard(list, card) {
	const found = list.find(c => c.id === card.id);
	if (!found) return [...list, { id: card.id, name: card.name, count: 1 }];
	return list.map(c => (c.id === card.id ? { ...c, count: Math.min(MAX_COPIES, c.count + 1) } : c));
}

// Change a card's count; at 0 it's removed.
export function setCount(list, id, count) {
	return count < 1 ? list.filter(c => c.id !== id) : list.map(c => (c.id === id ? { ...c, count: Math.min(MAX_COPIES, count) } : c));
}

// How many cards a list swaps, e.g. 3 for [2× A, 1× B].
export const total = list => list.reduce((n, c) => n + c.count, 0);

// True when a card on one side's list is missing from the other side's, or
// has a different count — what sets "on the play" apart from "on the draw".
export function differs(card, otherList) {
	const other = otherList.find(c => c.id === card.id);
	return !other || other.count !== card.count;
}

// A guest's notes and battlefield sets, kept in this browser. Every call is a
// no-op where storage is unavailable.
function readLocal(key) {
	try {
		const items = JSON.parse(localStorage.getItem(key));
		return Array.isArray(items) ? items : [];
	} catch {
		return [];
	}
}

function writeLocal(key, items) {
	try {
		if (items.length) localStorage.setItem(key, JSON.stringify(items));
		else localStorage.removeItem(key);
	} catch {
		// storage full or blocked — the work stays on the page until it unmounts
	}
}

export const readLocalNotes = () => readLocal(LOCAL_NOTES);
export const writeLocalNotes = notes => writeLocal(LOCAL_NOTES, notes);
export const readLocalBattlefields = () => readLocal(LOCAL_SETS);
export const writeLocalBattlefields = sets => writeLocal(LOCAL_SETS, sets);
