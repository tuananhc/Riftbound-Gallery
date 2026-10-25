import "server-only";
import { findPlayriftboundEvent, getEvent, getEventRun, nearbyEvents, searchEvents } from "./boundrift";
import { EVENT_URL } from "./history";

// Finds the event each of a player's BoundRift matches was played at.
// BoundRift's player pages only give a match's month, never its day or event,
// and checking every event near a player is hundreds of requests a month in a
// busy city. So this learns the stores the player plays at — from events their
// rows are already linked to, and from event names + dates (rows saved before
// the switch, Nexus Night drafts) — and checks those stores' events first,
// then other events close by while the month's budget lasts. An event's run
// then gives the ids of every match the player had there.
//
// Events are linked to BoundRift's page for them, which works for UVS and
// PlayRiftbound events alike.

const MILES = 1; // radius searched around a store
const STORE_KM = 0.3; // an event this close to a store is at that store
const AREA_KM = 1.6; // other events this close are checked after the store's own
const REGIONAL_KM = 150; // regionals are at venues, not stores
const DAY_MS = 24 * 60 * 60 * 1000;
const SEED_MILES = 25; // how far from the main store a seed's event is looked for by time
const SEED_HOURS = 2;
const MAX_KNOWN = 20;
const MAX_SEEDS = 8;
const MAX_TIMED_SEEDS = 4;
const MAX_STORES = 4;
const MAX_MONTHS = 3;
// Events checked per month at most. A city centre can have 70+ events a month
// within a mile, so the stores' own events go first and a month stops as soon
// as its matches are all found.
const MONTH_BUDGET = 24;
const CONCURRENCY = 4;

// Run `fn` over `items`, at most `limit` at a time; failures become null.
async function mapLimit(items, limit, fn) {
	const out = new Array(items.length);
	let next = 0;
	async function worker() {
		while (next < items.length) {
			const i = next++;
			out[i] = await fn(items[i]).catch(() => null);
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return out;
}

function km(a, b) {
	const rad = d => (d * Math.PI) / 180;
	const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2
		+ Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
	return 12742 * Math.asin(Math.sqrt(h));
}

const hasPlace = e => typeof e?.latitude === "number" && typeof e?.longitude === "number";

// { id, name, date, url } — what a history row keeps.
export function toEvent(e) {
	return { id: String(e.id), name: e.name, date: e.startDatetime, url: `${EVENT_URL}/${e.id}` };
}

// matchId ("br-…") → event, for every non-bye match in the player's run.
function runMatches(run, event) {
	const found = {};
	for (const m of run?.matches ?? []) {
		if (!m.isBye && m.matchId != null) found[`br-${m.matchId}`] = event;
	}
	return found;
}

// Events whose name matches a seed and that started within a day of its date.
async function eventsForSeed({ name, date }) {
	const at = Date.parse(date);
	if (!name || Number.isNaN(at)) return [];
	const hits = await searchEvents(name);
	return hits.filter(e => Math.abs(Date.parse(e.startDatetime) - at) <= DAY_MS).slice(0, 3);
}

// Stores, busiest first, from events the player is known to have played.
function storesOf(events) {
	const stores = [];
	for (const e of events.filter(hasPlace)) {
		const near = stores.find(s => km(s, e) <= STORE_KM);
		if (near) near.count++;
		else stores.push({ latitude: e.latitude, longitude: e.longitude, count: 1 });
	}
	return stores.sort((a, b) => b.count - a.count).slice(0, MAX_STORES);
}

// "2026-10" → ["2026-09-30", "2026-11-01"]: a day either side, since a match's
// month and an event's start can fall either side of midnight UTC.
function monthWindow(month) {
	const [y, m] = month.split("-").map(Number);
	const day = t => new Date(t).toISOString().slice(0, 10);
	return [day(Date.UTC(y, m - 1, 1) - DAY_MS), day(Date.UTC(y, m, 1))];
}

// Events in a "YYYY-MM" month to check, in order: those at the player's stores
// (and regionals in reach of their main store), then other events close by,
// nearest first. Within each, oldest first.
async function candidates(stores, month, skip) {
	const [from, to] = monthWindow(month);
	const lists = await mapLimit(stores, CONCURRENCY, store => nearbyEvents(store, MILES, from, to));
	const out = new Map();
	for (const e of lists.flat()) {
		const day = e?.startDatetime?.slice(0, 10);
		if (!e || out.has(e.id) || skip.has(String(e.id)) || !hasPlace(e) || e.source === "loltcg" || !day || day < from || day > to) continue;
		const distance = Math.min(...stores.map(s => km(s, e)));
		if (e.eventCategory === "regional") {
			if (km(stores[0], e) <= REGIONAL_KM) out.set(e.id, { e, distance: 0 });
		} else if (distance <= AREA_KM) {
			out.set(e.id, { e, distance: distance <= STORE_KM ? 0 : distance });
		}
	}
	return [...out.values()]
		.sort((a, b) => a.distance - b.distance || a.e.startDatetime.localeCompare(b.e.startDatetime))
		.map(c => c.e);
}

// Events within SEED_HOURS of a seed's time near the player's main store. For
// seeds whose name search came up empty: BoundRift's search returns only the 10
// newest matches, so a stock name like "Monday Evening Nexus Nights - 1v1",
// used by hundreds of stores, rarely reaches the right one.
async function eventsAtSeedTime(store, { date }) {
	const at = Date.parse(date);
	const day = t => new Date(t).toISOString().slice(0, 10);
	const list = await nearbyEvents(store, SEED_MILES, day(at - DAY_MS), day(at + DAY_MS));
	return list.filter(e => e.source !== "loltcg" && Math.abs(Date.parse(e.startDatetime) - at) <= SEED_HOURS * 60 * 60 * 1000);
}

// → { events: { "br-<matchId>": { id, name, date, url } }, stores }, where
// `events` are ids of events the player's rows already link to (newest first),
// `seeds` are { name, date } pairs from rows and drafts without one, `months`
// are the "YYYY-MM" months still to look through, and `pending` maps a month to
// the ids of its matches still without an event — once they're all found, the
// month stops.
export async function resolvePlayerEvents(playerId, { events = [], seeds = [], months = [], pending = {} }) {
	const found = {};
	// Events already linked or already checked, so none is checked twice.
	const seen = new Set(events.map(String));
	// Events the player played, with where they were — what stores are learned from.
	const played = [];

	// The events in `list` the player was in; their matches go into `found`.
	async function keepPlayed(list) {
		const fresh = [...new Map(list.filter(e => !seen.has(String(e.id))).map(e => [String(e.id), e])).values()];
		fresh.forEach(e => seen.add(String(e.id)));
		const runs = await mapLimit(fresh, CONCURRENCY, e => getEventRun(e.id, playerId));
		const hits = fresh.filter((_, i) => runs[i]);
		const placed = await mapLimit(hits, CONCURRENCY, e => (hasPlace(e) ? Promise.resolve(e) : getEvent(e.id)));
		hits.forEach((e, i) => Object.assign(found, runMatches(runs[fresh.indexOf(e)], toEvent(placed[i] ?? e))));
		played.push(...placed.filter(Boolean));
		return hits;
	}

	const tried = seeds.slice(0, MAX_SEEDS);
	const [linked, seedHits] = await Promise.all([
		mapLimit([...seen].slice(0, MAX_KNOWN), CONCURRENCY, getEvent),
		mapLimit(tried, CONCURRENCY, eventsForSeed),
	]);
	played.push(...linked.filter(Boolean));

	// A seed only counts once the player turns out to be in the event.
	const hit = new Set((await keepPlayed(seedHits.flat().filter(Boolean))).map(e => String(e.id)));
	// Only seeds with a time (rows saved before BoundRift) — a draft has just a day.
	const missed = tried.filter((s, i) => s.date.length > 10 && !(seedHits[i] ?? []).some(e => hit.has(String(e.id))));
	let stores = storesOf(played);
	if (stores.length && missed.length) {
		const near = await mapLimit(missed.slice(0, MAX_TIMED_SEEDS), CONCURRENCY, seed => eventsAtSeedTime(stores[0], seed));
		await keepPlayed(near.flat().filter(Boolean));
		stores = storesOf(played);
	}

	// A month at a time, a few events at a time, so a month whose matches have
	// all turned up stops early.
	for (const month of stores.length ? months.slice(0, MAX_MONTHS) : []) {
		const left = () => (pending[month] ?? []).filter(id => !found[id]);
		if (pending[month] && !left().length) continue;
		const list = (await candidates(stores, month, seen)).slice(0, MONTH_BUDGET);
		for (let i = 0; i < list.length && (!pending[month] || left().length); i += CONCURRENCY) {
			await keepPlayed(list.slice(i, i + CONCURRENCY));
		}
	}
	return { events: found, stores: stores.length };
}

const TOURNAMENT_ID = /^[1-9]\d{15,19}$/;

// A pasted event link or id → { playriftbound: tournamentId } or { id }.
// PlayRiftbound tournament ids are 16–20 digits; anything shorter is a
// BoundRift event id, which for UVS events is the UVS id.
export function parseEventLink(text) {
	const value = String(text ?? "").trim();
	let digits = value;
	if (/^https?:\/\//i.test(value)) {
		let url;
		try {
			url = new URL(value);
		} catch {
			return null;
		}
		digits = url.pathname.match(/\/events\/(\d+)/i)?.[1] ?? "";
		if (/(^|\.)playriftbound\.com$/i.test(url.hostname)) {
			return TOURNAMENT_ID.test(digits) ? { playriftbound: digits } : null;
		}
	}
	if (TOURNAMENT_ID.test(digits)) return { playriftbound: digits };
	return /^\d{1,12}$/.test(digits) ? { id: digits } : null;
}

// A pasted link → { event, matches: { "br-<matchId>": event } }, or { error }.
export async function lookupEventLink(link, playerId) {
	const parsed = parseEventLink(link);
	if (!parsed) return { error: "That doesn't look like an event link — paste the event page's address from PlayRiftbound, UVS or BoundRift." };
	let eventId = parsed.id;
	if (parsed.playriftbound) {
		const found = await findPlayriftboundEvent(parsed.playriftbound);
		if (!found) return { error: "BoundRift hasn't picked up that PlayRiftbound event yet — new events can take up to a week. Try again later." };
		eventId = found.id;
	}
	const [event, run] = await Promise.all([getEvent(eventId), getEventRun(eventId, playerId)]);
	if (!event) return { error: "BoundRift has no event with that link." };
	if (!run) return { error: `You're not in the pairings for ${event.name}.` };
	const shaped = toEvent(event);
	return { event: shaped, matches: runMatches(run, shaped) };
}
