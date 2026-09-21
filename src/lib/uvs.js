import "server-only";

// Resolves EloShowdown match timestamps to the UVS (Riftbound Gaming Network)
// event the player was in. The UVS API is undocumented but these read endpoints
// are public. EloShowdown's `riftbound_id` is the player's UVS player id, and an
// elo-history point's `date` is usually the event's `start_datetime`.

const UVS_BASE = "https://api.cloudflare.riftbound.uvsgames.com/hydraproxy";
export const UVS_EVENT_URL = "https://locator.riftbound.uvsgames.com/events";

// Events are searched within this radius of the player's community.
const SEARCH_RADIUS_MILES = 40;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_EVENT_PAGES = 5;
const CHECK_BATCH_SIZE = 5;

async function uvsGet(path) {
	const res = await fetch(`${UVS_BASE}${path}`, { next: { revalidate: 3600 } });
	if (!res.ok) throw new Error(`UVS ${res.status} for ${path}`);
	return res.json();
}

function isoDay(ms) {
	return new Date(ms).toISOString().slice(0, 10);
}

// Riftbound events near `location` starting between the two ISO days.
async function listEvents(fromDay, toDay, location) {
	const params = new URLSearchParams({
		game_slug: "riftbound",
		start_date_after: fromDay,
		start_date_before: toDay,
		latitude: location.latitude,
		longitude: location.longitude,
		num_miles: SEARCH_RADIUS_MILES,
		page_size: 100,
	});
	const events = [];
	for (let page = 1; page <= MAX_EVENT_PAGES; page++) {
		params.set("page", page);
		const data = await uvsGet(`/api/v2/events/?${params}`);
		events.push(...data.results);
		if (!data.next) break;
	}
	return events
		.filter(e => e.start_datetime)
		.map(e => ({ id: e.id, name: e.name, startDatetime: e.start_datetime }));
}

// Whether the player was paired (or given a bye) in the event's first round.
async function playerInEvent(eventId, riftboundId) {
	const event = await uvsGet(`/api/v2/events/${eventId}/`);
	const firstRound = (event.tournament_phases ?? [])
		.flatMap(p => p.rounds ?? [])
		.sort((a, b) => a.round_number - b.round_number)[0];
	if (!firstRound) return false;
	const matches = await uvsGet(`/api/v2/tournament-rounds/${firstRound.id}/matches/paginated/?page_size=1000`);
	return matches.results.some(m =>
		m.player_match_relationships.some(r => String(r.player?.id) === riftboundId)
	);
}

// Map each timestamp to { id, name, startDatetime, url } or null when no event
// near `location` ({ latitude, longitude }) containing the player started in
// the 24h before it.
export async function findPlayerEvents(riftboundId, timestamps, location) {
	const eventsByDay = new Map();
	const membership = new Map();

	function eventsAround(ms) {
		const day = isoDay(ms);
		if (!eventsByDay.has(day)) {
			eventsByDay.set(day, listEvents(isoDay(ms - DAY_MS), isoDay(ms + DAY_MS), location));
		}
		return eventsByDay.get(day);
	}

	function checkMembership(eventId) {
		if (!membership.has(eventId)) {
			membership.set(eventId, playerInEvent(eventId, riftboundId).catch(() => false));
		}
		return membership.get(eventId);
	}

	async function resolve(timestamp) {
		const ms = Date.parse(timestamp);
		if (Number.isNaN(ms)) return null;
		const events = await eventsAround(ms);
		// Events that started at most a day before the match; an exact start-time
		// match first, then the most recently started.
		const candidates = events
			.map(e => ({ ...e, startMs: Date.parse(e.startDatetime) }))
			.filter(e => e.startMs <= ms && ms - e.startMs <= DAY_MS)
			.sort((a, b) => b.startMs - a.startMs);

		for (let i = 0; i < candidates.length; i += CHECK_BATCH_SIZE) {
			const batch = candidates.slice(i, i + CHECK_BATCH_SIZE);
			const found = await Promise.all(batch.map(e => checkMembership(e.id)));
			const hit = batch.find((_, j) => found[j]);
			if (hit) return { id: hit.id, name: hit.name, startDatetime: hit.startDatetime, url: `${UVS_EVENT_URL}/${hit.id}` };
		}
		return null;
	}

	const entries = await Promise.all(timestamps.map(async t => [t, await resolve(t).catch(() => null)]));
	return Object.fromEntries(entries);
}
