import { NextResponse } from "next/server";
import { getPlayer, getCommunity } from "../../../lib/eloshowdown";
import { geocode } from "../../../lib/geocode";
import { findPlayerEvents } from "../../../lib/uvs";

export const runtime = "nodejs";

const MAX_DATES = 30;

// Where the player's EloShowdown community is, e.g. "Albany, New York, USA".
// Null for communities that aren't a place (e.g. "Arena" / "International").
async function communityLocation(player) {
	if (!player.primary_community_slug) return null;
	const community = await getCommunity(player.primary_community_slug);
	if (!community.country || community.country === "International") return null;
	return geocode([community.name, community.state, community.country].filter(Boolean).join(", "));
}

// GET /api/tournaments?playerId=34502&dates=2026-09-20T00:00:00Z,...
// playerId is the EloShowdown player id; its riftbound_id and community decide
// whose UVS matches to look for and where.
// → { [date]: { id, name, startDatetime, url } | null }
export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const playerId = searchParams.get("playerId") ?? "";
	const dates = [...new Set((searchParams.get("dates") ?? "").split(",").filter(Boolean))];

	if (!/^\d+$/.test(playerId)) {
		return NextResponse.json({ error: "playerId must be numeric." }, { status: 400 });
	}
	if (dates.length === 0 || dates.length > MAX_DATES) {
		return NextResponse.json({ error: `Provide 1–${MAX_DATES} dates.` }, { status: 400 });
	}

	const notFound = Object.fromEntries(dates.map(d => [d, null]));
	let player;
	try {
		player = await getPlayer(playerId);
	} catch {
		return NextResponse.json({ error: "Player not found on EloShowdown." }, { status: 404 });
	}
	if (!player.riftbound_id) return NextResponse.json(notFound);

	const location = await communityLocation(player).catch(() => null);
	if (!location) return NextResponse.json(notFound);

	const events = await findPlayerEvents(String(player.riftbound_id), dates, location);
	return NextResponse.json(events);
}
