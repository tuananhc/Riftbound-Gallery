"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { COLORS, FONT_MONO, alpha } from "../../lib/data";
import { legendLabel } from "../../lib/cards/data";

export default function LegendSelect({ legends, value, onChange }) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 });
	const triggerRef = useRef(null);
	const dropdownRef = useRef(null);
	const searchRef = useRef(null);
	const selected = legends.find(l => l.name === value) ?? null;

	const openDropdown = () => {
		const rect = triggerRef.current.getBoundingClientRect();
		setPos({
			top: rect.bottom + 6,
			left: rect.left,
			width: rect.width,
			maxHeight: window.innerHeight - rect.bottom - 18,
		});
		setOpen(true);
	};

	useEffect(() => {
		if (!open) { setSearch(""); return; }
		searchRef.current?.focus();
		const onMouseDown = (e) => {
			if (triggerRef.current?.contains(e.target) || dropdownRef.current?.contains(e.target)) return;
			setOpen(false);
		};
		const onScroll = (e) => { if (!dropdownRef.current?.contains(e.target)) setOpen(false); };
		document.addEventListener("mousedown", onMouseDown);
		window.addEventListener("scroll", onScroll, true);
		return () => {
			document.removeEventListener("mousedown", onMouseDown);
			window.removeEventListener("scroll", onScroll, true);
		};
	}, [open]);

	const term = search.trim().toLowerCase();
	const filtered = legends.filter(l =>
		l.name.toLowerCase().includes(term) ||
		l.tags_text?.toLowerCase().includes(term)
	);

	const dropdownContent = (
		<div
			ref={dropdownRef}
			style={{
				position: "fixed",
				top: pos.top, left: pos.left, width: pos.width,
				background: COLORS.bgRaised, border: "1px solid var(--border-hover)",
				borderRadius: 0, zIndex: 9999,
				maxHeight: pos.maxHeight,
				display: "flex", flexDirection: "column",
				boxShadow: "0 8px 32px var(--shadow)",
			}}
		>
			<div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
				<input
					ref={searchRef}
					value={search}
					onChange={e => setSearch(e.target.value)}
					placeholder="Search legends..."
					style={{
						width: "100%", background: COLORS.bg,
						border: "1px solid var(--border-hover)", borderRadius: 0,
						padding: "6px 10px", fontSize: 12,
						color: COLORS.text, outline: "none",
						fontFamily: FONT_MONO,
					}}
				/>
			</div>

			<div style={{ overflowY: "auto", flex: 1 }}>
				{!term && (
					<div
						onClick={() => { onChange(""); setOpen(false); }}
						style={{
							display: "flex", alignItems: "center", gap: 14,
							padding: "10px 14px", cursor: "pointer",
							background: value === "" ? COLORS.border : "transparent",
							borderBottom: "1px solid var(--border)",
						}}
					>
						<div style={{ width: 52, height: 52, borderRadius: 0, background: COLORS.border, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
							<svg width="16" height="16" viewBox="0 0 12 12"><path d="M2 6h8M6 2v8" stroke={COLORS.textDim} strokeWidth="1.5" strokeLinecap="round" /></svg>
						</div>
						<span style={{ fontSize: 13, color: value === "" ? COLORS.accent : COLORS.textMuted, fontFamily: FONT_MONO }}>
							All legends
						</span>
					</div>
				)}

				{legends.length === 0 ? (
					<div style={{ padding: "14px", fontSize: 12, color: COLORS.textDim, fontFamily: FONT_MONO, fontStyle: "italic" }}>
						No legends available yet.
					</div>
				) : filtered.length === 0 ? (
					<div style={{ padding: "14px", fontSize: 12, color: COLORS.textDim, fontFamily: FONT_MONO, fontStyle: "italic" }}>
						No legends match &ldquo;{search}&rdquo;.
					</div>
				) : (
					filtered.map(l => (
						<div
							key={l.id}
							onClick={() => { onChange(l.name); setOpen(false); }}
							style={{
								display: "flex", alignItems: "center", gap: 14,
								padding: "10px 14px", cursor: "pointer",
								background: value === l.name ? COLORS.border : "transparent",
								transition: "background 0.1s",
							}}
						>
							{l.image ? (
								<Image src={l.image} alt={l.name} width={52} height={52} style={{ objectFit: "contain", borderRadius: 0, flexShrink: 0 }} />
							) : (
								<div style={{ width: 52, height: 52, borderRadius: 0, background: COLORS.border, flexShrink: 0 }} />
							)}
							<span style={{
								fontSize: 13,
								color: value === l.name ? COLORS.accent : COLORS.text,
								fontFamily: FONT_MONO,
								overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
							}}>
								{legendLabel(l)}
							</span>
						</div>
					))
				)}
			</div>
		</div>
	);

	return (
		<div style={{ position: "relative", minWidth: 260 }}>
			<button
				ref={triggerRef}
				onClick={() => open ? setOpen(false) : openDropdown()}
				style={{
					width: "100%", display: "flex", alignItems: "center", gap: 10,
					background: COLORS.bgRaised, border: `1px solid ${open ? alpha(COLORS.accent, 33) : COLORS.borderHover}`,
					borderRadius: 0, padding: "7px 12px",
					cursor: "pointer", transition: "border-color 0.15s",
				}}
			>
				{selected?.image ? (
					<Image src={selected.image} alt={selected.name} width={40} height={40} style={{ objectFit: "contain", borderRadius: 0, flexShrink: 0 }} />
				) : (
					<div style={{ width: 40, height: 40, borderRadius: 0, background: COLORS.border, flexShrink: 0 }} />
				)}
				<span style={{
					flex: 1, textAlign: "left", fontSize: 12,
					color: selected ? COLORS.text : COLORS.textDim,
					fontFamily: FONT_MONO,
					overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
				}}>
					{selected ? legendLabel(selected) : "All legends"}
				</span>
				<svg width="10" height="6" viewBox="0 0 10 6" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
					<path d="M0 0l5 6 5-6z" fill={COLORS.textDim} />
				</svg>
			</button>

			{open && createPortal(dropdownContent, document.body)}
		</div>
	);
}
