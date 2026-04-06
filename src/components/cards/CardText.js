import { parseCardText } from "../../lib/cards/cardTextParser";

export default function CardText({ text, style = {} }) {
	const segments = parseCardText(text);

	return (
		<span style={style}>
			{segments.map((seg, i) =>
				seg.type === "keyword" ? (
					<span key={i} style={{
						...seg.style,
						borderRadius: 3,
						padding: "1px 6px",
						fontSize: 11,
						fontWeight: 700,
						letterSpacing: "0.05em",
						display: "inline-block",
						marginRight: 2,
					}}>{seg.value}</span>
				) : (
					<span key={i}>{seg.value}</span>
				)
			)}
		</span>
	);
}
