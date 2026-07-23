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
			onFocus={e => { e.target.style.borderColor = "#4a5090"; }}
			onBlur={e => { e.target.style.borderColor = "#1e2030"; }}
			style={{
				background: "#0d0f18", border: "1px solid #1e2030", borderRadius: 8,
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
			onMouseEnter={e => { if (!off) { e.currentTarget.style.background = "linear-gradient(135deg, #f4dfa0, #e8d090)"; e.currentTarget.style.boxShadow = "0 0 22px #e8d09055"; } }}
			onMouseLeave={e => { if (!off) { e.currentTarget.style.background = "linear-gradient(135deg, #e8d090, #d4bc78)"; e.currentTarget.style.boxShadow = "0 0 14px #e8d09033"; } }}
			style={{
				background: off ? "#1a1c28" : "linear-gradient(135deg, #e8d090, #d4bc78)",
				border: `1px solid ${off ? "#1e2030" : "#f0dca0"}`,
				borderRadius: 8, padding: "14px 20px",
				color: off ? COLORS.textDim : "#1a1206",
				fontFamily: FONT, fontSize: 12, fontWeight: 800, letterSpacing: "0.14em",
				boxShadow: off ? "none" : "0 0 14px #e8d09033",
				cursor: off ? "not-allowed" : "pointer", transition: "all 0.2s", marginTop: 8,
			}}>
			{children}
		</button>
	);
}
