// A guest's profile work — linked EloShowdown accounts, the active account's
// match history and the legend picks — kept in sessionStorage. It lasts for the
// tab: it survives moving between pages and signing in (the profile then links
// it to the account and loads it over the saved history), and is gone once the
// tab closes. Browser-only; every call is a no-op where storage is unavailable.

const KEY = "riftbound-guest-draft";

// → { accounts, activeId, history, picks } | null
export function readGuestDraft() {
	try {
		const draft = JSON.parse(sessionStorage.getItem(KEY));
		return Array.isArray(draft?.accounts) && draft.accounts.length ? draft : null;
	} catch {
		return null;
	}
}

// A draft with no accounts holds nothing worth keeping, so it clears instead.
export function writeGuestDraft(draft) {
	try {
		if (draft.accounts.length) sessionStorage.setItem(KEY, JSON.stringify(draft));
		else sessionStorage.removeItem(KEY);
	} catch {
		// storage full or blocked — the work stays on the page until it unmounts
	}
}

export function clearGuestDraft() {
	try {
		sessionStorage.removeItem(KEY);
	} catch {
		// nothing to clear
	}
}
