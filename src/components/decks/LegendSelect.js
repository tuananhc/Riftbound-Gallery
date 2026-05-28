"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { COLORS } from "../../lib/data";

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
				background: "#12141e", border: "1px solid #2a2c3a",
				borderRadius: 8, zIndex: 9999,
				maxHeight: pos.maxHeight,
				display: "flex", flexDirection: "column",
				boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
			}}
		>
			<div style={{ padding: "10px 12px", borderBottom: "1px solid #1e2030", flexShrink: 0 }}>
				<input
					ref={searchRef}
					value={search}
					onChange={e => setSearch(e.target.value)}
					placeholder="Search legends..."
					style={{
						width: "100%", background: "#0a0c14",
						border: "1px solid #2a2c3a", borderRadius: 6,
						padding: "6px 10px", fontSize: 12,
						color: COLORS.text, outline: "none",
						fontFamily: "'Segoe UI', system-ui, sans-serif",
						colorScheme: "dark",
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
							background: value === "" ? "#1e2030" : "transparent",
							borderBottom: "1px solid #1e2030",
						}}
					>
						<div style={{ width: 52, height: 52, borderRadius: 6, background: "#1e2030", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
							<svg width="16" height="16" viewBox="0 0 12 12"><path d="M2 6h8M6 2v8" stroke={COLORS.textDim} strokeWidth="1.5" strokeLinecap="round" /></svg>
						</div>
						<span style={{ fontSize: 13, color: value === "" ? COLORS.gold : COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
							All legends
						</span>
					</div>
				)}

				{legends.length === 0 ? (
					<div style={{ padding: "14px", fontSize: 12, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", fontStyle: "italic" }}>
						No legends available yet.
					</div>
				) : filtered.length === 0 ? (
					<div style={{ padding: "14px", fontSize: 12, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", fontStyle: "italic" }}>
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
								background: value === l.name ? "#1e2030" : "transparent",
								transition: "background 0.1s",
							}}
						>
							{l.image ? (
								<Image src={l.image} alt={l.name} width={52} height={52} style={{ objectFit: "contain", borderRadius: 6, flexShrink: 0 }} />
							) : (
								<div style={{ width: 52, height: 52, borderRadius: 6, background: "#1e2030", flexShrink: 0 }} />
							)}
							<span style={{
								fontSize: 13,
								color: value === l.name ? COLORS.gold : COLORS.text,
								fontFamily: "'Segoe UI', system-ui, sans-serif",
								overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
							}}>
								{l.tags_text ? `${l.tags_text} - ${l.name}` : l.name}
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
					background: "#12141e", border: `1px solid ${open ? COLORS.gold + "55" : "#2a2c3a"}`,
					borderRadius: 8, padding: "7px 12px",
					cursor: "pointer", transition: "border-color 0.15s",
				}}
			>
				{selected?.image ? (
					<Image src={selected.image} alt={selected.name} width={40} height={40} style={{ objectFit: "contain", borderRadius: 6, flexShrink: 0 }} />
				) : (
					<div style={{ width: 40, height: 40, borderRadius: 6, background: "#1e2030", flexShrink: 0 }} />
				)}
				<span style={{
					flex: 1, textAlign: "left", fontSize: 12,
					color: selected ? COLORS.text : COLORS.textDim,
					fontFamily: "'Segoe UI', system-ui, sans-serif",
					overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
				}}>
					{selected ? `${selected.tags_text} - ${selected.name}` : "All legends"}
				</span>
				<svg width="10" height="6" viewBox="0 0 10 6" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
					<path d="M0 0l5 6 5-6z" fill={COLORS.textDim} />
				</svg>
			</button>

			{open && createPortal(dropdownContent, document.body)}
		</div>
	);
}
