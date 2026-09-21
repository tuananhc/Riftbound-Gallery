import "server-only";

// Server-side reads from the public EloShowdown API.

const ELO_BASE = "https://eloshowdown.com/api/v1";

async function eloGet(path) {
	const res = await fetch(`${ELO_BASE}${path}`, { next: { revalidate: 86400 } });
	if (!res.ok) throw new Error(`EloShowdown ${res.status} for ${path}`);
	return res.json();
}

// { id, display_name, riftbound_id, primary_community, primary_community_slug, country, ... }
export function getPlayer(playerId) {
	return eloGet(`/players/${playerId}`);
}

// { slug, name, country, state, player_count, is_active }
export function getCommunity(slug) {
	return eloGet(`/communities/${slug}`);
}
