"use client";
// Shared presentational primitives for the auth forms (signup + signin).
// Pure UI — no state, no data. Inline styles + event-handler hover/focus only.

import { COLORS } from "../../lib/data";

export const FONT = "'Segoe UI', system-ui, sans-serif";

export function Field({ label, hint, children }) {
	return (
		<div>
			<label style={{ display: "block", fontSize: 10, color: COLORS.textDim, letterSpacing: "0.15em", fontFamily: FONT, marginBottom: 6 }}>
				{label}
			</label>
			{children}
			{hint && (
				<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, marginTop: 5, fontStyle: "italic" }}>{hint}</div>
			)}
		</div>
	);
}

export function Input({ value, onChange, ...rest }) {
	return (
		<input
			value={value}
			onChange={e => onChange(e.target.value)}
			onFocus={e => { e.target.style.borderColor = "#5d6e86"; }}
			onBlur={e => { e.target.style.borderColor = "#333333"; }}
			style={{
				background: "#1a1a1a", border: "1px solid #333333", borderRadius: 0,
				padding: "11px 14px", color: COLORS.text, fontFamily: FONT, fontSize: 14,
				width: "100%", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
			}}
			{...rest}
		/>
	);
}

export function SubmitButton({ loading, disabled, children }) {
	const off = loading || disabled;
	return (
		<button type="submit" disabled={off}
			onMouseEnter={e => { if (!off) { e.currentTarget.style.background = "linear-gradient(135deg, #8fa3bf, #8fa3bf)"; e.currentTarget.style.boxShadow = "0 0 22px #8fa3bf55"; } }}
			onMouseLeave={e => { if (!off) { e.currentTarget.style.background = "linear-gradient(135deg, #8fa3bf, #8fa3bf)"; e.currentTarget.style.boxShadow = "0 0 14px #8fa3bf33"; } }}
			style={{
				background: off ? "#333333" : "linear-gradient(135deg, #8fa3bf, #8fa3bf)",
				border: `1px solid ${off ? "#333333" : "#8fa3bf"}`,
				borderRadius: 0, padding: "14px 20px",
				color: off ? COLORS.textDim : "#121212",
				fontFamily: FONT, fontSize: 12, fontWeight: 800, letterSpacing: "0.14em",
				boxShadow: off ? "none" : "0 0 14px #8fa3bf33",
				cursor: off ? "not-allowed" : "pointer", transition: "all 0.2s", marginTop: 8,
			}}>
			{children}
		</button>
	);
}
