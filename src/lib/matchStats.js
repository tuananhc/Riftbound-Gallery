// Stats over saved MatchHistory items — { matchId, result: "WIN"|"LOSS"|"DRAW",
// score, playedAt, opponent, opponentId, myChampion, opponentChampion,
// eloBefore, eloChange, eloAfter, season, ... } (see lambda/saveMatchHistory.mjs).
// Pure functions; the profile's Data tab and record boxes render these.

// Final game scores (yours first) each result can end on: best of 3, then best
// of 1. The save Lambda checks against the same list.
export const SCORES = {
	WIN: ["2-0", "2-1", "1-0"],
	LOSS: ["0-2", "1-2", "0-1"],
	DRAW: ["1-1", "0-0"],
};

// Scores to offer for a result, either case ("win" or "WIN").
export function scoreOptions(result) {
	return SCORES[String(result).toUpperCase()] ?? [];
}

// 3 once either side won 2 games or both won one; otherwise 1 (a best of 3
// that went to time can also end 1-0 or 0-0).
export function bestOf(score) {
	return /2|1-1/.test(score) ? 3 : 1;
}

// Oldest first; matches from one event share a timestamp, so matchId breaks ties.
export function sortChronological(matches) {
	return [...matches].sort((a, b) =>
		(a.playedAt ?? "").localeCompare(b.playedAt ?? "") || Number(a.matchId) - Number(b.matchId)
	);
}

// Seasons present, most recently played first.
export function seasonsOf(matches) {
	const latest = new Map();
	for (const m of matches) {
		if (!m.season) continue;
		if ((m.playedAt ?? "") > (latest.get(m.season) ?? "")) latest.set(m.season, m.playedAt ?? "");
	}
	return [...latest].sort((a, b) => b[1].localeCompare(a[1])).map(([season]) => season);
}

// "season-4-vendetta" → "Season 4 Vendetta"
export function seasonLabel(slug) {
	return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// The season a match belongs to: its stored slug, or — for rows saved before
// seasons were stored — the season (from EloShowdown's list) whose start/end
// contain the match's date. Works for stored items and elo-history points.
export function seasonOfMatch(m, seasons = []) {
	if (m.season) return m.season;
	const at = m.playedAt ?? m.date;
	if (!at) return null;
	return seasons.find(s => (!s.start || at >= s.start) && (!s.end || at <= s.end))?.slug ?? null;
}

// season / legend of null mean "all". `seasons` (EloShowdown's list) places
// rows that have no stored season by their date.
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
	return { season, matches: season ? matches.filter(m => m.season === season) : matches };
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

// The opponent you've played most, by EloShowdown id (name as a fallback).
export function mostPlayedOpponent(matches) {
	const top = recordsBy(matches, m => m.opponentId ?? m.opponent)[0];
	if (!top) return null;
	const latest = sortChronological(matches.filter(m => (m.opponentId ?? m.opponent) === top.key)).at(-1);
	return { ...top, name: latest?.opponent ?? top.key };
}
