import { NextResponse } from "next/server";
import { lookupEventLink } from "../../../../lib/playerEvents";

export const runtime = "nodejs";

// GET /api/events/lookup?link=<PlayRiftbound / UVS / BoundRift event link>&playerId=23284
// → { event: { id, name, date, url }, matches: { "br-<matchId>": event } }
// The player's run at a pasted event, so its matches get the event and its date.
export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const link = (searchParams.get("link") ?? "").slice(0, 500);
	const playerId = searchParams.get("playerId") ?? "";
	if (!/^\d{1,12}$/.test(playerId)) {
		return NextResponse.json({ error: "playerId must be numeric." }, { status: 400 });
	}
	try {
		const result = await lookupEventLink(link, playerId);
		return NextResponse.json(result, { status: result.error ? 404 : 200 });
	} catch {
		return NextResponse.json({ error: "BoundRift didn't answer — try again." }, { status: 502 });
	}
}
