"use client";
import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "../lib/data";

// The active theme lives on <html data-theme="light">; no attribute means dark.
// layout.js applies the saved choice before first paint, so this hook only
// mirrors that attribute and flips it.
const listeners = new Set();

function subscribe(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

const getTheme = () => document.documentElement.dataset.theme === "light" ? "light" : "dark";

export function useTheme() {
	// The server can't see localStorage, so it renders dark; React re-renders
	// with the real theme straight after hydration.
	const theme = useSyncExternalStore(subscribe, getTheme, () => "dark");

	function toggleTheme() {
		const next = theme === "dark" ? "light" : "dark";
		if (next === "light") document.documentElement.dataset.theme = "light";
		else delete document.documentElement.dataset.theme;
		try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch {}
		listeners.forEach(l => l());
	}

	return { theme, toggleTheme };
}
