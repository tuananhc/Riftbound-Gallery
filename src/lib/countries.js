const COUNTRY_ISO = {
	"Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Argentina": "AR",
	"Australia": "AU", "Austria": "AT", "Belgium": "BE", "Bolivia": "BO",
	"Brazil": "BR", "Bulgaria": "BG", "Canada": "CA", "Chile": "CL",
	"China": "CN", "Colombia": "CO", "Croatia": "HR", "Czech Republic": "CZ",
	"Denmark": "DK", "Ecuador": "EC", "Egypt": "EG", "Finland": "FI",
	"France": "FR", "Germany": "DE", "Greece": "GR", "Hong Kong": "HK",
	"Hungary": "HU", "India": "IN", "Indonesia": "ID", "Ireland": "IE",
	"Israel": "IL", "Italy": "IT", "Japan": "JP", "Kenya": "KE",
	"Malaysia": "MY", "Mexico": "MX", "Morocco": "MA", "Netherlands": "NL",
	"New Zealand": "NZ", "Nigeria": "NG", "Norway": "NO", "Pakistan": "PK",
	"Paraguay": "PY", "Peru": "PE", "Philippines": "PH", "Poland": "PL",
	"Portugal": "PT", "Romania": "RO", "Russia": "RU", "Serbia": "RS",
	"Singapore": "SG", "Slovakia": "SK", "Slovenia": "SI", "South Africa": "ZA",
	"South Korea": "KR", "Spain": "ES", "Sweden": "SE", "Switzerland": "CH",
	"Taiwan": "TW", "Thailand": "TH", "Turkey": "TR", "UK": "GB",
	"Ukraine": "UA", "United Kingdom": "GB", "United States": "US", "Uruguay": "UY",
	"USA": "US", "Venezuela": "VE", "Vietnam": "VN",
};

export function countryFlag(name) {
	const code = COUNTRY_ISO[name];
	if (!code) return "🌐";
	return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}
