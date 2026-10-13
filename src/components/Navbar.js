"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { COLORS, FONT_MONO } from "../lib/data";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

const NAV_LINKS = [
  { href: "/", label: "Profile" },
  { href: "/cards", label: "Cards" },
  { href: "/decks", label: "Decks" },
  { href: "/news", label: "News" },
];

// "/" only matches exactly; other tabs also match their sub-routes (/news/foo).
function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  function handleLogout() {
    setMenuOpen(false);
    signOut(); // clears cached ID/access/refresh tokens from localStorage
    router.push("/login");
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <header style={{
      borderBottom: `1px solid ${COLORS.border}`,
      padding: "0 32px",
      height: 62,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "linear-gradient(180deg, var(--bg) 0%, var(--bg) 100%)",
      position: "sticky", top: 0, zIndex: 50,
      backdropFilter: "blur(8px)",
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 0,
          background: "linear-gradient(135deg, var(--bg-card), var(--bg-raised))",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, boxShadow: "0 0 14px var(--shadow)",
        }}>⚡</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "0.14em", color: COLORS.accent, fontFamily: FONT_MONO }}>
            RIFTBOUND
          </div>
          <div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.25em", marginTop: 1, fontFamily: FONT_MONO }}>
            CARD DATABASE
          </div>
        </div>
      </Link>

      {/* Nav links — centered, active tab marked by a gold underline */}
      <nav style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", height: "100%", display: "flex", alignItems: "stretch", gap: 6 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href}
              aria-current={active ? "page" : undefined}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = COLORS.text; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = COLORS.textMuted; }}
              style={{
                position: "relative",
                display: "flex", alignItems: "center",
                padding: "0 16px",
                fontSize: 11,
                fontFamily: FONT_MONO,
                letterSpacing: "0.14em",
                fontWeight: active ? 700 : 500,
                color: active ? COLORS.accent : COLORS.textMuted,
                background: active ? "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--accent) 6%, transparent) 100%)" : "transparent",
                transition: "color 0.2s, background 0.2s",
                textDecoration: "none",
              }}>
              {label.toUpperCase()}
              <span style={{
                position: "absolute", left: 12, right: 12, bottom: -1, height: 2, borderRadius: 0,
                background: COLORS.accent,
                boxShadow: "0 0 10px color-mix(in srgb, var(--accent) 60%, transparent)",
                opacity: active ? 1 : 0,
                transform: active ? "scaleX(1)" : "scaleX(0.4)",
                transition: "opacity 0.2s, transform 0.2s",
              }} />
            </Link>
          );
        })}
      </nav>

      {/* Right: Dev Log + user */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/devlog" style={{
          padding: "6px 16px",
          borderRadius: 0,
          fontSize: 11,
          fontFamily: FONT_MONO,
          letterSpacing: "0.12em",
          fontWeight: "bold",
          color: COLORS.bg,
          backgroundColor: COLORS.accent,
          transition: "all 0.2s",
          textDecoration: "none",
        }}>
          Dev Log
        </Link>

      {status === "authed" && (
      <div ref={menuRef} style={{ position: "relative" }}>
        {/* Avatar + username — indicates a successful login */}
        <button onClick={() => setMenuOpen(o => !o)}
          title={user?.email ?? "Account"}
          onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.borderHover}
          onMouseLeave={e => e.currentTarget.style.borderColor = menuOpen ? COLORS.borderHover : COLORS.border}
          style={{
            display: "flex", alignItems: "center", gap: 9,
            background: COLORS.bgCard, border: `1px solid ${menuOpen ? COLORS.borderHover : COLORS.border}`,
            borderRadius: 0, padding: "4px 14px 4px 4px", cursor: "pointer", transition: "all 0.2s",
          }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, var(--bg-hover), var(--bg-alt))",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>🧙</div>
          <span style={{
            fontSize: 12, color: COLORS.text, fontFamily: FONT_MONO,
            letterSpacing: "0.06em", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {user?.email ? user.email.split("@")[0] : "Account"}
          </span>
        </button>

        {menuOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 160,
            background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
            borderRadius: 0, overflow: "hidden", zIndex: 100,
            boxShadow: "0 8px 24px var(--shadow)",
          }}>
            <Link href="/" onClick={() => setMenuOpen(false)} style={{
              display: "block", padding: "10px 16px", textDecoration: "none",
              fontSize: 12, color: COLORS.textMuted, fontFamily: FONT_MONO,
              letterSpacing: "0.08em", transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.bgRaised}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              VIEW PROFILE
            </Link>
            <div style={{ height: 1, background: COLORS.border }} />
            <button onClick={handleLogout}
              style={{
                display: "block", width: "100%", padding: "10px 16px", textAlign: "left",
                background: "transparent", border: "none", cursor: "pointer",
                fontSize: 12, color: COLORS.loss, fontFamily: FONT_MONO,
                letterSpacing: "0.08em", transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.bgCard}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              LOG OUT
            </button>
          </div>
        )}
      </div>
      )}

      {status === "guest" && (
        <Link href="/login" style={{
          padding: "7px 20px", borderRadius: 0, fontSize: 11,
          fontFamily: FONT_MONO, letterSpacing: "0.12em",
          fontWeight: 700, color: COLORS.bg,
          background: "linear-gradient(135deg, var(--accent), var(--accent))",
          border: "1px solid var(--accent)", transition: "all 0.2s", textDecoration: "none",
        }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px color-mix(in srgb, var(--accent) 33%, transparent)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
        >
          LOG IN
        </Link>
      )}

      <ThemeToggle />
      </div>
    </header>
  );
}

// Square icon button at the far right of the navbar. Shows the theme you'd
// switch to: a sun while dark, a moon while light.
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button onClick={toggleTheme} aria-label={label} title={label}
      onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.borderHover; e.currentTarget.style.color = COLORS.text; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
      style={{
        width: 30, height: 30, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, borderRadius: 0,
        color: COLORS.textMuted, cursor: "pointer", padding: 0,
        transition: "border-color 0.15s, color 0.15s",
      }}>
      {isDark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
