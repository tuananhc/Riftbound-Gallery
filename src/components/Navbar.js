"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { COLORS } from "../lib/data";
import { useAuth } from "../hooks/useAuth";

const NAV_LINKS = [
  { href: "/",       label: "Cards"   },
  { href: "/news",   label: "News"    },
  { href: "/decks",  label: "Decks"   },
];

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

      {status === "authed" && (
      <div ref={menuRef} style={{ position: "relative" }}>
        {/* Avatar + username — indicates a successful login */}
        <button onClick={() => setMenuOpen(o => !o)}
          title={user?.email ?? "Account"}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#6a30a0"}
          onMouseLeave={e => e.currentTarget.style.borderColor = menuOpen ? "#6a30a0" : COLORS.border}
          style={{
            display: "flex", alignItems: "center", gap: 9,
            background: "#10121a", border: `1px solid ${menuOpen ? "#6a30a0" : COLORS.border}`,
            borderRadius: 20, padding: "4px 14px 4px 4px", cursor: "pointer", transition: "all 0.2s",
          }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, #2a1040, #1a0830)",
            border: "1px solid #4a2060",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>🧙</div>
          <span style={{
            fontSize: 12, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif",
            letterSpacing: "0.06em", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {user?.email ? user.email.split("@")[0] : "Account"}
          </span>
        </button>

        {menuOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 160,
            background: "#10121a", border: `1px solid ${COLORS.border}`,
            borderRadius: 10, overflow: "hidden", zIndex: 100,
            boxShadow: "0 8px 24px #00000066",
          }}>
            <Link href="/user" onClick={() => setMenuOpen(false)} style={{
              display: "block", padding: "10px 16px", textDecoration: "none",
              fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif",
              letterSpacing: "0.08em", transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#161820"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              VIEW PROFILE
            </Link>
            <div style={{ height: 1, background: COLORS.border }} />
            <button onClick={handleLogout}
              style={{
                display: "block", width: "100%", padding: "10px 16px", textAlign: "left",
                background: "transparent", border: "none", cursor: "pointer",
                fontSize: 12, color: "#ef5350", fontFamily: "'Segoe UI', system-ui, sans-serif",
                letterSpacing: "0.08em", transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#1a1010"}
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
          padding: "7px 20px", borderRadius: 6, fontSize: 11,
          fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.12em",
          fontWeight: 700, color: "#1a1206",
          background: "linear-gradient(135deg, #e8d090, #d4bc78)",
          border: "1px solid #f0dca0", transition: "all 0.2s", textDecoration: "none",
        }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px #e8d09055"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
        >
          LOG IN
        </Link>
      )}
      </div>
    </header>
  );
}
