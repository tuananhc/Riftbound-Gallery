"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COLORS, FONT_MONO } from "../lib/data";
import { useIsMobile } from "../hooks/useIsMobile";
import BottomSheet from "./BottomSheet";

// ── Dropdown ─────────────────────────────────────────────────────────────────
// The site's select: replaces native <select>, whose option list the OS draws
// in its own style. Options open in a square popover on desktop and in a
// bottom sheet on phones; the selected option is blue with a ✓.
//
//   options  [[value, label], ...]
//   variant  "field"   — 48px labelled field (phones, filter cards)
//            "compact" — small label + box, for desktop toolbars
//            "text"    — "LABEL Value ▾" with no box (e.g. sort)
//
// Keyboard: Enter / Space / ↑ ↓ open; ↑ ↓ move; Enter picks; Esc closes.

const POPOVER_MAX_HEIGHT = 320;

export default function Dropdown({ value, options, onChange, label, variant = "compact", ariaLabel }) {
	const isMobile = useIsMobile();
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState(null);
	const [active, setActive] = useState(0);
	const triggerRef = useRef(null);
	const listRef = useRef(null);
	const selected = options.findIndex(([v]) => v === value);
	const current = options[selected]?.[1] ?? "";
	const name = ariaLabel ?? label ?? "Select";

	function openList() {
		setActive(Math.max(0, selected));
		if (!isMobile) {
			// Below the trigger, or above it when there isn't room below.
			const r = triggerRef.current.getBoundingClientRect();
			const { clientWidth, clientHeight } = document.documentElement;
			const below = clientHeight - r.bottom;
			const up = below < 200 && r.top > below;
			setPos({
				...(up ? { bottom: clientHeight - r.top + 4 } : { top: r.bottom + 4 }),
				...(r.left + 200 > clientWidth ? { right: clientWidth - r.right } : { left: r.left }),
				minWidth: Math.max(r.width, 160),
				maxHeight: Math.min(POPOVER_MAX_HEIGHT, (up ? r.top : below) - 12),
			});
		}
		setOpen(true);
	}
	function close() {
		setOpen(false);
		triggerRef.current?.focus();
	}
	function choose(v) {
		if (v !== value) onChange(v);
		close();
	}

	// The desktop popover is fixed to the viewport: close it on an outside
	// click, or when the page scrolls or resizes under it.
	useEffect(() => {
		if (!open || isMobile) return;
		const dismiss = () => setOpen(false);
		const onDown = e => {
			if (!listRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) dismiss();
		};
		const onScroll = e => { if (!listRef.current?.contains(e.target)) dismiss(); };
		document.addEventListener("mousedown", onDown);
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", dismiss);
		return () => {
			document.removeEventListener("mousedown", onDown);
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", dismiss);
		};
	}, [open, isMobile]);

	// Keep the keyboard-highlighted option in view.
	useEffect(() => {
		if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
	}, [open, active]);

	function onKeyDown(e) {
		if (!open) {
			if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); openList(); }
			return;
		}
		if (e.key === "Escape") { e.preventDefault(); close(); }
		else if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(options.length - 1, a + 1)); }
		else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
		else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (options[active]) choose(options[active][0]); }
		else if (e.key === "Tab") setOpen(false);
	}

	const trigger = {
		ref: triggerRef, type: "button", onClick: () => (open ? close() : openList()), onKeyDown,
		"aria-haspopup": "listbox", "aria-expanded": open, "aria-label": `${name}: ${current}`,
	};

	return (
		<>
			{variant === "field" && (
				<button {...trigger} style={{
					width: "100%", height: 48, display: "flex", alignItems: "center", gap: 8, padding: "0 10px", minWidth: 0,
					background: COLORS.bgRaised, border: `1px solid ${open ? COLORS.accentDim : COLORS.border}`,
					color: COLORS.text, fontFamily: FONT_MONO, cursor: "pointer", textAlign: "left",
				}}>
					<span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
						{label && <span style={{ fontSize: 9, letterSpacing: "0.14em", color: COLORS.textDim }}>{label}</span>}
						<span style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{current}</span>
					</span>
					<Caret open={open} />
				</button>
			)}
			{variant === "compact" && (
				<span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_MONO }}>
					{label && <span style={{ fontSize: 10, letterSpacing: "0.14em", color: COLORS.textDim }}>{label}</span>}
					<button {...trigger}
						onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = COLORS.borderHover; }}
						onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = COLORS.border; }}
						style={{
							height: 28, display: "inline-flex", alignItems: "center", gap: 10, padding: "0 8px 0 10px",
							background: COLORS.bgRaised, border: `1px solid ${open ? COLORS.accentDim : COLORS.border}`,
							color: COLORS.text, fontFamily: FONT_MONO, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap",
						}}>
						{current}<Caret open={open} />
					</button>
				</span>
			)}
			{variant === "text" && (
				<button {...trigger} style={{
					height: 32, display: "inline-flex", alignItems: "center", gap: 6, padding: "0 0 0 10px",
					background: "transparent", border: "none", color: COLORS.textMuted, fontFamily: FONT_MONO,
					fontSize: 11, letterSpacing: "0.1em", cursor: "pointer",
				}}>
					{label}<span style={{ color: COLORS.textStrong }}>{current.toUpperCase()}</span><Caret open={open} />
				</button>
			)}

			{open && isMobile && (
				<BottomSheet title={(label ?? name).toUpperCase()} onClose={close}>
					<div ref={listRef} role="listbox" aria-label={name} style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
						{options.map(([v, text], i) => (
							<Option key={v} index={i} text={text} selected={v === value} active={i === active} tall onPick={() => choose(v)} />
						))}
					</div>
				</BottomSheet>
			)}
			{open && !isMobile && pos && createPortal(
				<div ref={listRef} role="listbox" aria-label={name} style={{
					position: "fixed", ...pos, zIndex: 1000, overflowY: "auto", fontFamily: FONT_MONO,
					background: COLORS.bgCard, border: `1px solid ${COLORS.borderHover}`, boxShadow: `0 8px 24px ${COLORS.shadow}`,
				}}>
					{options.map(([v, text], i) => (
						<Option key={v} index={i} text={text} selected={v === value} active={i === active}
							onHover={() => setActive(i)} onPick={() => choose(v)} />
					))}
				</div>,
				document.body
			)}
		</>
	);
}

function Option({ index, text, selected, active, tall, onHover, onPick }) {
	return (
		<div role="option" aria-selected={selected} data-index={index}
			onMouseEnter={onHover} onClick={onPick}
			style={{
				height: tall ? 52 : 36, display: "flex", alignItems: "center", gap: 12, padding: tall ? "0 16px" : "0 12px",
				borderBottom: tall ? `1px solid ${COLORS.border}` : "none", cursor: "pointer", whiteSpace: "nowrap",
				background: active && !tall ? COLORS.bgHover : selected && tall ? COLORS.bgHover : "transparent",
				color: selected ? COLORS.accent : COLORS.text, fontSize: tall ? 13 : 12, fontWeight: selected ? 700 : 400,
			}}>
			<span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{text}</span>
			<span style={{ width: 12, color: COLORS.accent, fontWeight: 700 }}>{selected ? "✓" : ""}</span>
		</div>
	);
}

function Caret({ open }) {
	return (
		<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ flexShrink: 0, color: COLORS.textDim, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
			<path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
		</svg>
	);
}
