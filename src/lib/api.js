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

// Persist the user's match history (with champion picks). The Lambda derives the
// userId from the verified JWT and upserts each match keyed by matchId.
export function saveMatchHistory(token, matches) {
	return authFetch("/history", token, {
		method: "POST",
		body: JSON.stringify({ matches }),
	});
}
