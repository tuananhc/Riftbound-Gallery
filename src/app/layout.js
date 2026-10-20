import Navbar from "../components/Navbar";
import { CardStoreProvider } from "../components/CardStoreProvider";
import { BASE_STYLES, FONTS, COLORS, FONT_MONO, LAYOUT, THEME_STORAGE_KEY } from "../lib/data";

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
					padding: "24px 32px",
					display: "flex", justifyContent: "space-between", alignItems: "center",
					background: COLORS.bgAlt,
				}}>
					<Acknowledgements />
				</footer>
			</body>
		</html>
	);
}

// Credits for the data and assets the site is built on. Riot account IDs are
// looked up through EloShowdown's public API; card art and game assets are Riot's.
function Acknowledgements() {
	const link = { color: COLORS.textMuted, textDecoration: "underline" };
	return (
		<section aria-label="Acknowledgements" style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 720, fontFamily: FONT_MONO, fontSize: 11, lineHeight: 1.6, color: COLORS.textDim }}>
			<div style={{ fontSize: 10, letterSpacing: "0.18em", color: COLORS.textMuted }}>ACKNOWLEDGEMENTS</div>
			<p style={{ margin: 0 }}>
				Riftbound, its card art and game assets are the property of <a href="https://www.riotgames.com" target="_blank" rel="noopener noreferrer" style={link}>Riot Games</a>, and the game is published by <a href="https://www.uvsgames.com" target="_blank" rel="noopener noreferrer" style={link}>UVS Games</a>. Card data comes from the official <a href="https://riftbound.leagueoflegends.com/en-us/card-gallery/" target="_blank" rel="noopener noreferrer" style={link}>Riftbound Card Gallery</a>.
			</p>
			<p style={{ margin: 0 }}>
				Match history, Elo and tournament data for your Riot account ID are provided by <a href="https://eloshowdown.com/riftbound/" target="_blank" rel="noopener noreferrer" style={link}>EloShowdown</a> through their public API.
			</p>
			<p style={{ margin: 0 }}>
				Riftbound Gallery is a fan project. It is not endorsed by or affiliated with Riot Games, UVS Games or EloShowdown.
			</p>
		</section>
	);
}
