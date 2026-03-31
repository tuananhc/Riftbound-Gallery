import Navbar from "../components/Navbar";
import { BASE_STYLES, FONTS, COLORS } from "../lib/data";

export const metadata = {
  title: "Riftbound — Card Database",
  description: "Search, explore, and build decks for Riftbound TCG",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <style dangerouslySetInnerHTML={{ __html: FONTS + BASE_STYLES }} />
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 62px)", background: COLORS.bg }}>
          {children}
        </main>
        <footer style={{
          borderTop: `1px solid ${COLORS.border}`,
          padding: "24px 32px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: COLORS.bgAlt,
        }}>
          <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em" }}>
            ⚡ RIFTBOUND CARD DATABASE
          </span>
          <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.06em" }}>
            © 2026 RIFTBOUND PROJECT
          </span>
        </footer>
      </body>
    </html>
  );
}
