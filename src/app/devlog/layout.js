import { FONT_SANS, FONT_SANS_URL } from "../../lib/data";

// Scopes DM Sans to the /devlog routes: React hoists the stylesheet into <head>
// only when one of these pages renders, and the wrapper sets it as the inherited font.
export default function DevLogLayout({ children }) {
	return (
		<div style={{ fontFamily: FONT_SANS }}>
			<link rel="stylesheet" href={FONT_SANS_URL} precedence="default" />
			{children}
		</div>
	);
}
