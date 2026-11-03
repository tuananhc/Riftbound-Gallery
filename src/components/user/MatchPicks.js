"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { COLORS, FONT_MONO, alpha } from "../../lib/data";
import { legendLabel } from "../../lib/cards/data";
import RuneIcons from "../cards/RuneIcons";
import { scoreOptions, bestOf } from "../../lib/matchStats";
import { NoteIcon } from "./MatchNotes";

// ── Match row picks ──────────────────────────────────────────────────────────
// The controls a match row is made of — your legend, the final score, the
// opponent's legend and the note toggle — shared by the official History rows
// (UserProfile) and the unofficial ones (UnofficialMatches).

// ── Result pick ──────────────────────────────────────────────────────────────
// An unofficial match's result, where an official row shows BoundRift's. Click
// opens WIN / LOSS / DRAW. `value` is "WIN" | "LOSS" | "DRAW" | null.

const RESULT_COLOR = { WIN: COLORS.win, LOSS: COLORS.loss, DRAW: COLORS.draw };

export function ResultPick({ value, onSelect }) {
	const [open, setOpen] = useState(false);
	const pick = result => { onSelect(result); setOpen(false); };
	const color = RESULT_COLOR[value] ?? COLORS.textDim;

	return (
		<div style={{ position: "relative" }} onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}>
			<button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={value ? `Result ${value} — click to change` : "Set the result"}
				onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accentDim; }}
				onMouseLeave={e => { e.currentTarget.style.borderColor = value ? "transparent" : COLORS.borderHover; }}
				style={{
					height: 22, minWidth: 48, padding: "0 4px", borderRadius: 0, cursor: "pointer",
					background: open ? COLORS.bgHover : "transparent",
					border: `1px ${value ? "solid" : "dashed"} ${value ? "transparent" : COLORS.borderHover}`,
					color, fontFamily: FONT_MONO, fontSize: value ? 11 : 9, fontWeight: 700, letterSpacing: value ? "0.08em" : "0.14em",
					transition: "border-color 0.15s",
				}}>
				{value ?? "RESULT"}
			</button>

			{open && (
				<>
					{/* click-away backdrop */}
					<div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
					<div style={{
						position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", zIndex: 50,
						background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, boxShadow: `0 8px 24px ${COLORS.shadow}`,
						padding: 8, fontFamily: FONT_MONO,
					}}>
						<div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.14em", marginBottom: 6, whiteSpace: "nowrap" }}>RESULT</div>
						<div style={{ display: "flex", gap: 4 }}>
							{["WIN", "LOSS", "DRAW"].map(result => {
								const selected = result === value;
								return (
									<button key={result} onClick={() => pick(result)}
										onMouseEnter={e => { if (!selected) e.currentTarget.style.background = COLORS.bgHover; }}
										onMouseLeave={e => { if (!selected) e.currentTarget.style.background = COLORS.bgRaised; }}
										style={{
											width: 52, height: 32, background: selected ? alpha(RESULT_COLOR[result], 14) : COLORS.bgRaised,
											border: `1px solid ${selected ? RESULT_COLOR[result] : COLORS.border}`, borderRadius: 0, cursor: "pointer",
											color: RESULT_COLOR[result], fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
											transition: "background 0.15s",
										}}>
										{result}
									</button>
								);
							})}
						</div>
					</div>
				</>
			)}
		</div>
	);
}

// ── Score pick ───────────────────────────────────────────────────────────────
// The final game score, between the result and the Elo change. Click opens a
// small menu of the scores that fit the result (best of 3, then best of 1),
// plus ✕ to clear one already set.

export function ScorePick({ result, value, onSelect }) {
	const [open, setOpen] = useState(false);
	const options = scoreOptions(result);
	const pick = score => { onSelect(score); setOpen(false); };

	return (
		<div style={{ position: "relative" }} onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}>
			<button onClick={() => setOpen(o => !o)} aria-expanded={open}
				title={value ? `Best of ${bestOf(value)} — click to change` : "Set the final score"}
				onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accentDim; e.currentTarget.style.color = COLORS.accent; }}
				onMouseLeave={e => { e.currentTarget.style.borderColor = value ? COLORS.border : COLORS.borderHover; e.currentTarget.style.color = value ? COLORS.textStrong : COLORS.textDim; }}
				style={{
					height: 22, minWidth: 40, padding: "0 6px", borderRadius: 0, cursor: "pointer",
					background: open ? COLORS.bgHover : "transparent",
					border: `1px ${value ? "solid" : "dashed"} ${value ? COLORS.border : COLORS.borderHover}`,
					color: value ? COLORS.textStrong : COLORS.textDim, fontFamily: FONT_MONO,
					fontSize: value ? 13 : 9, fontWeight: 700, letterSpacing: value ? "0.04em" : "0.14em",
					transition: "border-color 0.15s, color 0.15s",
				}}>
				{value ?? "SCORE"}
			</button>

			{open && (
				<>
					{/* click-away backdrop */}
					<div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
					<div style={{
						position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", zIndex: 50,
						background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, boxShadow: `0 8px 24px ${COLORS.shadow}`,
						padding: 8, fontFamily: FONT_MONO,
					}}>
						<div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.14em", marginBottom: 6, whiteSpace: "nowrap" }}>FINAL SCORE</div>
						<div style={{ display: "flex", gap: 4 }}>
							{options.map(score => {
								const selected = score === value;
								return (
									<button key={score} onClick={() => pick(score)} title={`Best of ${bestOf(score)}`}
										onMouseEnter={e => { if (!selected) e.currentTarget.style.background = COLORS.bgHover; }}
										onMouseLeave={e => { if (!selected) e.currentTarget.style.background = COLORS.bgRaised; }}
										style={{
											width: 48, height: 42, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
											background: selected ? alpha(COLORS.accent, 14) : COLORS.bgRaised,
											border: `1px solid ${selected ? COLORS.accent : COLORS.border}`, borderRadius: 0, cursor: "pointer",
											fontFamily: FONT_MONO, transition: "background 0.15s",
										}}>
										<span style={{ fontSize: 13, fontWeight: 700, color: selected ? COLORS.accent : COLORS.textStrong }}>{score}</span>
										<span style={{ fontSize: 8, letterSpacing: "0.1em", color: COLORS.textDim }}>BO{bestOf(score)}</span>
									</button>
								);
							})}
							{value && (
								<button onClick={() => pick(null)} title="Clear the score"
									onMouseEnter={e => { e.currentTarget.style.color = COLORS.loss; }}
									onMouseLeave={e => { e.currentTarget.style.color = COLORS.textDim; }}
									style={{
										width: 32, height: 42, background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 0,
										color: COLORS.textDim, fontFamily: FONT_MONO, fontSize: 12, cursor: "pointer", transition: "color 0.15s",
									}}>
									✕
								</button>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}

// ── Legend pick ──────────────────────────────────────────────────────────────
// One side of a match row: "[icon] Player - Legend - runes", with the icon on
// the outer edge (mirrored on the right). Click opens the legend picker, which
// is portalled to <body> so no other card on the page can cover it.

// Tallest the legend picker gets; it opens upward when there isn't this much room below.
const PICKER_MAX_HEIGHT = 360;
const PICKER_GAP = 4;
const PICK_ICON_SIZE = 32;

// `fillEvent` ({ count, on, onToggle }) adds the "apply to all matches in this
// event" checkbox; only your own side passes it.
export function LegendPick({ champions, value, onSelect, player, side, fillEvent }) {
	const [open, setOpen] = useState(false);
	// Champions whose S3 icon 404s — those fall back to the card art.
	const [iconless, setIconless] = useState([]);
	const [pos, setPos] = useState(null);
	const [search, setSearch] = useState("");
	const buttonRef = useRef(null);
	const pickerRef = useRef(null);
	const champ = champions.find(c => c.id === value);
	const isLeft = side === "left";
	const term = search.trim().toLowerCase();
	const filtered = champions.filter(c =>
		c.tags_text.toLowerCase().includes(term) ||
		c.name.toLowerCase().includes(term)
	);
	const close = () => { setOpen(false); setSearch(""); };
	const pick = (id) => { onSelect(id); close(); };

	function openPicker() {
		// Measure on open: flip above the button if the picker would run past the
		// bottom of the viewport and there's more room above.
		const rect = buttonRef.current.getBoundingClientRect();
		const { clientWidth, clientHeight } = document.documentElement;
		const spaceBelow = clientHeight - rect.bottom - PICKER_GAP;
		const spaceAbove = rect.top - PICKER_GAP;
		const up = spaceBelow < PICKER_MAX_HEIGHT && spaceAbove > spaceBelow;
		setPos({
			...(up ? { bottom: clientHeight - rect.top + PICKER_GAP } : { top: rect.bottom + PICKER_GAP }),
			...(isLeft ? { left: rect.left } : { right: clientWidth - rect.right }),
			maxHeight: Math.min(PICKER_MAX_HEIGHT, (up ? spaceAbove : spaceBelow) - 8),
		});
		setOpen(true);
	}

	// The picker is fixed to the viewport, so close it rather than leave it
	// floating away from its row when the page scrolls or resizes.
	useEffect(() => {
		if (!open) return;
		const dismiss = () => { setOpen(false); setSearch(""); };
		const onScroll = e => { if (!pickerRef.current?.contains(e.target)) dismiss(); };
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", dismiss);
		return () => {
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", dismiss);
		};
	}, [open]);

	const iconFor = (c, size) => c.icon && !iconless.includes(c.id)
		? <Image src={c.icon} alt="" fill sizes={`${size}px`} style={{ objectFit: "cover" }}
			onError={() => setIconless(prev => prev.includes(c.id) ? prev : [...prev, c.id])} />
		: c.image && <Image src={c.image} alt="" fill sizes={`${size}px`} style={{ objectFit: "cover", objectPosition: "top" }} />;

	const icon = (
		<div style={{
			position: "relative", width: PICK_ICON_SIZE, height: PICK_ICON_SIZE, flexShrink: 0, overflow: "hidden",
			background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`,
			display: "flex", alignItems: "center", justifyContent: "center",
			color: COLORS.textDim, fontSize: 14, fontFamily: FONT_MONO,
		}}>
			{champ ? iconFor(champ, PICK_ICON_SIZE) : "+"}
		</div>
	);

	return (
		<div style={{ minWidth: 0, display: "flex", justifyContent: isLeft ? "flex-start" : "flex-end" }}>
			<button ref={buttonRef}
				onClick={() => open ? close() : openPicker()}
				title={champ ? legendLabel(champ) : "Pick a legend"}
				onMouseEnter={e => { e.currentTarget.style.background = COLORS.bgHover; }}
				onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
				style={{
					display: "flex", alignItems: "center", gap: 8, minWidth: 0, maxWidth: "100%",
					background: open ? COLORS.bgHover : "transparent", border: "none", borderRadius: 0,
					padding: "4px 6px", cursor: "pointer", transition: "background 0.15s",
				}}>
				{isLeft && icon}
				<span style={{
					minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
					fontSize: 13, fontFamily: FONT_MONO, color: COLORS.text,
				}}>
					{player}
					<span style={{ color: COLORS.textDim }}> - </span>
					<span style={{ color: champ ? COLORS.accent : COLORS.textDim }}>{champ ? champ.tags_text : "pick legend"}</span>
				</span>
				{champ?.domains.length > 0 && (
					<span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0, fontSize: 13, fontFamily: FONT_MONO, color: COLORS.textDim }}>
						-<RuneIcons domains={champ.domains} />
					</span>
				)}
				{!isLeft && icon}
			</button>

			{open && createPortal(
				<>
					{/* click-away backdrop */}
					<div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
					<div ref={pickerRef} style={{
						position: "fixed", ...pos, zIndex: 1000,
						width: 330, maxWidth: "calc(100vw - 32px)",
						display: "flex", flexDirection: "column",
						background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 0,
						boxShadow: `0 8px 24px ${COLORS.shadow}`,
					}}>
						{/* Search stays pinned above the scrolling list; Enter picks the top match. */}
						<div style={{ padding: 8, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
							<input
								autoFocus
								value={search}
								onChange={e => setSearch(e.target.value)}
								onKeyDown={e => {
									if (e.key === "Enter" && filtered.length > 0) pick(filtered[0].id);
									if (e.key === "Escape") close();
								}}
								onFocus={e => { e.target.style.borderColor = COLORS.accentDim; }}
								onBlur={e => { e.target.style.borderColor = COLORS.borderHover; }}
								placeholder="Search legends..."
								style={{
									width: "100%", background: COLORS.bg,
									border: `1px solid ${COLORS.borderHover}`, borderRadius: 0,
									padding: "6px 10px", fontSize: 12,
									color: COLORS.text, outline: "none",
									fontFamily: FONT_MONO,
								}}
							/>
						</div>
						{fillEvent?.count > 1 && (
							<div role="checkbox" aria-checked={fillEvent.on} tabIndex={0}
								onClick={fillEvent.onToggle}
								onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); fillEvent.onToggle(); } }}
								onMouseEnter={e => { e.currentTarget.style.color = COLORS.text; }}
								onMouseLeave={e => { e.currentTarget.style.color = COLORS.textMuted; }}
								style={{
									display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", flexShrink: 0,
									borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", userSelect: "none",
									fontSize: 11, color: COLORS.textMuted, fontFamily: FONT_MONO, transition: "color 0.15s",
								}}>
								<span style={{
									width: 13, height: 13, flexShrink: 0,
									display: "flex", alignItems: "center", justifyContent: "center",
									border: `1px solid ${fillEvent.on ? COLORS.accent : COLORS.borderHover}`,
									background: fillEvent.on ? COLORS.accent : "transparent",
									color: COLORS.bg, fontSize: 10, fontWeight: 700, lineHeight: 1,
								}}>
									{fillEvent.on && "✓"}
								</span>
								Apply to all {fillEvent.count} matches in this event
							</div>
						)}
						<div style={{ overflowY: "auto", flex: 1 }}>
							{/* Undo a wrong pick; saving then removes it from the stored match too. */}
							{champ && !term && (
								<div
									onClick={() => pick(null)}
									onMouseEnter={e => { e.currentTarget.style.background = COLORS.bgHover; }}
									onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
									style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 12px", cursor: "pointer", transition: "background 0.15s", borderBottom: `1px solid ${COLORS.border}` }}>
									<div style={{ width: 35, height: 35, flexShrink: 0, background: COLORS.bg, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textDim, fontFamily: FONT_MONO, fontSize: 14 }}>
										✕
									</div>
									<span style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: FONT_MONO }}>Clear pick</span>
								</div>
							)}
							{filtered.length === 0 && (
								<div style={{ padding: "12px 14px", fontSize: 11, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.06em" }}>
									{champions.length === 0 ? "No legends found." : <>No legends match &ldquo;{search}&rdquo;.</>}
								</div>
							)}
							{filtered.map(c => (
								<div key={c.id}
									onClick={() => pick(c.id)}
									onMouseEnter={e => { e.currentTarget.style.background = COLORS.bgHover; }}
									onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
									style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 12px", cursor: "pointer", transition: "background 0.15s" }}>
									<div style={{ position: "relative", width: 35, height: 35, overflow: "hidden", background: COLORS.bg, flexShrink: 0 }}>
										{iconFor(c, 35)}
									</div>
									<span style={{
										fontSize: 14, color: c.id === value ? COLORS.accent : COLORS.text, fontFamily: FONT_MONO,
										minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
									}}>
										{legendLabel(c)}
									</span>
								</div>
							))}
						</div>
					</div>
				</>,
				document.body
			)}
		</div>
	);
}


// ── Note toggle ──────────────────────────────────────────────────────────────
// The last column of a History row: opens the match's note box under the row.
// Blue once the match has a note, which shows as its tooltip.

export function NoteToggle({ open, note, onClick }) {
	const has = Boolean(note?.trim());
	const color = open || has ? COLORS.accent : COLORS.textDim;
	return (
		<button onClick={onClick} aria-expanded={open} aria-label={has ? "Edit note" : "Add a note"} title={has ? note.trim() : "Add a note"}
			onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accentDim; e.currentTarget.style.color = COLORS.accent; }}
			onMouseLeave={e => { e.currentTarget.style.borderColor = open ? COLORS.accentDim : COLORS.border; e.currentTarget.style.color = color; }}
			style={{
				width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
				background: open ? COLORS.bgHover : "transparent", border: `1px solid ${open ? COLORS.accentDim : COLORS.border}`, borderRadius: 0,
				color, cursor: "pointer", transition: "all 0.15s",
			}}>
			<NoteIcon filled={has} />
		</button>
	);
}
