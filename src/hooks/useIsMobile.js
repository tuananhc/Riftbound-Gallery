"use client";
import { useSyncExternalStore } from "react";
import { MOBILE_MAX_WIDTH } from "../lib/data";

// True at phone width (≤ MOBILE_MAX_WIDTH). For structure that only exists on
// the client — sheets vs popovers, phone match rows. Anything server-rendered
// should switch with SHOW / LAYOUT tokens instead, which can't flash.
const QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

function subscribe(onChange) {
	const media = window.matchMedia(QUERY);
	media.addEventListener("change", onChange);
	return () => media.removeEventListener("change", onChange);
}

export function useIsMobile() {
	return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
