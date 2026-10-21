// Nexus Night drafts: games logged at a local event as they're played, before
// UVS / EloShowdown publish the results. Signed-in users' drafts are stored by
// lambda/matchDrafts.mjs; a guest's stay in this browser (localStorage).
//
// Draft: { draftId, eloPlayerId, eventName, date: "YYYY-MM-DD", games, createdAt? }
// Game:  { id, opponent, myChampion, opponentChampion, result, score }
//
// Once the real matches arrive, matchDraftGames() pairs each drafted game with
// its EloShowdown row (same opponent, within a day of the event), and
// draftPicks() turns those pairs into History picks.

import { scoreOptions } from "./matchStats";

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

// gameId → the EloShowdown elo-history point it was (most likely) played as:
// the same opponent name (any case) on the event's date, or a day either side
// for time-zone differences; the closest date wins, then the earlier match.
// Each point pairs with at most one game. Games without an opponent never match.
export function matchDraftGames(drafts, points) {
	const found = new Map();
	const taken = new Set();
	for (const draft of drafts) {
		for (const game of draft.games) {
			if (!norm(game.opponent)) continue;
			const best = points
				.filter(p => !taken.has(String(p.match_id)) && norm(p.opponent_name) === norm(game.opponent)
					&& day(p.date) && daysApart(day(p.date), draft.date) <= 1)
				.sort((a, b) => daysApart(day(a.date), draft.date) - daysApart(day(b.date), draft.date)
					|| Number(a.match_id) - Number(b.match_id))[0];
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
