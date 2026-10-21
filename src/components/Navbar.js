"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { COLORS, FONT_MONO, FONT_SANS, SHOW, SITE_NAME } from "../lib/data";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

// `icon` is the 24×24 line icon used on the phone nav row.
const NAV_LINKS = [
  { href: "/", label: "Profile", icon: "M12 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8zM4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" },
  { href: "/cards", label: "Cards", icon: "M8 3h11v15H8zM5 7v14h11" },
  { href: "/decks", label: "Decks", icon: "M3 10h18v11H3zM5 6.5h14M7 3h10" },
  { href: "/news", label: "News", icon: "M3 4h18v16H3zM7 9h10M7 13h10M7 17h6" },
];

// Fired when the Cards link is tapped while already on /cards; CardGrid
// focuses its search field in response.
export const FOCUS_CARD_SEARCH = "riftbound:focus-card-search";

const LOGIN_HINT = "Log in to save your match history and legend picks";

// "/" only matches exactly; other tabs also match their sub-routes (/news/foo).
function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user, signOut, refresh } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const name = user?.email ? user.email.split("@")[0] : "Account";

  // The navbar outlives page changes, so re-read the session on each one —
  // otherwise it still shows LOG IN after signing in on /login.
  useEffect(() => { refresh(); }, [pathname, refresh]);

  function handleLogout() {
    setMenuOpen(false);
    signOut(); // clears cached ID/access/refresh tokens from localStorage
    router.push("/login");
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e) {
      if (!menuRef.current?.contains(e.target) && !mobileMenuRef.current?.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <header style={{
      borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.bg,
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <MobileNav pathname={pathname} status={status} name={name} email={user?.email}
        menuRef={mobileMenuRef} menuOpen={menuOpen} setMenuOpen={setMenuOpen} onLogout={handleLogout} />
      {/* Desktop: one 62px row (the header's 1px border is inside it) */}
      <div style={{
        display: SHOW.desktopFlex, alignItems: "center", justifyContent: "space-between",
        height: 61, padding: "0 32px", position: "relative",
      }}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 0,
          background: "linear-gradient(135deg, var(--bg-card), var(--bg-raised))",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, boxShadow: "0 0 14px var(--shadow)",
        }}>⚓</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "0.06em", color: COLORS.accent, fontFamily: FONT_SANS, whiteSpace: "nowrap" }}>
            {SITE_NAME}
          </div>
          <div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.04em", marginTop: 1, fontFamily: FONT_MONO }}>
            Record your historical matches
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
            {name}
          </span>
        </button>

        {menuOpen && <AccountMenu name={name} email={user?.email} onClose={() => setMenuOpen(false)} onLogout={handleLogout} />}
      </div>
      )}

      {status === "guest" && (
        <Link href="/login" title={LOGIN_HINT} style={{
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
      </div>
    </header>
  );
}

// Square icon button at the far right of the navbar. Shows the theme you'd
// switch to: a sun while dark, a moon while light.
function ThemeToggle({ size = 30 }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button onClick={toggleTheme} aria-label={label} title={label}
      onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.borderHover; e.currentTarget.style.color = COLORS.text; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
      style={{
        width: size, height: size, flexShrink: 0,
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

// ── Phone nav ────────────────────────────────────────────────────────────────
// Top bar (wordmark, theme, account) and, under it, the four page links —
// navigation stays at the top on phones too. 52 + 44 + the header's border =
// the 97px --nav-height that sticky elements below offset by.

function MobileNav({ pathname, status, name, email, menuRef, menuOpen, setMenuOpen, onLogout }) {
  const initials = name.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "?";
  return (
    <div style={{ display: SHOW.mobileBlock, fontFamily: FONT_MONO }}>
      <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 0 16px" }}>
        <Link href="/" style={{ display: "flex", flexDirection: "column", gap: 1, textDecoration: "none" }}>
          <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: "0.06em", color: COLORS.accent, fontFamily: FONT_SANS, whiteSpace: "nowrap" }}>{SITE_NAME}</span>
          <span style={{ fontSize: 8, letterSpacing: "0.25em", color: COLORS.textDim }}>Track your games</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ThemeToggle size={44} />
          {status === "authed" && (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button onClick={() => setMenuOpen(o => !o)} aria-label="Account" aria-expanded={menuOpen} style={{
                width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
                background: COLORS.bgCard, border: `1px solid ${menuOpen ? COLORS.borderHover : COLORS.border}`, padding: 0, cursor: "pointer",
              }}>
                <span style={{
                  width: 30, height: 30, borderRadius: "50%", background: COLORS.bgHover, border: `1px solid ${COLORS.borderHover}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: COLORS.textStrong,
                }}>{initials}</span>
              </button>
              {menuOpen && <AccountMenu name={name} email={email} withDevLog onClose={() => setMenuOpen(false)} onLogout={onLogout} />}
            </div>
          )}
          {status === "guest" && (
            <Link href="/login" title={LOGIN_HINT} style={{
              height: 44, padding: "0 16px", display: "flex", alignItems: "center",
              background: COLORS.accent, border: `1px solid ${COLORS.accent}`, color: COLORS.bg,
              fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textDecoration: "none",
            }}>LOG IN</Link>
          )}
        </div>
      </div>
      <nav style={{ height: 44, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {NAV_LINKS.map(({ href, label, icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              onClick={() => { if (href === "/cards" && active) window.dispatchEvent(new Event(FOCUS_CARD_SEARCH)); }}
              style={{
                position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                color: active ? COLORS.accent : COLORS.textMuted, textDecoration: "none",
                fontSize: 10, letterSpacing: "0.14em", fontWeight: active ? 700 : 500,
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden="true">
                <path d={icon} />
              </svg>
              {label.toUpperCase()}
              <span style={{ position: "absolute", left: "18%", right: "18%", bottom: -1, height: 2, background: COLORS.accent, opacity: active ? 1 : 0 }} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// Account popover under the avatar: who's signed in, then the three actions.
// Rows are 48px so they're comfortable to tap on phones too.
function AccountMenu({ name, email, withDevLog, onClose, onLogout }) {
  const row = {
    height: 48, display: "flex", alignItems: "center", padding: "0 16px", width: "100%",
    fontSize: 12, letterSpacing: "0.08em", color: COLORS.textMuted, fontFamily: FONT_MONO,
    background: "transparent", border: "none", textDecoration: "none", cursor: "pointer", textAlign: "left",
  };
  const hover = {
    onMouseEnter: e => { e.currentTarget.style.background = COLORS.bgHover; },
    onMouseLeave: e => { e.currentTarget.style.background = "transparent"; },
  };
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 4px)", right: 0, width: 208, zIndex: 100,
      background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, boxShadow: `0 8px 24px ${COLORS.shadow}`,
    }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 2, fontFamily: FONT_MONO }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        {email && <span style={{ fontSize: 10, color: COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis" }}>{email}</span>}
      </div>
      <Link href="/" onClick={onClose} style={row} {...hover}>VIEW PROFILE</Link>
      {withDevLog && <Link href="/devlog" onClick={onClose} style={row} {...hover}>DEV LOG</Link>}
      <div style={{ height: 1, background: COLORS.border }} />
      <button onClick={onLogout} style={{ ...row, color: COLORS.loss }} {...hover}>LOG OUT</button>
    </div>
  );
}
