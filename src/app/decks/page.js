import { getAllCards } from "../../lib/cards/cards";
import DeckSources from "../../components/decks/DeckSources";

export const metadata = {
	title: "Community Decks — Riftbound",
	description: "Browse popular decklists from the Riftbound community.",
};

function isBaseCard(id) {
	const match = id?.match(/-(\d+)[^/]*\/(\d+)/);
	if (!match) return true;
	return parseInt(match[1], 10) < parseInt(match[2], 10);
}

export default async function DecksPage() {
	let legends = [];
	try {
		const cards = await getAllCards();
		legends = cards
			.filter(c => c.card_type_text?.includes("Legend") && isBaseCard(c.id))
			.map(c => ({ id: c.id, name: c.name, image: c.image ?? null, tags_text: c.tags_text ?? "" }))
			.sort((a, b) => a.tags_text.localeCompare(b.tags_text));
	} catch {
		// DB not available — legend filter will show placeholder
	}
	return <DeckSources legends={legends} />;
}
