"use client";
import Link from "next/link";
import { COLORS, FONT_MONO } from "../../lib/data";

// ── Guest notice ─────────────────────────────────────────────────────────────
// Banner on the profile. For a guest: nothing they do is saved, so closing the
// tab loses it — with links to log in or sign up. `carried` is the version shown
// after signing in with guest work in the tab: it's loaded but not saved yet,
// with a button to save it. `mobile` stacks it for a phone screen.

export const GUEST_SAVE_HINT = "Guests can't save. Log in to keep your linked account, match history and legend picks — otherwise they're gone when you close this tab.";

export default function GuestNotice({ mobile, carried, onSave, saving }) {
	const title = carried ? "GUEST PROGRESS LOADED" : "GUEST MODE · NOT SAVED";
	const text = carried
		? "The account and legend picks from before you logged in are on this page but not saved yet. Save to keep them."
		: "You can link an account and log legends without signing up, but none of it is saved. Close this tab and it's gone — you'd log your history again next visit.";

	return (
		<div role={carried ? "status" : "note"} style={{
			display: "flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "stretch" : "center", gap: mobile ? 10 : 14,
			background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderLeft: `2px solid ${COLORS.accent}`,
			padding: mobile ? 12 : "8px 12px", fontFamily: FONT_MONO,
			...(mobile ? { margin: "12px 12px 0" } : { marginBottom: 10 }),
		}}>
			<div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
				<span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: COLORS.accent }}>{title}</span>
				<span style={{ fontSize: mobile ? 12 : 11, lineHeight: 1.6, color: COLORS.textMuted }}>{text}</span>
			</div>
			<div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
				{carried ? (
					<button onClick={onSave} disabled={saving} style={{ ...primary(mobile), cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
						{saving ? "SAVING…" : "SAVE NOW"}
					</button>
				) : (<>
					<Link href="/signup" title="Create an account to save your history" style={secondary(mobile)}
						onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accentDim; e.currentTarget.style.color = COLORS.accent; }}
						onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.borderHover; e.currentTarget.style.color = COLORS.text; }}>
						SIGN UP
					</Link>
					<Link href="/login" title="Log in to save your history" style={primary(mobile)}>LOG IN</Link>
				</>)}
			</div>
		</div>
	);
}

const button = mobile => ({
	height: mobile ? 44 : 28, padding: "0 14px", flex: mobile ? 1 : "none",
	display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 0,
	fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
	textDecoration: "none", whiteSpace: "nowrap", transition: "border-color 0.15s, color 0.15s",
});
const primary = mobile => ({ ...button(mobile), background: COLORS.accent, border: `1px solid ${COLORS.accent}`, color: COLORS.bg });
const secondary = mobile => ({ ...button(mobile), background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, color: COLORS.text });
