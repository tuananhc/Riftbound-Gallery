"use client";
import Link from "next/link";
import { COLORS, FONT_MONO } from "../../lib/data";

// ── Get started ──────────────────────────────────────────────────────────────
// First thing a new visitor sees on the profile, until an account is linked:
// what the page is for and the three steps to get their data in, ending at the
// search box right below it. `guest` adds that no sign-up is needed to try it —
// it stands in for the guest notice until there's something to lose.
// `mobile` stacks it for a phone screen.

const STEPS = [
	["ENTER YOUR RIOT ACCOUNT ID", "Type it into the search box below and press Search."],
	["PICK YOUR ACCOUNT", "Choose yourself from the results. Your match history loads straight away."],
	["LOG YOUR LEGENDS", "On the History tab, set the legend you and your opponent played. The Data tab turns that into win rates and matchups."],
];

export default function GetStarted({ mobile, guest }) {
	return (
		<section aria-labelledby="get-started-title" style={{
			background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderTop: `2px solid ${COLORS.accent}`,
			padding: mobile ? 14 : "12px 14px", fontFamily: FONT_MONO,
			display: "flex", flexDirection: "column", gap: mobile ? 12 : 10,
			...(mobile ? { margin: "12px 12px 0" } : { marginBottom: 10 }),
		}}>
			<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
				<span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: COLORS.accent }}>START HERE</span>
				<h2 id="get-started-title" style={{ margin: 0, fontSize: mobile ? 15 : 14, fontWeight: 700, color: COLORS.textStrong, lineHeight: 1.4 }}>
					Search your Riot account ID to see your match history and stats
				</h2>
			</div>

			<ol style={{
				listStyle: "none", margin: 0, padding: 0, display: "grid", gap: mobile ? 10 : 12,
				gridTemplateColumns: mobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
			}}>
				{STEPS.map(([title, text], i) => (
					<li key={title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
						<span aria-hidden="true" style={{
							width: 22, height: 22, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
							border: `1px solid ${i === 0 ? COLORS.accent : COLORS.borderHover}`,
							color: i === 0 ? COLORS.accent : COLORS.textMuted, fontSize: 11, fontWeight: 700,
						}}>{i + 1}</span>
						<span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
							<span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: i === 0 ? COLORS.textStrong : COLORS.text }}>{title}</span>
							<span style={{ fontSize: mobile ? 12 : 11, lineHeight: 1.6, color: COLORS.textMuted }}>{text}</span>
						</span>
					</li>
				))}
			</ol>

			{guest && (
				<span style={{ fontSize: mobile ? 12 : 11, lineHeight: 1.6, color: COLORS.textDim }}>
					No sign-up needed to try it.{" "}
					<Link href="/login" style={{ color: COLORS.accent, textDecoration: "none" }}>Log in</Link> or{" "}
					<Link href="/signup" style={{ color: COLORS.accent, textDecoration: "none" }}>sign up</Link> to keep what you log.
				</span>
			)}
		</section>
	);
}
