import Image from "next/image";
import { runeIconPng } from "../../lib/cards/data";

// Row of rune icons for a card's domains, e.g. ["Mind", "Chaos"], using the
// PNGs on S3 (resources/Rune_<Domain>.png).
export default function RuneIcons({ domains, size = 14 }) {
	if (!domains?.length) return null;
	return (
		<span style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
			{domains.map(d => (
				<Image key={d} src={runeIconPng(d)} alt={d} title={d} width={size} height={size} />
			))}
		</span>
	);
}
