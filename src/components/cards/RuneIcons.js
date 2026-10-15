import Image from "next/image";
import { COLOR_CONFIG } from "../../lib/cards/data";

// Row of rune icons for a card's domains, e.g. ["Mind", "Chaos"]. The SVGs
// come from S3 (resources/Rune_<Domain>.svg) via COLOR_CONFIG.
export default function RuneIcons({ domains, size = 14 }) {
	if (!domains?.length) return null;
	return (
		<span style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
			{domains.map(d => (
				<Image key={d} src={COLOR_CONFIG[d].icon} alt={d} title={d} width={size} height={size} />
			))}
		</span>
	);
}
