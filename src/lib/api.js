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

// Persist one linked account's match history (with champion picks). The Lambda
// derives the userId from the verified JWT and keys each match by account + matchId.
export function saveMatchHistory(token, eloPlayerId, matches) {
	return authFetch("/history", token, {
		method: "POST",
		body: JSON.stringify({ eloPlayerId, matches }),
	});
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

// The caller's Users row, including `eloPlayers` (linked EloShowdown accounts)
// and `activeEloPlayerId`.
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

// A player's EloShowdown elo-history ({ season_slug, points }), through the
// /api/elo rewrite in next.config.js. Public — no token. Without `season` it's
// the current season; pass a slug from getSeasons() for an earlier one.
export async function getEloHistory(playerId, season) {
	const query = season ? `?${new URLSearchParams({ season })}` : "";
	const res = await fetch(`/api/elo/players/${playerId}/elo-history${query}`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

// EloShowdown's seasons, newest first:
// [{ slug, name, start, end, is_current }] — end is null for the current one.
export async function getSeasons() {
	const res = await fetch("/api/elo/seasons");
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

// Resolve elo-history match dates to the UVS tournament the player was in.
// Served by our own Next.js route (src/app/api/tournaments), not API Gateway.
// `playerId` is the EloShowdown player id — the route finds their UVS id and city.
export async function getPlayerTournaments(playerId, dates) {
	const params = new URLSearchParams({ playerId, dates: dates.join(",") });
	const res = await fetch(`/api/tournaments?${params}`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}
