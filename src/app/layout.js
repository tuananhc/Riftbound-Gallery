import Navbar from "../components/Navbar";
import { CardStoreProvider } from "../components/CardStoreProvider";
import { BASE_STYLES, FONTS, COLORS, THEME_STORAGE_KEY } from "../lib/data";

// Runs before first paint so a saved light theme never flashes dark first.
const THEME_INIT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }) {
	return (
		// The init script sets data-theme before React hydrates, so the attribute
		// legitimately differs from the server render.
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;700;900&display=swap" />
			</head>
			<body>
				<style dangerouslySetInnerHTML={{ __html: FONTS + BASE_STYLES }} />
				<Navbar />
				<CardStoreProvider>
					<main style={{ minHeight: "calc(100vh - 62px)", background: COLORS.bg }}>
						{children}
					</main>
				</CardStoreProvider>
				<footer style={{
					borderTop: `1px solid ${COLORS.border}`,
					padding: "24px 32px",
					display: "flex", justifyContent: "space-between", alignItems: "center",
					background: COLORS.bgAlt,
				}} />
			</body>
		</html>
	);
}
