"use client";
import { useRef } from "react";
import Image from "next/image";
import { COLORS, FONT_MONO, LAYOUT, SHOW, alpha } from "../../lib/data";
import { ALL_COLORS, ALL_TAGS, KEYWORD_STYLES, TAGS_IMG, runeIconPng } from "../../lib/cards/data";
import BottomSheet from "../BottomSheet";
import Dropdown from "../Dropdown";
import CardText from "./CardText";
import { SECTIONS } from "./DeckPanel";

// ── Cards on phones ──────────────────────────────────────────────────────────
// The search header pinned over the grid, the floating deck button, and the
// three bottom sheets (filters, card detail, deck builder). CardGrid owns the
// state; these only render it.

export const SETS = ["Proving Grounds", "Origins", "Spiritforged", "Unleashed"];
export const SORT_OPTIONS = [["name", "Name"], ["cost", "Cost"], ["rarity", "Rarity"]];
const COST_MAX = 12;

const LABEL = { fontSize: 10, letterSpacing: "0.14em", color: COLORS.text };
const primary = {
	height: 48, background: COLORS.accent, border: `1px solid ${COLORS.accent}`, color: COLORS.bg, cursor: "pointer",
	fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.12em", fontWeight: 700,
};
const secondary = {
	height: 48, padding: "0 16px", background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, color: COLORS.text, cursor: "pointer",
	fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700,
};
// Selected / unselected look for filter toggles — accent, never the rune colour.
const toggle = on => ({
	background: on ? alpha(COLORS.accent, 13) : COLORS.bgRaised,
	border: `1px solid ${on ? COLORS.accentDim : COLORS.border}`,
	color: on ? COLORS.accent : COLORS.textMuted,
});

// Active filters as removable chips, in the order the filter sheet lists them.
export function filterChips(f) {
	const chips = [];
	if (f.costRange[0] > 0 || f.costRange[1] < COST_MAX) chips.push({ label: `COST ${f.costRange[0]}–${f.costRange[1]}`, clear: () => f.setCostRange([0, COST_MAX]) });
	f.selectedColors.forEach(c => chips.push({ label: c.toUpperCase(), clear: () => f.toggleColor(c) }));
	f.selectedTags.forEach(t => chips.push({ label: t.toUpperCase(), clear: () => f.toggleTag(t) }));
	f.selectedAttribute.forEach(a => chips.push({ label: a.toUpperCase(), clear: () => f.toggleAttribute(a) }));
	if (f.releaseSet) chips.push({ label: f.releaseSet.toUpperCase(), clear: () => f.setReleaseSet(null) });
	return chips;
}

// Pinned under the navbar on phones (hidden on desktop by SHOW): search,
// filter button with the active count, chips, and the count + sort line.
export function MobileSearchHeader({ search, setSearch, chips, onClearAll, onOpenFilters, shown, total, sortBy, setSortBy, inputRef }) {
	return (
		<div style={{
			display: SHOW.mobileFlex, flexDirection: "column", gap: 8, position: "sticky", top: LAYOUT.navHeight, zIndex: 5,
			background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}`, padding: "10px 12px 8px", fontFamily: FONT_MONO,
		}}>
			<div style={{ display: "flex", gap: 8 }}>
				<label style={{ flex: 1, minWidth: 0, height: 48, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}` }}>
					<SearchIcon />
					<input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or ability" type="search"
						onFocus={e => { e.currentTarget.parentElement.style.borderColor = COLORS.accent; }}
						onBlur={e => { e.currentTarget.parentElement.style.borderColor = COLORS.border; }}
						style={{ flex: 1, minWidth: 0, height: "100%", background: "transparent", border: "none", outline: "none", color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: 16, caretColor: COLORS.accent }} />
				</label>
				<button onClick={onOpenFilters} aria-label="Filters" style={{
					position: "relative", width: 48, height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
					background: COLORS.bgRaised, border: `1px solid ${chips.length ? COLORS.accentDim : COLORS.border}`, color: COLORS.text, cursor: "pointer", padding: 0,
				}}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4" /></svg>
					{chips.length > 0 && (
						<span style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, padding: "0 4px", background: COLORS.accent, color: COLORS.bg, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{chips.length}</span>
					)}
				</button>
			</div>
			{chips.length > 0 && (
				<div style={{ display: "flex", gap: 6, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", margin: "0 -12px", padding: "0 12px" }}>
					{chips.map(c => (
						<button key={c.label} onClick={c.clear} style={{
							height: 34, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 10px", ...toggle(true),
							fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.08em", cursor: "pointer", whiteSpace: "nowrap",
						}}>{c.label}<span aria-hidden="true">✕</span></button>
					))}
					<button onClick={onClearAll} style={{ height: 34, flexShrink: 0, padding: "0 10px", background: "transparent", border: "none", color: COLORS.textMuted, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.1em", cursor: "pointer", whiteSpace: "nowrap" }}>CLEAR ALL</button>
				</div>
			)}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<span style={{ fontSize: 11, color: COLORS.textDim }}><span style={{ color: COLORS.text }}>{shown}</span> of {total} cards</span>
				<Dropdown variant="text" label="SORT" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
			</div>
		</div>
	);
}

function SearchIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.textDim} strokeWidth="2.2" aria-hidden="true" style={{ flexShrink: 0 }}>
			<circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" />
		</svg>
	);
}

// Floating in the thumb zone on phones.
export function DeckFab({ total, onClick }) {
	return (
		<button onClick={onClick} style={{
			display: SHOW.mobileFlex, position: "fixed", right: 12, bottom: "calc(12px + env(safe-area-inset-bottom))", zIndex: 20,
			height: 52, alignItems: "center", gap: 12, padding: "0 16px", background: COLORS.accent, border: `1px solid ${COLORS.accent}`,
			color: COLORS.bg, fontFamily: FONT_MONO, cursor: "pointer", boxShadow: `0 8px 24px ${COLORS.shadow}`,
		}}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true"><path d="M3 10h18v11H3zM5 6.5h14M7 3h10" /></svg>
			<span style={{ fontSize: 11, letterSpacing: "0.14em", fontWeight: 700 }}>DECK</span>
			<span style={{ fontSize: 15, fontWeight: 900 }}>{total}<span style={{ fontSize: 11, fontWeight: 500 }}>/40</span></span>
		</button>
	);
}

// ── Filter sheet ─────────────────────────────────────────────────────────────

export function FilterSheet({ f, shown, onClose }) {
	const [lo, hi] = f.costRange;
	return (
		<BottomSheet title="FILTERS" height="88%" onClose={onClose}
			actions={<button onClick={f.clearFilters} style={{ height: 44, padding: "0 12px", background: "transparent", border: "none", color: COLORS.textMuted, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", cursor: "pointer" }}>RESET</button>}
			footer={<>
				<button onClick={f.clearFilters} style={secondary}>CLEAR</button>
				<button onClick={onClose} style={{ ...primary, flex: 1 }}>SHOW {shown} CARDS</button>
			</>}>
			<div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 22 }}>
				<section>
					<div style={{ ...LABEL, display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
						<span>COST</span><span style={{ color: COLORS.accent }}>{lo}–{hi}</span>
					</div>
					{/* Tap a number to set the low end; drag the range to set the high end. */}
					<div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5 }}>
						{Array.from({ length: COST_MAX + 1 }, (_, n) => (
							<button key={n} onClick={() => f.setCostRange([n, Math.max(n, hi)])} style={{
								height: 42, padding: 0, ...toggle(n >= lo && n <= hi), fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, cursor: "pointer",
							}}>{n}</button>
						))}
					</div>
					<CostRange lo={lo} hi={hi} onChange={f.setCostRange} />
				</section>
				<section>
					<div style={{ ...LABEL, marginBottom: 10 }}>CARD DOMAIN</div>
					<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
						{ALL_COLORS.map(c => (
							<button key={c} onClick={() => f.toggleColor(c)} style={{
								height: 48, display: "flex", alignItems: "center", gap: 8, padding: "0 10px", ...toggle(f.selectedColors.includes(c)),
								fontFamily: FONT_MONO, fontSize: 12, cursor: "pointer",
							}}><Image src={runeIconPng(c)} alt="" width={18} height={18} />{c}</button>
						))}
					</div>
				</section>
				<section>
					<div style={{ ...LABEL, marginBottom: 10 }}>TYPE</div>
					<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
						{ALL_TAGS.map(t => (
							<button key={t} onClick={() => f.toggleTag(t)} style={{
								height: 48, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", ...toggle(f.selectedTags.includes(t)),
								fontFamily: FONT_MONO, fontSize: 12, cursor: "pointer",
							}}><Image src={TAGS_IMG[t]} alt="" width={18} height={18} />{t}</button>
						))}
					</div>
				</section>
				<section>
					<div style={{ ...LABEL, marginBottom: 10 }}>ATTRIBUTES</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "8px 6px" }}>
						{Object.keys(KEYWORD_STYLES).map(a => (
							<button key={a} onClick={() => f.toggleAttribute(a)} aria-pressed={f.selectedAttribute.includes(a)} style={{
								height: 36, padding: "0 12px", border: "none", ...KEYWORD_STYLES[a], opacity: f.selectedAttribute.includes(a) ? 1 : 0.45,
								fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer",
							}}>{a}</button>
						))}
					</div>
				</section>
				<section>
					<div style={{ ...LABEL, marginBottom: 10 }}>SET</div>
					<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
						{SETS.map(set => (
							<button key={set} onClick={() => f.setReleaseSet(prev => prev === set ? null : set)} style={{
								height: 44, ...toggle(f.releaseSet === set), fontFamily: FONT_MONO, fontSize: 12, cursor: "pointer",
							}}>{set}</button>
						))}
					</div>
				</section>
			</div>
		</BottomSheet>
	);
}

// Two-handle range: press anywhere on the track and the nearer handle follows
// the finger, snapping to whole costs.
function CostRange({ lo, hi, onChange }) {
	const track = useRef(null);
	const handle = useRef(null);
	const valueAt = clientX => {
		const rect = track.current.getBoundingClientRect();
		return Math.round(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * COST_MAX);
	};
	const move = e => {
		const v = valueAt(e.clientX);
		onChange(handle.current === "lo" ? [Math.min(v, hi), hi] : [lo, Math.max(v, lo)]);
	};
	const pct = v => (v / COST_MAX) * 100;
	const knob = { position: "absolute", top: 4, width: 20, height: 20, background: COLORS.bgCard, border: `2px solid ${COLORS.accent}` };
	return (
		<div ref={track} role="group" aria-label={`Cost ${lo} to ${hi}`}
			onPointerDown={e => {
				const v = valueAt(e.clientX);
				handle.current = Math.abs(v - lo) <= Math.abs(v - hi) && v <= hi ? "lo" : "hi";
				e.currentTarget.setPointerCapture(e.pointerId);
				move(e);
			}}
			onPointerMove={e => { if (handle.current) move(e); }}
			onPointerUp={() => { handle.current = null; }}
			style={{ position: "relative", height: 28, margin: "10px 10px 0", touchAction: "none", cursor: "pointer" }}>
			<span style={{ position: "absolute", left: 0, right: 0, top: 13, height: 2, background: COLORS.border }} />
			<span style={{ position: "absolute", top: 13, height: 2, background: COLORS.accent, left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
			<span style={{ ...knob, left: `calc(${pct(lo)}% - 10px)` }} />
			<span style={{ ...knob, left: `calc(${pct(hi)}% - 10px)` }} />
		</div>
	);
}

// ── Card detail sheet ────────────────────────────────────────────────────────

export function CardDetailSheet({ card, count, max, onAdd, onRemove, onClose }) {
	const domains = ALL_COLORS.filter(c => card.domain_text?.includes(c));
	const type = ALL_TAGS.find(t => card.card_type_text?.includes(t));
	const isBattlefield = card.card_type_text?.includes("Battlefield");
	const fields = [
		["DOMAIN", card.domain_text || "Colorless", domains[0] && runeIconPng(domains[0])],
		["TYPE", card.card_type_text, type && TAGS_IMG[type]],
		["TAGS", card.tags_text],
		["ARTIST", card.artist_text],
	].filter(([, v]) => v);
	const full = count >= max;
	return (
		<BottomSheet height="92%" onClose={onClose} title={card.name.toUpperCase()}
			subtitle={[card.card_set_text, card.id, card.rarity_text].filter(Boolean).join(" · ").toUpperCase()}
			footer={<>
				<div style={{ display: "flex", alignItems: "center", border: `1px solid ${COLORS.borderHover}`, height: 48 }}>
					<button onClick={onRemove} disabled={!count} aria-label="Remove one" style={{ width: 44, height: 46, background: COLORS.bgRaised, border: "none", color: COLORS.text, fontFamily: FONT_MONO, fontSize: 18, cursor: "pointer", opacity: count ? 1 : 0.4 }}>−</button>
					<span style={{ width: 52, textAlign: "center", fontSize: 14, fontWeight: 700, color: COLORS.accent }}>{count}<span style={{ color: COLORS.textDim, fontWeight: 500 }}>/{max}</span></span>
					<button onClick={onAdd} disabled={full} aria-label="Add one" style={{ width: 44, height: 46, background: COLORS.bgRaised, border: "none", color: COLORS.text, fontFamily: FONT_MONO, fontSize: 18, cursor: "pointer", opacity: full ? 0.4 : 1 }}>+</button>
				</div>
				<button onClick={onAdd} disabled={full} style={{
					...primary, flex: 1, fontSize: 11, whiteSpace: "nowrap",
					background: full ? COLORS.bgHover : COLORS.accent, borderColor: full ? COLORS.bgHover : COLORS.accent, color: full ? COLORS.textDim : COLORS.bg,
					cursor: full ? "default" : "pointer",
				}}>{full ? "MAX COPIES" : `ADD TO DECK${count ? ` (${count}/${max})` : ""}`}</button>
			</>}>
			<div style={{ background: COLORS.bg, padding: "16px 0", display: "flex", justifyContent: "center", borderBottom: `1px solid ${COLORS.border}` }}>
				<div style={{ position: "relative", width: "56%", aspectRatio: "744 / 1039" }}>
					{card.image && (
						<Image src={card.image} alt={card.name} fill sizes="60vw" style={{ objectFit: "contain", transform: isBattlefield ? "rotate(90deg) scale(0.72)" : "none" }} />
					)}
				</div>
			</div>
			{card.banned && (
				<div style={{ margin: "12px 16px 0", display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: COLORS.textMuted }}>
					<span style={{ background: "#e84a4a", color: "#e8e8e8", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", padding: "4px 8px" }}>BANNED</span>
					{card.banned_announcement && <a href={card.banned_announcement} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accent, textDecoration: "underline" }}>View announcement</a>}
				</div>
			)}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderBottom: `1px solid ${COLORS.border}` }}>
				{[["ENERGY", card.energy_text], ["MIGHT", card.might_text], ["POWER", card.power_text]].map(([k, v], i) => (
					<div key={k} style={{ padding: "12px 16px", borderRight: i < 2 ? `1px solid ${COLORS.border}` : "none", display: "flex", flexDirection: "column", gap: 2 }}>
						<span style={{ fontSize: 9, letterSpacing: "0.14em", color: COLORS.textDim }}>{k}</span>
						<span style={{ fontSize: 20, fontWeight: 700, color: COLORS.textStrong }}>{v || "—"}</span>
					</div>
				))}
			</div>
			<div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column" }}>
				{fields.map(([k, v, img]) => (
					<div key={k} style={{ display: "grid", gridTemplateColumns: "76px minmax(0, 1fr)", gap: 12, alignItems: "center", minHeight: 40, borderBottom: `1px solid ${COLORS.border}` }}>
						<span style={{ fontSize: 9, letterSpacing: "0.14em", color: COLORS.textDim }}>{k}</span>
						<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.text }}>
							{img && <Image src={img} alt="" width={16} height={16} />}{v}
						</span>
					</div>
				))}
				{[["ABILITY", card.ability_text], ["EFFECT", card.effect_text], ["MIGHT BONUS", card.might_bonus_text]].filter(([, t]) => t).map(([k, t]) => (
					<div key={k} style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
						<span style={{ fontSize: 9, letterSpacing: "0.14em", color: COLORS.textDim }}>{k}</span>
						<p style={{ fontSize: 13, lineHeight: 1.75, color: COLORS.text }}><CardText text={t} /></p>
					</div>
				))}
			</div>
		</BottomSheet>
	);
}

// ── Deck builder sheet ───────────────────────────────────────────────────────

const PHONE_SECTION_ORDER = ["Units", "Spells", "Gears", "Runes", "Battlefields"];

export function DeckSheet({ deck, deckTotal, legendId, championId, onAdd, onRemove, onCopyList, onClear, onBrowseLegends, onClose }) {
	const legend = deck.find(e => e.card.id === legendId);
	const champion = deck.find(e => e.card.id === championId);
	const sections = PHONE_SECTION_ORDER.map(label => SECTIONS.find(s => s.label === label)).map(({ label, match }) => ({
		label: label.toUpperCase(),
		entries: deck.filter(({ card }) => card.id !== legendId && card.id !== championId && match(card.card_type_text)),
	})).filter(s => s.entries.length);
	const empty = deck.length === 0;
	const badgeColor = empty ? COLORS.textDim : deckTotal === 40 ? COLORS.win : COLORS.loss;
	const hint = <div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em" }}>Max 3 copies per card · 1 legend</div>;
	const step = { width: 40, height: 40, flexShrink: 0, background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, color: COLORS.text, fontFamily: FONT_MONO, fontSize: 16, cursor: "pointer" };

	return (
		<BottomSheet height="90%" onClose={onClose} title="DECK BUILDER"
			actions={<span style={{ fontSize: 10, letterSpacing: "0.08em", padding: "5px 8px", color: badgeColor, background: alpha(badgeColor, 10) }}>{empty ? "EMPTY" : `${deckTotal}/40 CARDS`}</span>}
			footer={<>
				<button onClick={onCopyList} disabled={empty} style={{ ...secondary, flex: 1, background: "transparent", color: COLORS.textMuted, fontWeight: 400, opacity: empty ? 0.5 : 1 }}>COPY LIST</button>
				<button onClick={onClear} style={{ ...secondary, flex: 1, background: "transparent", border: `1px solid ${alpha(COLORS.loss, 45)}`, color: COLORS.loss, fontWeight: 400 }}>CLEAR DECK</button>
			</>}>
			{empty ? (
				<div style={{ minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24, textAlign: "center" }}>
					<span style={{ fontSize: 12, letterSpacing: "0.14em", lineHeight: 2, color: COLORS.textDim }}>CHOOSE A LEGEND<br />TO START BUILDING</span>
					<button onClick={onBrowseLegends} style={{ ...primary, padding: "0 20px", fontSize: 11 }}>BROWSE LEGENDS</button>
					{hint}
				</div>
			) : (
				<div style={{ padding: "4px 0 8px" }}>
					<div style={{ padding: "8px 16px 4px" }}>{hint}</div>
					<div style={{ padding: "6px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
						{[["LEGEND", legend], ["CHOSEN CHAMPION", champion]].filter(([, e]) => e).map(([role, e]) => (
							<div key={role} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: COLORS.textMuted }}>{role}</span>
								<div style={{ display: "flex", gap: 10, alignItems: "center", background: COLORS.bg, border: `1px solid ${COLORS.border}`, padding: 8 }}>
									<span style={{ position: "relative", width: 40, aspectRatio: "744 / 1039", flexShrink: 0, background: COLORS.bgRaised, border: `1px solid ${COLORS.border}` }}>
										{e.card.image && <Image src={e.card.image} alt="" fill sizes="40px" style={{ objectFit: "contain" }} />}
									</span>
									<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
										<span style={{ fontSize: 12, fontWeight: 700, color: COLORS.textStrong, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.card.name}</span>
										<span style={{ display: "flex", gap: 3 }}>
											{ALL_COLORS.filter(c => e.card.domain_text?.includes(c)).map(c => <Image key={c} src={runeIconPng(c)} alt={c} width={13} height={13} />)}
										</span>
									</div>
									<button onClick={() => onRemove(e.card.id)} aria-label={`Remove ${e.card.name}`} style={{ ...step, color: COLORS.textMuted }}>−</button>
								</div>
							</div>
						))}
					</div>
					{sections.map(s => (
						<div key={s.label} style={{ marginTop: 8, borderTop: `1px solid ${COLORS.border}` }}>
							<div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px 4px" }}>
								<span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: COLORS.textMuted }}>{s.label}</span>
								<span style={{ fontSize: 11, color: COLORS.textDim }}>{s.entries.reduce((n, e) => n + e.count, 0)}</span>
							</div>
							{s.entries.map(({ card, count }) => {
								const rune = ALL_COLORS.find(c => card.domain_text?.includes(c));
								return (
									<div key={card.id} style={{ display: "flex", alignItems: "center", gap: 10, height: 48, padding: "0 10px 0 16px" }}>
										<span style={{ width: 22, height: 22, flexShrink: 0, border: `1px solid ${COLORS.borderHover}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: COLORS.textStrong }}>{card.energy_text || "—"}</span>
										<span style={{ flex: 1, minWidth: 0, fontSize: 12, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.name}</span>
										{rune && <Image src={runeIconPng(rune)} alt="" width={14} height={14} />}
										<button onClick={() => onRemove(card.id)} aria-label={`Remove one ${card.name}`} style={step}>−</button>
										<span style={{ width: 18, textAlign: "center", fontSize: 13, fontWeight: 700, color: COLORS.accent }}>{count}</span>
										<button onClick={() => onAdd(card)} disabled={count >= 3} aria-label={`Add one ${card.name}`} style={{ ...step, opacity: count >= 3 ? 0.3 : 1 }}>+</button>
									</div>
								);
							})}
						</div>
					))}
				</div>
			)}
		</BottomSheet>
	);
}
