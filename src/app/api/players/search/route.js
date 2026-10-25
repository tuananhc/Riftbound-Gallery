import { NextResponse } from "next/server";
import { searchPlayers } from "../../../../lib/boundrift";

export const runtime = "nodejs";

const MAX_RESULTS = 20;

// GET /api/players/search?q=Carrot — BoundRift players by name.
// → [{ id, display_name, real_name, event_count, legend }]
export async function GET(request) {
	const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
	if (q.length < 2 || q.length > 64) {
		return NextResponse.json({ error: "Search with 2–64 characters." }, { status: 400 });
	}
	try {
		const results = await searchPlayers(q);
		return NextResponse.json(results.slice(0, MAX_RESULTS).map(p => ({
			id: String(p.playerId),
			display_name: p.mostRecentUsername ?? p.realName,
			real_name: p.realName,
			event_count: p.eventCount,
			legend: p.mostPlayedLegend,
		})));
	} catch {
		return NextResponse.json({ error: "BoundRift didn't answer — try again." }, { status: 502 });
	}
}
