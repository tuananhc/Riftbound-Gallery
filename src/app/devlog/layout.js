import { FONT_SANS } from "../../lib/data";

// Sets DM Sans as the inherited font on the /devlog routes (the root layout loads it).
export default function DevLogLayout({ children }) {
	return (
		<div style={{ fontFamily: FONT_SANS }}>
			{children}
		</div>
	);
}
