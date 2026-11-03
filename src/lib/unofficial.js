// Unofficial matches: games logged by hand that BoundRift never sees — online
// games, friendlies, testing. Signed-in users' are stored by
// lambda/unofficialMatches.mjs; a guest's stay in this browser (localStorage).
//
// Match: { matchId, eloPlayerId, date: "YYYY-MM-DD", type, opponent,
//          myChampion, opponentChampion, result, score, notes, createdAt? }
// result is WIN | LOSS | DRAW, or null until picked; type is one of TYPES.
//
// They're kept out of the official history and its record boxes. The Data tab
// counts them only when "Include unofficial" is ticked (asStatItem), and the
// Notes tab shows their notes beside the official ones (asRow).

import { newId, today } from "./nexusDrafts";
import { scoreOptions, seasonAt } from "./matchStats";

const LOCAL_KEY = "riftbound-unofficial-matches";
const INCLUDE_KEY = "riftbound-include-unofficial";

export const TYPES = [["ONLINE", "Online"], ["FRIENDLY", "Friendly"], ["OTHER", "Other"]];
export const typeLabel = type => TYPES.find(([t]) => t === type)?.[1] ?? "Other";

// A new match, dated today. You usually keep playing one legend and one kind of
// game in a sitting, so both carry over from the last one logged.
export function newUnofficial(eloPlayerId, previous) {
	return {
		matchId: newId(), eloPlayerId, date: today(), type: previous?.type ?? "ONLINE", opponent: "",
		myChampion: previous?.myChampion ?? null, opponentChampion: null, result: null, score: null, notes: "",
		createdAt: new Date().toISOString(),
	};
}

// A match with a new result keeps its score only if the score still fits.
export function withResult(match, result) {
	return { ...match, result, score: scoreOptions(result).includes(match.score) ? match.score : null };
}

// Newest first: by date, then the most recently logged.
export const byNewest = (a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? "");

// Ids are prefixed so they never collide with official match ids in the Data
// tab or the Notes tab.
const statId = id => `u-${id}`;

// A match in the shape of a stored MatchHistory item, for the Data tab — or
// null without a result, which leaves nothing to count.
export function asStatItem(m) {
	if (!m.result) return null;
	return {
		matchId: statId(m.matchId), result: m.result, score: m.score ?? undefined, opponent: m.opponent || undefined,
		myChampion: m.myChampion ?? undefined, opponentChampion: m.opponentChampion ?? undefined,
		playedAt: m.date, season: seasonAt(m.date) ?? undefined, unofficial: true,
	};
}

// A match in the shape of a History row (lib/history.js), for the Notes tab.
// Its kind stands in for the event.
export function asRow(m) {
	return {
		match_id: statId(m.matchId), date: m.date, season: seasonAt(m.date) ?? undefined, result: m.result?.toLowerCase() ?? "",
		opponent_name: m.opponent || "Opponent", event: { name: `Unofficial · ${typeLabel(m.type)}` },
	};
}

// A guest's matches, kept in this browser. Every call is a no-op where storage
// is unavailable.
export function readLocalUnofficial() {
	try {
		const matches = JSON.parse(localStorage.getItem(LOCAL_KEY));
		return Array.isArray(matches) ? matches : [];
	} catch {
		return [];
	}
}

export function writeLocalUnofficial(matches) {
	try {
		localStorage.setItem(LOCAL_KEY, JSON.stringify(matches));
	} catch {
		// storage full or blocked — the matches stay on the page until it unmounts
	}
}

// Whether the Data tab counts unofficial matches — remembered per browser, off
// until ticked.
export function readIncludeUnofficial() {
	try {
		return localStorage.getItem(INCLUDE_KEY) === "1";
	} catch {
		return false;
	}
}

export function writeIncludeUnofficial(on) {
	try {
		if (on) localStorage.setItem(INCLUDE_KEY, "1");
		else localStorage.removeItem(INCLUDE_KEY);
	} catch {
		// nothing to remember it in
	}
}
