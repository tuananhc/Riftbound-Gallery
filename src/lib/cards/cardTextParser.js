import { KEYWORD_STYLES } from "./data";

const DEFAULT_KEYWORD_STYLE = { background: "#6d6d6d", color: "#fff", textTransform: "uppercase", transform: "skewX(-12deg)" };

export function parseCardText(text) {
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

		// Level cards have ">" in their text which we don't want to parse as a keyword
		if (keyword === ">") {
			lastIndex = regex.lastIndex;
			continue;
		}

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
