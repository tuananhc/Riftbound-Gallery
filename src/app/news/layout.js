import { FONT_SANS } from "../../lib/data";

// Sets DM Sans as the inherited font on the /news routes, as on /devlog (the root layout loads it).
export default function NewsLayout({ children }) {
	return (
		<div style={{ fontFamily: FONT_SANS }}>
			{children}
		</div>
	);
}
