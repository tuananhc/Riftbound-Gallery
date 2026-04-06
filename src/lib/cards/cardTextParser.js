const DEFAULT_KEYWORD_STYLE = { background: "#6d6d6d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" };

const KEYWORD_STYLES = {
	"Action": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Reaction": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Ambush": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Hidden": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Legion": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Shield": { background: "#c23667", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Assault": { background: "#c23667", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Tank": { background: "#c23667", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Backline": { background: "#c23667", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Hunt": { background: "#99b03b", color: "#000", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Temporary": { background: "#99b03b", color: "#000", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Deflect": { background: "#99b03b", color: "#000", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Deathknell": { background: "#99b03b", color: "#000", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Legion": { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
	"Accelerate":  { background: "#1c745d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" },
};

export function parseCardText(text) {
	console.log(text);
	if (!text) return [];

	const segments = [];
	const regex = /\[([^\]]+)\]/g;
	let lastIndex = 0;
	let match;

	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
		}
		const keyword = match[1];
		const matchedKey = Object.keys(KEYWORD_STYLES).find(k => keyword.toLowerCase().includes(k.toLowerCase()));
		segments.push({
			type: "keyword",
			value: keyword,
			style: matchedKey ? KEYWORD_STYLES[matchedKey] : DEFAULT_KEYWORD_STYLE,
		});
		lastIndex = regex.lastIndex;
	}

	if (lastIndex < text.length) {
		segments.push({ type: "text", value: text.slice(lastIndex) });
	}

	return segments;
}
