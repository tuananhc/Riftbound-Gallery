import { NextResponse } from "next/server";
import { getPlayerHistory } from "../../../../../lib/boundrift";

export const runtime = "nodejs";

// GET /api/players/23284/history — a BoundRift player's matches, oldest first:
// [{ match_id, month, season, result, opponent_name, opponent_id, elo_before,
//    elo_change, elo_after, score }] (see getPlayerHistory). Ids are "br-…".
export async function GET(request, { params }) {
	const { id } = await params;
	if (!/^\d{1,12}$/.test(id)) {
		return NextResponse.json({ error: "Player id must be numeric." }, { status: 400 });
	}
	try {
		const history = await getPlayerHistory(id);
		if (!history) return NextResponse.json({ error: "BoundRift has no player with that id." }, { status: 404 });
		return NextResponse.json(history);
	} catch {
		return NextResponse.json({ error: "BoundRift didn't answer — try again." }, { status: 502 });
	}
}
