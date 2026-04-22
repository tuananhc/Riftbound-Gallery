const validateAddCardToDeck = (card, deck) => {
	if (card.banned) {
		return { status: false, message: "This card is banned and cannot be added to the deck." };
	}

	const maxCopies = card.card_type_text?.includes("Legend") ? 1 : 3;
	const variantCount = deck
		.filter(e => e.card.name === card.name)
		.reduce((sum, e) => sum + e.count, 0);

	if (variantCount >= maxCopies) {
		return {
			status: false,
			message: `You can only have ${maxCopies} cop${maxCopies === 1 ? "y" : "ies"} of this card (including variants).`,
		};
	}

	// TODO: Only 1 legend
	// TODO: Only 3 battlefields
	// TODO: Only cards within the champion domains
	// TODO: Only 40 cards per main deck and 8 per sideboard
	// TODO: Only 12 runes per deck

	return { status: true };
};

export default validateAddCardToDeck;
