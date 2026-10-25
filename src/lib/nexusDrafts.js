// Nexus Night drafts: games logged at a local event as they're played, before
// the results reach BoundRift. Signed-in users' drafts are stored by
// lambda/matchDrafts.mjs; a guest's stay in this browser (localStorage).
//
// Draft: { draftId, eloPlayerId, eventName, date: "YYYY-MM-DD", games, createdAt? }
// Game:  { id, opponent, myChampion, opponentChampion, result, score }
// (eloPlayerId is the linked account's id — see lambda/userProfile.mjs.)
//
// Once the real matches arrive, matchDraftGames() pairs each drafted game with
// its History row (same opponent, near the event's date), and draftPicks()
// turns those pairs into History picks.

import { matchNumber, scoreOptions } from "./matchStats";

const LOCAL_KEY = "riftbound-nexus-drafts";

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "");

// Today in the browser's time zone, as YYYY-MM-DD.
export function today() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function newDraft(eloPlayerId) {
	return { draftId: newId(), eloPlayerId, eventName: "", date: today(), games: [newGame()] };
}

// A new round. You usually play one legend all night, so it carries over.
export function newGame(previous) {
	return { id: newId(), opponent: "", myChampion: previous?.myChampion ?? null, opponentChampion: null, result: null, score: null };
}

const norm = s => (s ?? "").trim().toLowerCase();
const day = d => d?.slice(0, 10);
const daysApart = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;

// gameId → the History row it was (most likely) played as: the same opponent
// name (any case) on the event's date, or a day either side for time-zone
// differences. A row whose event hasn't been found yet only knows its month, so
// it can match a draft in that month — after any row with a date, then the
// earlier match. Each row pairs with at most one game. Games without an
// opponent never match.
export function matchDraftGames(drafts, points) {
	const found = new Map();
	const taken = new Set();
	// Days from the draft, with a month-only row counted as further than any dated one.
	const distance = (p, draft) => (day(p.date) ? daysApart(day(p.date), draft.date) : 2);
	for (const draft of drafts) {
		for (const game of draft.games) {
			if (!norm(game.opponent)) continue;
			const best = points
				.filter(p => !taken.has(String(p.match_id)) && norm(p.opponent_name) === norm(game.opponent)
					&& (day(p.date) ? daysApart(day(p.date), draft.date) <= 1 : p.month === draft.date.slice(0, 7)))
				.sort((a, b) => distance(a, draft) - distance(b, draft) || matchNumber(a.match_id) - matchNumber(b.match_id))[0];
			if (best) {
				taken.add(String(best.match_id));
				found.set(game.id, best);
			}
		}
	}
	return found;
}

// The picks the History rows show: the user's own picks, with matched draft
// games filling any slot that has never been set. A pick cleared on purpose is
// null, not missing, so a draft never brings it back. A drafted score is only
// used when it fits the real result.
export function draftPicks(picks, drafts, matches, playerId) {
	const out = { ...picks };
	for (const draft of drafts) {
		for (const game of draft.games) {
			const point = matches.get(game.id);
			if (!point) continue;
			const key = `${playerId}:${point.match_id}`;
			const own = picks[key] ?? {};
			const fill = {};
			if (own.mine === undefined && game.myChampion) fill.mine = game.myChampion;
			if (own.opponent === undefined && game.opponentChampion) fill.opponent = game.opponentChampion;
			if (own.score === undefined && game.score && scoreOptions(point.result).includes(game.score)) fill.score = game.score;
			if (Object.keys(fill).length) out[key] = { ...own, ...fill };
		}
	}
	return out;
}

// A guest's drafts, kept in this browser. Every call is a no-op where storage
// is unavailable.
export function readLocalDrafts() {
	try {
		const drafts = JSON.parse(localStorage.getItem(LOCAL_KEY));
		return Array.isArray(drafts) ? drafts : [];
	} catch {
		return [];
	}
}

export function writeLocalDrafts(drafts) {
	try {
		if (drafts.length) localStorage.setItem(LOCAL_KEY, JSON.stringify(drafts));
		else localStorage.removeItem(LOCAL_KEY);
	} catch {
		// storage full or blocked — the drafts stay on the page until it unmounts
	}
}
