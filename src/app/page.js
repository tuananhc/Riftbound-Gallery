import { getAllCards } from "../lib/cards/cards";
import CardGrid from "../components/cards/CardGrid";

export default async function CardsPage() {
	const cards = await getAllCards();
	return <CardGrid initialCards={cards} />;
}
