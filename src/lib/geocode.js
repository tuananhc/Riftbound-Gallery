import "server-only";

// Place name → coordinates via OpenStreetMap Nominatim. Their usage policy asks
// for an identifying User-Agent and at most 1 request/second; results are cached
// for 30 days, and a community's location doesn't change.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocode(place) {
	const params = new URLSearchParams({ q: place, format: "json", limit: 1 });
	const res = await fetch(`${NOMINATIM_URL}?${params}`, {
		headers: { "User-Agent": "riftbound-card-database" },
		next: { revalidate: 60 * 60 * 24 * 30 },
	});
	if (!res.ok) return null;
	const [hit] = await res.json();
	return hit ? { latitude: Number(hit.lat), longitude: Number(hit.lon) } : null;
}
