"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COLORS, FONT_MONO } from "../lib/data";

// ── Bottom sheet ─────────────────────────────────────────────────────────────
// The phone surface for every picker, filter, detail view and the deck
// builder: 3px handle, title + 44px close, a scrolling body and an optional
// pinned footer. Scrim tap, Escape, or dragging the handle down dismisses it.
// Portalled to <body> so nothing on the page can cover it.

const DISMISS_DRAG = 80;

export default function BottomSheet({ onClose, title, subtitle, actions, footer, height, children }) {
	const [drag, setDrag] = useState(0);
	const dragStart = useRef(null);

	// Esc closes; the page behind doesn't scroll while the sheet is up.
	useEffect(() => {
		const onKey = e => { if (e.key === "Escape") onClose(); };
		const overflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = overflow;
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose]);

	const dragHandlers = {
		onPointerDown: e => { dragStart.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); },
		onPointerMove: e => { if (dragStart.current != null) setDrag(Math.max(0, e.clientY - dragStart.current)); },
		onPointerUp: () => {
			const dismiss = drag > DISMISS_DRAG;
			dragStart.current = null;
			setDrag(0);
			if (dismiss) onClose();
		},
	};

	return createPortal(
		<div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end", fontFamily: FONT_MONO }}>
			<div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
			<div role="dialog" aria-modal="true" aria-label={title} style={{
				position: "relative", height: height ?? "auto", maxHeight: "92%",
				display: "flex", flexDirection: "column",
				background: COLORS.bgCard, borderTop: `1px solid ${COLORS.borderHover}`,
				boxShadow: `0 -8px 24px ${COLORS.shadow}`,
				transform: drag ? `translateY(${drag}px)` : "none",
				transition: drag ? "none" : "transform 0.2s",
			}}>
				{/* Handle + header double as the drag area */}
				<div {...dragHandlers} style={{ flexShrink: 0, touchAction: "none" }}>
					<div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
						<span style={{ width: 36, height: 3, background: COLORS.borderHover }} />
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 4px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
						<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
							<span style={{ fontSize: 11, letterSpacing: "0.14em", fontWeight: 700, color: COLORS.textStrong }}>{title}</span>
							{subtitle && (
								<span style={{ fontSize: 11, color: COLORS.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</span>
							)}
						</div>
						{actions}
						<button onClick={onClose} aria-label="Close" style={{
							width: 44, height: 44, flexShrink: 0, background: "transparent", border: "none",
							color: COLORS.textMuted, fontSize: 16, cursor: "pointer", fontFamily: FONT_MONO,
						}}>✕</button>
					</div>
				</div>
				<div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
					{children}
				</div>
				{footer && (
					<div style={{
						flexShrink: 0, display: "flex", gap: 8, alignItems: "center",
						padding: "10px 12px calc(14px + env(safe-area-inset-bottom))",
						borderTop: `1px solid ${COLORS.border}`, background: COLORS.bgCard,
					}}>
						{footer}
					</div>
				)}
			</div>
		</div>,
		document.body
	);
}
