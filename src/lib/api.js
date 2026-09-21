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

// Resolve elo-history match dates to the UVS tournament the player was in.
// Served by our own Next.js route (src/app/api/tournaments), not API Gateway.
// `playerId` is the EloShowdown player id — the route finds their UVS id and city.
export async function getPlayerTournaments(playerId, dates) {
	const params = new URLSearchParams({ playerId, dates: dates.join(",") });
	const res = await fetch(`/api/tournaments?${params}`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}
