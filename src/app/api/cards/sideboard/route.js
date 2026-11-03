import { NextResponse } from "next/server";
import { getSideboardCards } from "../../../../lib/cards/cards";

export const runtime = "nodejs";
export const revalidate = 3600;

// GET /api/cards/sideboard — what the sideboard notes pick from, by name:
// { cards: [{ id, name, image, type, cost, domains }], battlefields: [{ id, name, image }] }.
// Loaded only when the Sideboard Notes tab opens, so the profile page stays light.
export async function GET() {
	try {
		return NextResponse.json(await getSideboardCards());
	} catch (err) {
		console.error("sideboard cards failed", err);
		return NextResponse.json({ error: "Couldn't load the card list." }, { status: 502 });
	}
}
