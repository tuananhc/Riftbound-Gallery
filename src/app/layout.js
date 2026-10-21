import Link from "next/link";
import Navbar from "../components/Navbar";
import { CardStoreProvider } from "../components/CardStoreProvider";
import { BASE_STYLES, FONTS, COLORS, LAYOUT, SITE_NAME, THEME_STORAGE_KEY } from "../lib/data";

export const metadata = {
	title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
	description: "A fan-made Riftbound companion for tracking match history, Elo and decks.",
};

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
					<main style={{ minHeight: `calc(100vh - ${LAYOUT.navHeight})`, background: COLORS.bg }}>
						{children}
					</main>
				</CardStoreProvider>
				<footer style={{
					borderTop: `1px solid ${COLORS.border}`,
					padding: `24px ${LAYOUT.pagePad}`,
					display: "flex", flexWrap: "wrap", gap: "12px 24px", justifyContent: "space-between", alignItems: "center",
					background: COLORS.bgAlt, fontSize: 11, letterSpacing: "0.08em", color: COLORS.textDim,
				}}>
					<span>{SITE_NAME.toUpperCase()} · A FAN SITE, NOT ENDORSED BY RIOT GAMES</span>
					<Link href="/about" style={{ color: COLORS.textMuted, textDecoration: "underline", textUnderlineOffset: 3 }}>
						ABOUT & CREDITS
					</Link>
				</footer>
			</body>
		</html>
	);
}
