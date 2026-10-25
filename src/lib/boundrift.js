import "server-only";
import { scoreOptions, seasonAt, SEASONS } from "./matchStats";

// Server-side reads from BoundRift (boundrift.com), through the JSON endpoints
// its own site uses — there's no documented API. BoundRift rates every
// constructed match from UVS Games' event locator (events before October 2026)
// and Riot's PlayRiftbound event site (after), and merges a player's Riot
// account into their old UVS record, so one player id covers both. Its terms
// only rule out traffic heavy enough to degrade the site, so every read here is
// cached and the callers keep their request counts small.
//
// Ids handed to the browser are prefixed "br-" (see isBoundriftId in
// matchStats.js); the BoundRift API itself takes the bare number.

const BASE = "https://boundrift.com/api";

const HOUR = 60 * 60;
const MATCH_PAGE_SIZE = 100;
const MAX_MATCH_PAGES = 20;
const MAX_EVENT_PAGES = 5;

// null on 404 — BoundRift's answer for "no such player / not in that event".
async function brGet(path, revalidate) {
	const res = await fetch(`${BASE}${path}`, {
		headers: { "User-Agent": "riftbound-card-database" },
		next: { revalidate },
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`BoundRift ${res.status} for ${path}`);
	return res.json();
}

const RESULTS = { W: "win", L: "loss", D: "draw" };

// [{ playerId, realName, mostRecentUsername, eventCount, mostPlayedLegend }]
export async function searchPlayers(query) {
	const data = await brGet(`/players/search?${new URLSearchParams({ q: query })}`, HOUR);
	return data?.results ?? [];
}

// Every match the player has had rated, per set, oldest first:
// { bySet: [{ setName, history: [{ matchId, ratingBefore, ratingAfter, opponentId, opponentName, result }] }] }
function getRatingHistory(playerId) {
	return brGet(`/players/${playerId}/rating-history`, 10 * 60);
}

// The player's match list, newest first. Only goes back to May 2026, but it's
// the only place with a month and game score per match, and it includes
// matches that aren't rated (sealed events).
async function getMatches(playerId) {
	const matches = [];
	for (let page = 0; page < MAX_MATCH_PAGES; page++) {
		const data = await brGet(`/players/${playerId}/matches?limit=${MATCH_PAGE_SIZE}&offset=${page * MATCH_PAGE_SIZE}`, 10 * 60);
		matches.push(...(data?.matches ?? []));
		if (!data || data.matches.length < MATCH_PAGE_SIZE) break;
	}
	return matches;
}

// One match as a history row: { match_id, month, season, result, opponent_name,
// opponent_id, elo_before, elo_change, elo_after, score }. Elo is rounded the
// way BoundRift shows it, and the change is taken from the rounded values so
// consecutive rows chain. `rated` is the rating-history entry, `listed` the
// match-list entry; either may be missing.
function toRow(rated, listed, season) {
	const m = rated ?? listed;
	const result = RESULTS[m.result];
	const score = listed?.gamesWon != null ? `${listed.gamesWon}-${listed.gamesLost}` : null;
	const row = {
		match_id: `br-${m.matchId}`,
		season,
		result,
		opponent_name: m.opponentName,
		opponent_id: m.opponentId != null ? `br-${m.opponentId}` : undefined,
	};
	if (listed?.month) row.month = listed.month;
	if (score && scoreOptions(result).includes(score)) row.score = score;
	if (rated) {
		row.elo_before = Math.round(rated.ratingBefore);
		row.elo_after = Math.round(rated.ratingAfter);
		row.elo_change = row.elo_after - row.elo_before;
	}
	return row;
}

const seasonOrder = name => SEASONS.findIndex(s => s.slug === name);

// A player's whole history, oldest first, or null when BoundRift doesn't know
// them. Rated matches carry Elo; matches from before May 2026 have no month.
export async function getPlayerHistory(playerId) {
	const [ratings, listed] = await Promise.all([getRatingHistory(playerId), getMatches(playerId)]);
	if (!ratings) return null;
	const byId = new Map(listed.map(m => [m.matchId, m]));
	const rows = [];
	const rated = new Set();
	for (const set of ratings.bySet ?? []) {
		for (const h of set.history) {
			rated.add(h.matchId);
			rows.push(toRow(h, byId.get(h.matchId), set.setName));
		}
	}
	for (const m of listed) {
		if (!rated.has(m.matchId)) rows.push(toRow(null, m, seasonAt(m.month)));
	}
	const num = row => Number(row.match_id.slice(3));
	return rows.sort((a, b) => seasonOrder(a.season) - seasonOrder(b.season) || num(a) - num(b));
}

// { id, name, startDatetime, latitude, longitude, storeName, source, ... }
export function getEvent(eventId) {
	return brGet(`/events/${eventId}`, 24 * HOUR);
}

// A player's run at one event — { matches: [{ matchId, isBye, roundNumber, ... }] } —
// or null when they weren't in it.
export function getEventRun(eventId, playerId) {
	return brGet(`/events/${eventId}/players/${playerId}/matches`, 6 * HOUR);
}

// Every kind of event a match can come from. BoundRift's search only returns
// skirmishes unless asked.
const EVENT_CATEGORIES = "skirmish,nexus_nights,showdown,regional,other,open_play,casual,learn_to_play,pre_rift";

// Events that started within `miles` of a point between two YYYY-MM-DD days.
// BoundRift adds every regional, wherever and whenever it is — callers filter.
export async function nearbyEvents({ latitude, longitude }, miles, from, to) {
	const events = [];
	for (let page = 1; page <= MAX_EVENT_PAGES; page++) {
		const params = new URLSearchParams({ lat: latitude, lng: longitude, miles, page, timeframe: "past", from, to, category: EVENT_CATEGORIES });
		const data = await brGet(`/skirmishes/nearby-local?${params}`, HOUR);
		events.push(...(data?.results ?? []));
		if (!data?.nextPage) break;
	}
	return events;
}

// Events whose name matches: [{ id, name, location, startDatetime }]
export async function searchEvents(query) {
	const data = await brGet(`/events/search?${new URLSearchParams({ q: query })}`, 24 * HOUR);
	return data?.results ?? [];
}

// A PlayRiftbound tournament id → BoundRift's event ({ id, name, startDatetime }),
// or null when BoundRift hasn't picked it up yet (that can take up to a week).
export function findPlayriftboundEvent(tournamentId) {
	return brGet(`/events/playriftbound/${tournamentId}`, HOUR);
}
