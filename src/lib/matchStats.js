// Stats over saved MatchHistory items — { matchId, result: "WIN"|"LOSS"|"DRAW",
// score, playedAt, month, opponent, opponentId, myChampion, opponentChampion,
// eloBefore, eloChange, eloAfter, season, ... } (see lambda/saveMatchHistory.mjs).
// Pure functions; the profile's Data tab and record boxes render these.

// Final game scores (yours first) each result can end on: best of 3, then best
// of 1. The save Lambda checks against the same list.
export const SCORES = {
	WIN: ["2-0", "2-1", "1-0"],
	LOSS: ["0-2", "1-2", "0-1"],
	DRAW: ["1-1", "0-0"],
};

// Riftbound's sets, which are the rating seasons: BoundRift restarts everyone's
// Elo with each one. Mirrors the set list on BoundRift's own site (it has no API
// for it), oldest first, so a new set needs a line here. `end` is the next
// set's start.
export const SEASONS = [
	{ slug: "Origins", start: null, end: "2026-02-13T00:00:00.000Z" },
	{ slug: "Spiritforged", start: "2026-02-13T00:00:00.000Z", end: "2026-05-08T00:00:00.000Z" },
	{ slug: "Unleashed", start: "2026-05-08T00:00:00.000Z", end: "2026-07-31T00:00:00.000Z" },
	{ slug: "Vendetta", start: "2026-07-31T00:00:00.000Z", end: "2026-10-23T00:00:00.000Z" },
	{ slug: "Radiance", start: "2026-10-23T00:00:00.000Z", end: "2027-01-29T00:00:00.000Z" },
	{ slug: "Legacy", start: "2027-01-29T00:00:00.000Z", end: "2027-04-30T00:00:00.000Z" },
	{ slug: "The Reckoning", start: "2027-04-30T00:00:00.000Z", end: null },
];

// EloShowdown's season slugs, on rows saved before the switch to BoundRift.
const ELOSHOWDOWN_SEASONS = {
	"season-1": "Origins",
	"season-2-spiritforge": "Spiritforged",
	"season-3-unleashed": "Unleashed",
	"season-4-vendetta": "Vendetta",
	"season-5-radiance": "Radiance",
};

// A stored season — a set name, or an EloShowdown slug — as a set name.
export function seasonKey(season) {
	return ELOSHOWDOWN_SEASONS[season] ?? season ?? null;
}

const seasonIndex = season => SEASONS.findIndex(s => s.slug === seasonKey(season));

// The seasons that have started, newest first, in the shape the season picker
// reads: { slug, name, start, end, is_current }.
export function startedSeasons(now = new Date().toISOString()) {
	const started = SEASONS.filter(s => !s.start || s.start <= now);
	return started.map((s, i) => ({ ...s, name: s.slug, is_current: i === started.length - 1 })).reverse();
}

// The season in play at an ISO date or a "YYYY-MM" month (taken as its 1st).
export function seasonAt(at) {
	if (!at) return null;
	const t = at.length === 7 ? `${at}-01` : at;
	return SEASONS.find(s => (!s.start || t >= s.start) && (!s.end || t < s.end))?.slug ?? null;
}

// Match and player ids from BoundRift are stored as "br-<id>", which keeps them
// apart from the EloShowdown ids on rows and accounts saved before the switch.
export const isBoundriftId = id => String(id ?? "").startsWith("br-");
export const matchNumber = id => Number(String(id ?? "").replace(/^br-/, ""));

// Oldest first, over { id, at, month, season } — a match's id, its date when
// known, the "YYYY-MM" it was played in, and its season. BoundRift numbers
// matches in the order they're played, so two BoundRift matches go by season
// then id (many only know their month). Anything else goes by date, else month,
// else when its season began, with the id breaking ties.
export function compareChronological(a, b) {
	if (isBoundriftId(a.id) && isBoundriftId(b.id)) {
		return seasonIndex(a.season) - seasonIndex(b.season) || matchNumber(a.id) - matchNumber(b.id);
	}
	const when = m => m.at ?? m.month ?? SEASONS[seasonIndex(m.season)]?.start ?? "";
	return when(a).localeCompare(when(b)) || matchNumber(a.id) - matchNumber(b.id);
}

// "3 Oct" for an ISO date, "Oct 2026" for a "YYYY-MM" month, "" for neither.
export function playedLabel(at, options = { day: "numeric", month: "short" }) {
	if (!at) return "";
	if (at.length === 7) return new Date(`${at}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
	return new Date(at).toLocaleDateString("en-GB", options);
}

// Scores to offer for a result, either case ("win" or "WIN").
export function scoreOptions(result) {
	return SCORES[String(result).toUpperCase()] ?? [];
}

// 3 once either side won 2 games or both won one; otherwise 1 (a best of 3
// that went to time can also end 1-0 or 0-0).
export function bestOf(score) {
	return /2|1-1/.test(score) ? 3 : 1;
}

// Oldest first (see compareChronological).
export function sortChronological(matches) {
	return [...matches].sort((a, b) => compareChronological(
		{ id: a.matchId, at: a.playedAt, month: a.month, season: a.season },
		{ id: b.matchId, at: b.playedAt, month: b.month, season: b.season },
	));
}

// Seasons present, newest first. Works for stored items and history rows.
export function seasonsOf(matches) {
	const present = new Set(matches.map(m => seasonKey(m.season)).filter(Boolean));
	return [...present].sort((a, b) => seasonIndex(b) - seasonIndex(a));
}

// "Vendetta" → "Vendetta"; an EloShowdown slug ("season-4-vendetta") → its set.
export function seasonLabel(slug) {
	const key = seasonKey(slug);
	if (SEASONS.some(s => s.slug === key)) return key;
	return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// The season a match belongs to: its stored season, or — for rows saved before
// seasons were stored — the season in play on its date. Works for stored items
// and history rows. `seasons` is the picker's list.
export function seasonOfMatch(m, seasons = SEASONS) {
	if (m.season) return seasonKey(m.season);
	const at = m.playedAt ?? m.date ?? m.month;
	if (!at) return null;
	const t = at.length === 7 ? `${at}-01` : at;
	return seasons.find(s => (!s.start || t >= s.start) && (!s.end || t < s.end))?.slug ?? null;
}

// season / legend of null mean "all". `seasons` places rows that have no stored
// season by their date.
export function filterMatches(matches, { season, legend, seasons }) {
	return matches.filter(m =>
		(!season || seasonOfMatch(m, seasons) === season) && (!legend || m.myChampion === legend)
	);
}

// { wins, losses, draws, games, winRate } — winRate counts draws as games, and is
// null when there are none.
export function record(matches) {
	const r = { wins: 0, losses: 0, draws: 0 };
	for (const m of matches) {
		if (m.result === "WIN") r.wins++;
		else if (m.result === "LOSS") r.losses++;
		else if (m.result === "DRAW") r.draws++;
	}
	const games = r.wins + r.losses + r.draws;
	return { ...r, games, winRate: games ? r.wins / games : null };
}

// Current run (newest backwards) and longest win run, over chronological matches.
export function streaks(sorted) {
	let current = null;
	for (let i = sorted.length - 1; i >= 0; i--) {
		const res = sorted[i].result;
		if (!current) current = { result: res, length: 1 };
		else if (res === current.result) current.length++;
		else break;
	}
	let bestWin = 0;
	let run = 0;
	for (const m of sorted) {
		run = m.result === "WIN" ? run + 1 : 0;
		bestWin = Math.max(bestWin, run);
	}
	return { current, bestWin };
}

// Matches that recorded an Elo, in order — the Elo-over-time line.
export function eloSeries(sorted) {
	return sorted.filter(m => typeof m.eloAfter === "number");
}

export function peakElo(series) {
	return series.reduce((best, m) => (!best || m.eloAfter > best.eloAfter ? m : best), null);
}

// The latest season's matches — Elo restarts each season — or every match when
// none record a season (items saved before seasons were stored).
export function latestSeason(matches) {
	const season = seasonsOf(matches)[0] ?? null;
	return { season, matches: season ? matches.filter(m => seasonKey(m.season) === season) : matches };
}

// Headline numbers: the record, streaks, the latest Elo and the peak.
export function summarize(matches) {
	const sorted = sortChronological(matches);
	const series = eloSeries(sorted);
	return { record: record(sorted), streaks: streaks(sorted), last: series.at(-1) ?? null, peak: peakElo(series) };
}

// Record per key (e.g. your legend), most games first; matches whose key is
// missing are skipped.
export function recordsBy(matches, keyFor) {
	const groups = new Map();
	for (const m of matches) {
		const key = keyFor(m);
		if (!key) continue;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(m);
	}
	return [...groups].map(([key, ms]) => ({ key, ...record(ms) })).sort((a, b) => b.games - a.games);
}

// Your legend × opponent legend. Only matches with both picks count.
// → { rows: [myLegendId], cols: [oppLegendId], cells: Map("my|opp" → record) }
export function matchupGrid(matches) {
	const both = matches.filter(m => m.myChampion && m.opponentChampion);
	const cells = new Map();
	for (const r of recordsBy(both, m => `${m.myChampion}|${m.opponentChampion}`)) cells.set(r.key, r);
	return {
		rows: recordsBy(both, m => m.myChampion).map(r => r.key),
		cols: recordsBy(both, m => m.opponentChampion).map(r => r.key),
		cells,
	};
}

// Best and toughest matchup with at least `minGames` games: highest / lowest win
// rate, more games breaking ties.
export function matchupExtremes(cells, minGames = 2) {
	const eligible = [...cells.values()].filter(c => c.games >= minGames);
	const byRate = dir => [...eligible].sort((a, b) => dir * (b.winRate - a.winRate) || b.games - a.games)[0] ?? null;
	return { best: byRate(1), toughest: byRate(-1) };
}

// The opponent you've played most, by player id (name as a fallback).
export function mostPlayedOpponent(matches) {
	const top = recordsBy(matches, m => m.opponentId ?? m.opponent)[0];
	if (!top) return null;
	const latest = sortChronological(matches.filter(m => (m.opponentId ?? m.opponent) === top.key)).at(-1);
	return { ...top, name: latest?.opponent ?? top.key };
}
