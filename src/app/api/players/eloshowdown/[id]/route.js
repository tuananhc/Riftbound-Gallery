import { NextResponse } from "next/server";
import { boundriftIdFor } from "../../../../../lib/eloshowdown";

export const runtime = "nodejs";

// GET /api/players/eloshowdown/36298 → { boundriftId: "23284" | null } — moves
// an account linked through EloShowdown over to BoundRift.
export async function GET(request, { params }) {
	const { id } = await params;
	if (!/^\d{1,12}$/.test(id)) {
		return NextResponse.json({ error: "Player id must be numeric." }, { status: 400 });
	}
	try {
		return NextResponse.json({ boundriftId: await boundriftIdFor(id) });
	} catch {
		return NextResponse.json({ error: "EloShowdown didn't answer." }, { status: 502 });
	}
}
