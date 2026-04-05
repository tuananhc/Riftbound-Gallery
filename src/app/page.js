import { getAllCards } from "../lib/cards";
import CardGrid from "../components/cards/CardGrid";

export default async function CardsPage() {
	const cards = await getAllCards();
	console.log("Fetched cards:", cards.length);
	return <CardGrid initialCards={cards} />;
}
