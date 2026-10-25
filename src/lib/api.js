// Fetch wrappers for API Gateway. Every authenticated call attaches the Cognito
// ID token as a Bearer header; the JWT authorizer verifies it and the Lambda
// derives the user from `claims.sub`. Never call fetch() directly in a component.

const BASE = process.env.NEXT_PUBLIC_API_URL;

async function authFetch(path, token, options = {}) {
	if (!BASE) throw new Error("NEXT_PUBLIC_API_URL is not set.");
	if (!token) throw new Error("Not signed in.");
	const res = await fetch(`${BASE}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
			...(options.headers || {}),
		},
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.status === 204 ? null : res.json();
}

// The save Lambda takes at most 500 matches per request.
const SAVE_BATCH = 400;

// Persist one linked account's match history (with champion picks). The Lambda
// derives the userId from the verified JWT and keys each match by account +
// matchId. Long histories go in batches, one after another; every write is an
// upsert, so retrying after a failed batch is safe.
export async function saveMatchHistory(token, eloPlayerId, matches) {
	for (let i = 0; i < matches.length; i += SAVE_BATCH) {
		await authFetch("/history", token, {
			method: "POST",
			body: JSON.stringify({ eloPlayerId, matches: matches.slice(i, i + SAVE_BATCH) }),
		});
	}
}

// Stop following cursors after this many pages (200 matches each).
const MAX_HISTORY_PAGES = 20;

// One linked account's saved match history (MatchHistory items), following the
// Lambda's pagination cursor until every page is loaded.
export async function getMatchHistory(token, eloPlayerId) {
	const matches = [];
	let cursor = null;
	for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
		const params = new URLSearchParams({ eloPlayerId });
		if (cursor) params.set("cursor", cursor);
		const res = await authFetch(`/history?${params}`, token);
		matches.push(...res.matches);
		cursor = res.nextCursor;
		if (!cursor) break;
	}
	return matches;
}

// Stop following cursors after this many pages (100 drafts each).
const MAX_DRAFT_PAGES = 10;

// Every Nexus Night draft the caller has, across all linked accounts:
// [{ draftId, eloPlayerId, eventName, date, games: [...], createdAt, updatedAt }].
export async function getDrafts(token) {
	const drafts = [];
	let cursor = null;
	for (let page = 0; page < MAX_DRAFT_PAGES; page++) {
		const res = await authFetch(`/drafts${cursor ? `?${new URLSearchParams({ cursor })}` : ""}`, token);
		drafts.push(...res.drafts);
		cursor = res.nextCursor;
		if (!cursor) break;
	}
	return drafts;
}

// Create or replace one draft; resolves to the stored draft.
export function saveDraft(token, draft) {
	return authFetch(`/drafts/${encodeURIComponent(draft.draftId)}`, token, {
		method: "PUT",
		body: JSON.stringify(draft),
	});
}

export function deleteDraft(token, draftId) {
	return authFetch(`/drafts/${encodeURIComponent(draftId)}`, token, { method: "DELETE" });
}

// The caller's Users row, including `eloPlayers` (linked player accounts — see
// lambda/userProfile.mjs) and `activeEloPlayerId`.
export function getProfile(token) {
	return authFetch("/profile", token);
}

// Change the caller's linked accounts. Each resolves to { eloPlayers, activeEloPlayerId }.
function updateAccounts(token, body) {
	return authFetch("/profile", token, { method: "PUT", body: JSON.stringify(body) });
}

export function addEloAccount(token, player) {
	return updateAccounts(token, { action: "add", player });
}

export function selectEloAccount(token, id) {
	return updateAccounts(token, { action: "select", id });
}

export function removeEloAccount(token, id) {
	return updateAccounts(token, { action: "remove", id });
}

// ── BoundRift ────────────────────────────────────────────────────────────────
// Match history, Elo and events come from BoundRift through our own Next.js
// routes (src/app/api/players, src/app/api/events), not API Gateway. Public —
// no token. `playerId` is always the bare BoundRift id ("23284").

async function localFetch(path, options) {
	const res = await fetch(path, options);
	const body = await res.json().catch(() => null);
	if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
	return body;
}

// [{ id, display_name, real_name, event_count, legend }]
export function searchPlayers(query) {
	return localFetch(`/api/players/search?${new URLSearchParams({ q: query })}`);
}

// Every match the player has on BoundRift, oldest first (see
// src/lib/boundrift.js for the row shape).
export function getPlayerHistory(playerId) {
	return localFetch(`/api/players/${playerId}/history`);
}

// The BoundRift id for an account linked through EloShowdown, or null.
export async function findBoundriftId(eloPlayerId) {
	return (await localFetch(`/api/players/eloshowdown/${eloPlayerId}`)).boundriftId;
}

// Which event each match was played at, for matches in `months` ("YYYY-MM"),
// learning the player's stores from `events` (ids their rows already link to)
// and `seeds` ({ name, date } of events without one). `pending` maps each month
// to the ids of its matches still without an event, so the search can stop
// once they're found. Resolves to { events: { [matchId]: { id, name, date, url } }, stores }.
export function resolveEvents(playerId, { months, pending, events, seeds }) {
	return localFetch("/api/events/resolve", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ playerId, months, pending, events, seeds }),
	});
}

// A pasted event link → { event, matches: { [matchId]: event } }. Rejects with
// a message to show when the link isn't an event or the player isn't in it.
export function lookupEvent(link, playerId) {
	return localFetch(`/api/events/lookup?${new URLSearchParams({ link, playerId })}`);
}
