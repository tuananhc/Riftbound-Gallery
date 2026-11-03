import { NextResponse } from "next/server";
import { getPlayerHistory, getPlayerNames } from "../../../../../lib/boundrift";
import { findPlayer, getMatchDates } from "../../../../../lib/eloshowdown";
import { pairDates, withDates } from "../../../../../lib/history";

export const runtime = "nodejs";

// GET /api/players/23284/history — a BoundRift player's matches, oldest first:
// [{ match_id, month, season, result, opponent_name, opponent_id, elo_before,
//    elo_change, elo_after, score, date }] (see getPlayerHistory). Ids are "br-…".
// `date` comes from EloShowdown, on the matches it has (and those played next
// to them); without EloShowdown the rows only know their month.
export async function GET(request, { params }) {
	const { id } = await params;
	if (!/^\d{1,12}$/.test(id)) {
		return NextResponse.json({ error: "Player id must be numeric." }, { status: 400 });
	}
	const [history, dateOf] = await Promise.all([
		getPlayerHistory(id).catch(() => undefined),
		eloShowdownDates(id).catch(() => new Map()),
	]);
	if (history === undefined) return NextResponse.json({ error: "BoundRift didn't answer — try again." }, { status: 502 });
	if (!history) return NextResponse.json({ error: "BoundRift has no player with that id." }, { status: 404 });
	return NextResponse.json(withDates(history, dateOf));
}

// match id → date from EloShowdown. A player found by name only counts when at
// least half of their EloShowdown matches pair with this player's BoundRift
// ones, so a namesake elsewhere adds nothing.
async function eloShowdownDates(id) {
	const history = await getPlayerHistory(id);
	if (!history?.length) return new Map();
	const { ids, sure } = await findPlayer(id, await getPlayerNames(id).catch(() => []));
	let best = new Map();
	for (const eloId of ids) {
		const dated = await getMatchDates(eloId);
		const dateOf = pairDates(history, dated);
		const enough = sure || dateOf.size >= Math.ceil(dated.length / 2);		if (enough && dateOf.size > best.size) best = dateOf;
	}
	return best;
}
