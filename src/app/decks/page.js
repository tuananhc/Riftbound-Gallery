import { getAllCards } from "../../lib/cards/cards";
import DeckSources from "../../components/decks/DeckSources";

export const metadata = {
	title: "Community Decks — Riftbound",
	description: "Browse popular decklists from the Riftbound community.",
};

export default async function DecksPage() {
	let legends = [];
	try {
		const cards = await getAllCards();
		legends = cards
			.filter(c => c.card_type_text?.includes("Legend"))
			.map(c => ({ id: c.id, name: c.name, image: c.image ?? null, tags_text: c.tags_text ?? "" }));
	} catch {
		// DB not available — legend filter will show placeholder
	}
	return <DeckSources legends={legends} />;
}
