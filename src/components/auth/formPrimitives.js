"use client";
// Shared presentational primitives for the auth forms (signup + signin).
// Pure UI — no data. Inline styles + event-handler hover/focus only.
//
// AuthShell frames the form as a card on desktop; on phones the frame drops
// away and the form sits low on the screen, in the thumb zone. Fields and the
// button are 48–52px tall so they're comfortable to tap.

import { useState } from "react";
import { COLORS, FONT_MONO, alpha } from "../../lib/data";

export const FONT = FONT_MONO;

export function AuthShell({ title, sub, children, footer }) {
	return (
		<div style={{
			maxWidth: 440, margin: "0 auto", boxSizing: "border-box",
			minHeight: "calc(100vh - var(--nav-height))", display: "flex", flexDirection: "column",
			justifyContent: "var(--auth-justify)", padding: "var(--auth-pad)", fontFamily: FONT,
		}}>
			<div style={{ background: "var(--auth-card-bg)", border: "var(--auth-card-border)", padding: "var(--auth-card-pad)", display: "flex", flexDirection: "column", gap: 20 }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
					<h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.12em", color: COLORS.accent }}>{title}</h1>
					{sub && <div style={{ fontSize: 12, lineHeight: 1.6, color: COLORS.textMuted }}>{sub}</div>}
				</div>
				{children}
				{footer && <div style={{ display: "flex", justifyContent: "center", gap: 6, fontSize: 12, padding: "4px 0 8px" }}>{footer}</div>}
			</div>
		</div>
	);
}

export function ErrorBox({ children }) {
	return (
		<div role="alert" style={{ border: `1px solid ${COLORS.loss}`, background: `color-mix(in srgb, var(--loss) 8%, var(--bg-card))`, padding: "12px 14px", display: "flex", gap: 10 }}>
			<span style={{ color: COLORS.loss, fontWeight: 700 }}>!</span>
			<span style={{ fontSize: 12, lineHeight: 1.55, color: COLORS.text }}>{children}</span>
		</div>
	);
}

export function NoticeBox({ children }) {
	return (
		<div role="status" style={{ border: `1px solid ${alpha(COLORS.accent, 45)}`, background: alpha(COLORS.accent, 8), padding: "12px 14px", fontSize: 12, lineHeight: 1.55, color: COLORS.text }}>
			{children}
		</div>
	);
}

export function Field({ label, hint, aside, children }) {
	return (
		<label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
			<span style={{ display: "flex", justifyContent: "space-between", fontSize: 10, letterSpacing: "0.14em", color: COLORS.textDim }}>
				<span>{label}</span>{aside}
			</span>
			{children}
			{hint && <span style={{ fontSize: 10, color: COLORS.textDim, lineHeight: 1.5 }}>{hint}</span>}
		</label>
	);
}

// 16px text so phones don't zoom in when the field is focused.
const inputStyle = {
	height: 48, padding: "0 12px", width: "100%", boxSizing: "border-box",
	background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, color: COLORS.textStrong,
	fontFamily: FONT, fontSize: 16, outline: "none", caretColor: COLORS.accent, transition: "border-color 0.2s",
};

export function Input({ value, onChange, invalid, ...rest }) {
	return (
		<input
			value={value}
			onChange={e => onChange(e.target.value)}
			onFocus={e => { e.target.style.borderColor = COLORS.accent; }}
			onBlur={e => { e.target.style.borderColor = invalid ? COLORS.loss : COLORS.border; }}
			style={{ ...inputStyle, borderColor: invalid ? COLORS.loss : COLORS.border }}
			{...rest}
		/>
	);
}

// Password field with a SHOW / HIDE toggle.
export function PasswordInput({ value, onChange, invalid, ...rest }) {
	const [show, setShow] = useState(false);
	const border = invalid ? COLORS.loss : COLORS.border;
	return (
		<span style={{ display: "flex", height: 48, background: COLORS.bgRaised, border: `1px solid ${border}` }}
			onFocus={e => { e.currentTarget.style.borderColor = COLORS.accent; }}
			onBlur={e => { e.currentTarget.style.borderColor = border; }}>
			<input
				type={show ? "text" : "password"}
				value={value}
				onChange={e => onChange(e.target.value)}
				style={{ ...inputStyle, flex: 1, minWidth: 0, height: "100%", border: "none", background: "transparent" }}
				{...rest}
			/>
			<button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"} style={{
				width: 64, flexShrink: 0, background: "transparent", border: "none", borderLeft: `1px solid ${COLORS.border}`,
				color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, letterSpacing: "0.12em", cursor: "pointer",
			}}>{show ? "HIDE" : "SHOW"}</button>
		</span>
	);
}

// While loading the button dims and shows a three-square progress mark;
// repeat taps are ignored because it's disabled.
export function SubmitButton({ loading, disabled, children }) {
	const bg = loading ? COLORS.accentDim : disabled ? COLORS.bgHover : COLORS.accent;
	return (
		<button type="submit" disabled={loading || disabled} style={{
			height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
			background: bg, border: `1px solid ${bg}`, color: disabled && !loading ? COLORS.textDim : COLORS.bg,
			fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: "0.14em",
			cursor: loading || disabled ? "not-allowed" : "pointer", transition: "background 0.2s",
		}}>
			{loading && (
				<span aria-hidden="true" style={{ display: "flex", gap: 3 }}>
					{[1, 0.6, 0.3].map(o => <span key={o} style={{ width: 5, height: 5, background: "currentColor", opacity: o }} />)}
				</span>
			)}
			{children}
		</button>
	);
}
