import "server-only";

// EloShowdown stopped updating when Riftbound's events moved from UVS to
// PlayRiftbound (October 2026); match history now comes from BoundRift
// (lib/boundrift.js). This is only used to move accounts linked before then:
// an EloShowdown player's `riftbound_id` is their UVS player id, which is also
// their BoundRift id.

const ELO_BASE = "https://eloshowdown.com/api/v1";

// The BoundRift id for an EloShowdown player id, or null when they have none.
export async function boundriftIdFor(eloPlayerId) {
	const res = await fetch(`${ELO_BASE}/players/${eloPlayerId}`, { next: { revalidate: 30 * 86400 } });
	if (!res.ok) throw new Error(`EloShowdown ${res.status} for player ${eloPlayerId}`);
	const player = await res.json();
	return player.riftbound_id ? String(player.riftbound_id) : null;
}
