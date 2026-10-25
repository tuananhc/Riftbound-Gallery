import { NextResponse } from "next/server";
import { resolvePlayerEvents } from "../../../../lib/playerEvents";

export const runtime = "nodejs";
// Learning stores and checking their events is a few dozen BoundRift reads on a
// cold cache.
export const maxDuration = 30;

const MONTH = /^\d{4}-\d{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}/;

// POST /api/events/resolve
// { playerId: "23284", months: ["2026-10"], pending: { "2026-10": ["br-1500402205"] },
//   events: ["2120000399"], seeds: [{ name, date }] }
// → { events: { "br-<matchId>": { id, name, date, url } }, stores: <number> }
// playerId is the BoundRift player id. See lib/playerEvents.js for how stores
// are learned from `events` and `seeds` and searched in `months`, and how
// `pending` (each month's matches still without an event) ends a month early.
export async function POST(request) {
	let body;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
	}
	const playerId = String(body?.playerId ?? "");
	if (!/^\d{1,12}$/.test(playerId)) {
		return NextResponse.json({ error: "playerId must be numeric." }, { status: 400 });
	}
	const list = v => (Array.isArray(v) ? v : []);
	const months = [...new Set(list(body.months).filter(m => MONTH.test(m)))];
	const events = [...new Set(list(body.events).map(String).filter(id => /^\d{1,12}$/.test(id)))];
	const seeds = list(body.seeds)
		.filter(s => typeof s?.name === "string" && s.name.trim() && DAY.test(s?.date ?? ""))
		.map(s => ({ name: s.name.trim().slice(0, 120), date: s.date }));
	const pending = Object.fromEntries(months.map(m => [m, list(body.pending?.[m]).filter(id => /^br-\d{1,12}$/.test(id)).slice(0, 200)])
		.filter(([, ids]) => ids.length));

	try {
		return NextResponse.json(await resolvePlayerEvents(playerId, { months, events, seeds, pending }));
	} catch {
		return NextResponse.json({ error: "BoundRift didn't answer — try again." }, { status: 502 });
	}
}
