"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { COLORS } from "../lib/data";

const NAV_LINKS = [
  { href: "/",      label: "Cards"   },
  { href: "/news",  label: "News"    },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header style={{
      borderBottom: `1px solid ${COLORS.border}`,
      padding: "0 32px",
      height: 62,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "linear-gradient(180deg, #0c0e18 0%, #080b12 100%)",
      position: "sticky", top: 0, zIndex: 50,
      backdropFilter: "blur(8px)",
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8,
          background: "linear-gradient(135deg, #1a1040, #2a0a30)",
          border: "1px solid #4a2060",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, boxShadow: "0 0 14px #6020a055",
        }}>⚡</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "0.14em", color: COLORS.gold, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
            RIFTBOUND
          </div>
          <div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.25em", marginTop: 1, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
            CARD DATABASE
          </div>
        </div>
      </Link>

      {/* Nav links — centered */}
      <nav style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 4 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} style={{
              padding: "6px 16px",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              letterSpacing: "0.12em",
              fontWeight: active ? 700 : 400,
              color: active ? COLORS.gold : COLORS.textMuted,
              background: active ? "rgba(232,208,144,0.07)" : "transparent",
              border: `1px solid ${active ? "rgba(232,208,144,0.18)" : "transparent"}`,
              transition: "all 0.2s",
              textDecoration: "none",
            }}>
              {label.toUpperCase()}
            </Link>
          );
        })}
      </nav>

      {/* Right: Dev Log + user */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/devlog" style={{
          padding: "6px 16px",
          borderRadius: 6,
          fontSize: 11,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          letterSpacing: "0.12em",
          fontWeight: "bold",
          color: "#ffffff",
          backgroundColor: "rgba(61, 245, 255, 0.96)",
          transition: "all 0.2s",
          textDecoration: "none",
        }}>
          Dev Log
        </Link>

      <Link href="/user" style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#10121a", border: `1px solid ${COLORS.border}`,
        borderRadius: 8, padding: "6px 12px", textDecoration: "none",
        transition: "border-color 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "#2a2c3a"}
        onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
      >
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: "linear-gradient(135deg, #2a1040, #1a0830)",
          border: "1px solid #4a2060",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12,
        }}>🧙</div>
        <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em" }}>
          AETHON
        </span>
      </Link>
      </div>
    </header>
  );
}
