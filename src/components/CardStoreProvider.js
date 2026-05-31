"use client";
import { createContext, useContext, useState } from "react";

const CardContext = createContext({ cards: [], setCards: () => {} });

export function CardStoreProvider({ children }) {
	const [cards, setCards] = useState([]);
	return (
		<CardContext.Provider value={{ cards, setCards }}>
			{children}
		</CardContext.Provider>
	);
}

export function useCards() {
	return useContext(CardContext).cards;
}

export function useSetCards() {
	return useContext(CardContext).setCards;
}
