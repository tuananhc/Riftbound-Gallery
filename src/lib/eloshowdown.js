import "server-only";

// EloShowdown (eloshowdown.com) rates the same UVS / PlayRiftbound matches as
// BoundRift (lib/boundrift.js). A player from the UVS days has their UVS player
// id as `riftbound_id`, which is also their BoundRift id; one who started on
// PlayRiftbound has a Riot UUID there, which BoundRift doesn't show, so they're
// found by name (see findPlayer). Match history comes from BoundRift;
// EloShowdown is read for two things BoundRift lacks:
//   - the BoundRift id of an account linked through EloShowdown before the switch
//   - the date of each match (BoundRift only gives its month), see getMatchDates
// EloShowdown went three weeks without updating in October 2026, so nothing
// here is relied on: callers carry on without it.
//
// Anonymous use is 60 requests an hour per IP; ELOSHOWDOWN_API_KEY (issued by
// EloShowdown, see eloshowdown.com/api) raises that to 1000. Its data changes
// once a day, so every read is cached for hours.

const ELO_BASE = "https://eloshowdown.com/api/v1";
const DAY = 24 * 60 * 60;
// Long histories sometimes arrive cut off, and a slow EloShowdown mustn't hold
// up the BoundRift history it's added to.
const TIMEOUT_MS = 6000;

// The parsed JSON, or null on 404. A body that doesn't parse (cut off) is
// fetched once more past the cache, so a broken copy isn't served for hours.
async function eloGet(path, revalidate) {
	const key = process.env.ELOSHOWDOWN_API_KEY;
	const headers = { "User-Agent": "riftbound-card-database", ...(key && { Authorization: `Bearer ${key}` }) };
	for (const cache of [{ next: { revalidate } }, { cache: "no-store" }]) {
		const res = await fetch(`${ELO_BASE}${path}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), ...cache });
		if (res.status === 404) return null;
		if (!res.ok) throw new Error(`EloShowdown ${res.status} for ${path}`);
		try {
			return JSON.parse(await res.text());
		} catch {
			// Cut off — try again uncached.
		}
	}
	throw new Error(`EloShowdown sent a broken response for ${path}`);
}

// The BoundRift id for an EloShowdown player id, or null when they have none.
export async function boundriftIdFor(eloPlayerId) {
	const player = await eloGet(`/players/${eloPlayerId}`, 30 * DAY);
	return player?.riftbound_id ? String(player.riftbound_id) : null;
}

const MAX_NAMESAKES = 3;

// The EloShowdown ids that may be this BoundRift player: theirs by
// `riftbound_id` when they're from UVS — a player who started on PlayRiftbound
// has a Riot UUID there instead, so then everyone named one of `names` (their
// BoundRift names). The caller works out which namesake it is from the matches.
// → { ids, sure }
export async function findPlayer(boundriftId, names = []) {
	const player = await eloGet(`/lookup?${new URLSearchParams({ riftbound_id: boundriftId })}`, 7 * DAY);
	if (player?.id) return { ids: [String(player.id)], sure: true };
	const wanted = new Set(names.filter(Boolean).map(n => n.trim().toLowerCase()));
	const ids = new Set();
	for (const name of wanted) {
		const hits = await eloGet(`/search?${new URLSearchParams({ q: name })}`, DAY);
		for (const h of hits ?? []) {
			if (h.display_name?.trim().toLowerCase() === name) ids.add(String(h.id));
		}
	}
	return { ids: [...ids].slice(0, MAX_NAMESAKES), sure: false };
}

// Every match EloShowdown has rated for one of its players, oldest first:
// [{ match_id, date, result, opponent_name }] — `date` is the start of the
// event the match was played at.
export async function getMatchDates(eloPlayerId) {
	const history = await eloGet(`/players/${eloPlayerId}/elo-history?season=all`, DAY / 4);
	return (history?.points ?? [])
		.filter(p => p.date && p.result && p.opponent_name)
		.map(p => ({ match_id: String(p.match_id), date: p.date, result: p.result, opponent_name: p.opponent_name }));
}
