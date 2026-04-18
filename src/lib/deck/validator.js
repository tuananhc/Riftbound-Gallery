const validateAddCardToDeck = (card, deck) => {
	if (card.banned) {
		return { status: false, message: "This card is banned and cannot be added to the deck." };
	}

	// IDEA: the first 2 cards are always legend and chosen chamption

	// TODO: Add count check (max 3 - even for AA and ON/signature arts - i.e., compare the first 3 id digits only)

	// TODO: Only 1 legend

	// TODO: Only 3 battlefields

	// TODO: Only cards within the champion domains

	// TODO: Only 40 cards per main deck and 8 cards per sideboard

	// TODO: Only 12 runes per deck

	return { status: true };
};

export default validateAddCardToDeck