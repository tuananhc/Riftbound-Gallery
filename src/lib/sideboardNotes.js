// Sideboard notes: one per matchup — your legend vs the opponent's — with the
// cards to bring in, the cards to take out and a plan, kept separately for
// when you're on the play and on the draw. Signed-in users' notes are stored
// by lambda/sideboardNotes.mjs; a guest's stay in this browser (localStorage).
//
// Note: { myLegend, oppLegend, play: Side, draw: Side, updatedAt? }
// Side: { in: [{ id, name, count }], out: [...], plan }

const LOCAL_KEY = "riftbound-sideboard-notes";

export const SIDES = [["play", "ON THE PLAY"], ["draw", "ON THE DRAW"]];
export const MAX_COPIES = 3;

export const matchupKey = (myLegend, oppLegend) => `${myLegend}|${oppLegend}`;

export function emptySide() {
	return { in: [], out: [], plan: "" };
}

export function newNote(myLegend, oppLegend) {
	return { myLegend, oppLegend, play: emptySide(), draw: emptySide() };
}

// A side as stored can be missing parts; fill them in for editing.
export function sideOf(note, side) {
	const s = note?.[side] ?? {};
	return { in: s.in ?? [], out: s.out ?? [], plan: s.plan ?? "" };
}

export function sideIsEmpty(s) {
	return !s.in.length && !s.out.length && !s.plan.trim();
}

export function noteIsEmpty(note) {
	return SIDES.every(([side]) => sideIsEmpty(sideOf(note, side)));
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

// A guest's notes, kept in this browser. Every call is a no-op where storage
// is unavailable.
export function readLocalNotes() {
	try {
		const notes = JSON.parse(localStorage.getItem(LOCAL_KEY));
		return Array.isArray(notes) ? notes : [];
	} catch {
		return [];
	}
}

export function writeLocalNotes(notes) {
	try {
		if (notes.length) localStorage.setItem(LOCAL_KEY, JSON.stringify(notes));
		else localStorage.removeItem(LOCAL_KEY);
	} catch {
		// storage full or blocked — the notes stay on the page until it unmounts
	}
}
