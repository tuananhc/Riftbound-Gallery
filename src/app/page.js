"use client";
import { useState, useMemo } from "react";
import {
  CARDS, ALL_COLORS, ALL_TAGS, COLOR_CONFIG, RARITY_CONFIG,
  cardGradient, cardGlow, COLORS,
} from "../lib/data";

export default function CardsPage() {
	const [search, setSearch] = useState("");
	const [selectedColors, setSelectedColors] = useState([]);
	const [selectedTags, setSelectedTags] = useState([]);
	const [costRange, setCostRange]	= useState([0, 10]);
	const [selectedCard, setSelectedCard] = useState(null);
	const [sortBy, setSortBy] = useState("name");

	const toggleColor = c => setSelectedColors(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
	const toggleTag	= t => setSelectedTags(p =>	  p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

	const filtered = useMemo(() => {
	return CARDS.filter(card => {
		const nameMatch  = card.name.toLowerCase().includes(search.toLowerCase()) ||
							card.functionality.toLowerCase().includes(search.toLowerCase());
		const colorMatch = selectedColors.length === 0 || selectedColors.every(c => card.colors.includes(c));
		const tagMatch   = selectedTags.length === 0	 || selectedTags.some(t => card.tags.includes(t));
		const costMatch  = card.cost >= costRange[0] && card.cost <= costRange[1];
		return nameMatch && colorMatch && tagMatch && costMatch;
	}).sort((a, b) => {
		if (sortBy === "name")   return a.name.localeCompare(b.name);
		if (sortBy === "cost")   return a.cost - b.cost;
		if (sortBy === "rarity") {
			const order = ["Common", "Uncommon", "Rare", "Mythic", "Legendary"];
			return order.indexOf(b.rarity) - order.indexOf(a.rarity);
		}
		return 0;
	});
  }, [search, selectedColors, selectedTags, costRange, sortBy]);

  const hasFilters = selectedColors.length > 0 || selectedTags.length > 0 || search || costRange[0] > 0 || costRange[1] < 10;

  return (
	<>
	  <style>{`
		.card-item { background: #10121a; border: 1px solid #1e2030; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.25s ease; }
		.card-item:hover { transform: translateY(-3px); }
		.filter-btn { background: #12141e; border: 1px solid #1e2030; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; color: #888; transition: all 0.2s; letter-spacing: 0.05em; }
		.filter-btn:hover { border-color: #444; color: #ccc; }
		.search-input { width: 100%; background: #0d0f17; border: 1px solid #1e2030; border-radius: 8px; padding: 11px 14px 11px 40px; color: #e8e0d0; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 15px; outline: none; transition: border-color 0.2s; }
		.search-input:focus { border-color: #3a4060; }
		.search-input::placeholder { color: #3a3a5a; }
		.sort-select { background: #12141e; border: 1px solid #1e2030; border-radius: 6px; padding: 7px 12px; color: #aaa; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; cursor: pointer; outline: none; }
		.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn 0.2s ease; }
		.modal-card { animation: fadeUp 0.25s ease; }
		.cost-badge { width: 28px; height: 28px; background: #1a1c28; border: 1px solid #2a2c3a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #e8d090; font-family: 'Segoe UI', system-ui, sans-serif; flex-shrink: 0; }
		.tag-chip { display: inline-flex; align-items: center; gap: 4px; background: #1a1c28; border: 1px solid #2a2c3a; border-radius: 4px; padding: 2px 8px; font-size: 11px; color: #888; font-family: 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.04em; }
		.range-slider { -webkit-appearance: none; width: 100%; height: 4px; background: #1e2030; border-radius: 2px; outline: none; }
		.range-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #5a6090; cursor: pointer; border: 2px solid #8890c0; }
		.clear-btn { background: transparent; border: 1px solid #2a1a1a; border-radius: 6px; padding: 8px; color: #6a3a3a; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 10px; letter-spacing: 0.15em; cursor: pointer; transition: all 0.2s; width: 100%; }
		.clear-btn:hover { border-color: #6a2a2a; color: #cc6060; }
	  `}</style>

	  <div style={{ display: "flex", minHeight: "calc(100vh - 62px)" }}>
		{/* ── Sidebar ── */}
		<aside style={{
			width: 240, flexShrink: 0,
			borderRight: `1px solid ${COLORS.border}`,
			padding: "24px 18px",
			display: "flex", flexDirection: "column", gap: 26,
			background: COLORS.bgAlt,
			position: "sticky", top: 62,
			height: "calc(100vh - 62px)", overflowY: "auto",
		}}>
			{/* Search */}
			<div>
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: COLORS.textDim, marginBottom: 10, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>SEARCH</div>
				<div style={{ position: "relative" }}>
				<span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#3a3a5a", fontSize: 14 }}>⚔</span>
				<input className="search-input" placeholder="Name or ability text..." value={search} onChange={e => setSearch(e.target.value)} />
				</div>
			</div>

			{/* Cost */}
			<div>
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: COLORS.textDim, marginBottom: 10, fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex", justifyContent: "space-between" }}>
				<span>COST</span>
				<span style={{ color: "#6a6a8a" }}>{costRange[0]}–{costRange[1]}</span>
				</div>
				<div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
				{[0,1,2,3,4,5,6,7].map(n => (
					<div key={n} onClick={() => setCostRange([n, Math.max(n, costRange[1])])} style={{
					width: 22, height: 22, borderRadius: 4, cursor: "pointer",
					background: n >= costRange[0] && n <= costRange[1] ? "#1e2240" : "#10121a",
					border: `1px solid ${n >= costRange[0] && n <= costRange[1] ? "#3a4070" : "#1e2030"}`,
					display: "flex", alignItems: "center", justifyContent: "center",
					fontSize: 10, color: n >= costRange[0] && n <= costRange[1] ? "#8890c0" : "#2a2a4a",
					fontFamily: "'Segoe UI', system-ui, sans-serif", transition: "all 0.15s",
					}}>{n}</div>
				))}
				</div>
				<input type="range" min={0} max={10} value={costRange[1]} className="range-slider"
				onChange={e => setCostRange([costRange[0], parseInt(e.target.value)])} />
			</div>

			{/* Colors */}
			<div>
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: COLORS.textDim, marginBottom: 10, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>COLOR IDENTITY</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
				{ALL_COLORS.map(color => {
					const c = COLOR_CONFIG[color];
					const active = selectedColors.includes(color);
					return (
					<button key={color} className="filter-btn" onClick={() => toggleColor(color)} style={{
						display: "flex", alignItems: "center", gap: 8, textAlign: "left",
						background: active ? c.bg : "#12141e",
						borderColor: active ? c.glow + "88" : "#1e2030",
						color: active ? c.accent : "#888",
						boxShadow: active ? `0 0 10px ${c.glow}33` : "none",
					}}>
						<span style={{ fontSize: 13 }}>{c.icon}</span>{color.toUpperCase()}
					</button>
					);
				})}
				</div>
			</div>

			{/* Tags */}
			<div>
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: COLORS.textDim, marginBottom: 10, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>TYPE</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
				{ALL_TAGS.map(tag => {
					const active = selectedTags.includes(tag);
					return (
					<button key={tag} className="filter-btn" onClick={() => toggleTag(tag)} style={{
						background: active ? "#1a1f35" : "#12141e",
						borderColor: active ? "#4a5090" : "#1e2030",
						color: active ? "#8890cc" : "#666",
					}}>{tag.toUpperCase()}</button>
					);
				})}
				</div>
			</div>

			{hasFilters && (
				<button className="clear-btn" onClick={() => { setSelectedColors([]); setSelectedTags([]); setSearch(""); setCostRange([0, 10]); }}>
				✕ CLEAR FILTERS
				</button>
			)}
			</aside>

			{/* ── Grid ── */}
			<section style={{ flex: 1, padding: "24px 28px" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
				<div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
				{filtered.length === 0 ? "NO CARDS FOUND" : `${filtered.length} OF ${CARDS.length} CARDS`}
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<span style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>SORT</span>
				<select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
					<option value="name">NAME</option>
					<option value="cost">COST</option>
					<option value="rarity">RARITY</option>
				</select>
				</div>
			</div>

			{filtered.length === 0 ? (
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, color: "#2a2a4a", gap: 12 }}>
				<div style={{ fontSize: 40 }}>🌀</div>
				<div style={{ fontSize: 14, letterSpacing: "0.15em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>THE RIFT REVEALS NOTHING</div>
				</div>
			) : (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
				{filtered.map(card => <CardItem key={card.id} card={card} onClick={() => setSelectedCard(card)} />)}
				</div>
			)}
			</section>
		</div>

		{/* Modal */}
		{selectedCard && (
			<div className="modal-overlay" onClick={() => setSelectedCard(null)}>
			<div className="modal-card" onClick={e => e.stopPropagation()} style={{
				width: 380, maxWidth: "90vw",
				background: cardGradient(selectedCard.colors),
				border: `1px solid ${COLOR_CONFIG[selectedCard.colors[0]].glow}55`,
				borderRadius: 16, padding: 28, position: "relative",
				boxShadow: cardGlow(selectedCard.colors) + ", 0 30px 80px rgba(0,0,0,0.8)",
			}}>
				<button onClick={() => setSelectedCard(null)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "#4a4a6a", fontSize: 18, cursor: "pointer" }}>✕</button>
				<div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
				{selectedCard.colors.map(c => (
					<div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: COLOR_CONFIG[c].glow, boxShadow: `0 0 6px ${COLOR_CONFIG[c].glow}` }} />
				))}
				</div>
				<div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
				<div style={{ fontSize: 20, fontWeight: 700, color: "#f0e8c8", letterSpacing: "0.05em", lineHeight: 1.2, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{selectedCard.name}</div>
				<div className="cost-badge" style={{ marginTop: 2 }}>{selectedCard.cost}</div>
				</div>
				<div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
				<span style={{ color: RARITY_CONFIG[selectedCard.rarity].color, fontSize: 13 }}>{RARITY_CONFIG[selectedCard.rarity].symbol}</span>
				<span style={{ fontSize: 11, letterSpacing: "0.15em", color: RARITY_CONFIG[selectedCard.rarity].color, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{selectedCard.rarity.toUpperCase()}</span>
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
				{selectedCard.colors.map(c => (
					<span key={c} className="tag-chip" style={{ color: COLOR_CONFIG[c].accent, borderColor: COLOR_CONFIG[c].glow + "44" }}>{COLOR_CONFIG[c].icon} {c}</span>
				))}
				{selectedCard.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
				</div>
				<div style={{
				background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)",
				borderRadius: 8, padding: "14px 16px",
				fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 14, color: "#c8c0a8",
				lineHeight: 1.65, fontStyle: "italic",
				}}>{selectedCard.functionality}</div>
				{selectedCard.power !== null && (
				<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
					<div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 16px", fontFamily: "'Segoe UI', system-ui, sans-serif", fontWeight: 700, fontSize: 18, color: "#e8d090" }}>
					{selectedCard.power} / {selectedCard.toughness}
					</div>
				</div>
				)}
			</div>
			</div>
		)}
	</>
  );
}

function CardItem({ card, onClick }) {
	const primary = COLOR_CONFIG[card.colors[0]];
	const rarity	= RARITY_CONFIG[card.rarity];
	return (
		<div className="card-item" onClick={onClick}
			style={{ background: cardGradient(card.colors), borderColor: primary.glow + "33" }}
			onMouseEnter={e => { e.currentTarget.style.boxShadow = cardGlow(card.colors); e.currentTarget.style.borderColor = primary.glow + "77"; }}
			onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = primary.glow + "33"; }}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
				<div style={{ display: "flex", gap: 4 }}>{card.colors.map(c => <span key={c} style={{ fontSize: 13 }}>{COLOR_CONFIG[c].icon}</span>)}</div>
				<div className="cost-badge">{card.cost}</div>
			</div>
			<div style={{ fontSize: 13, fontWeight: 700, color: "#e8d890", letterSpacing: "0.04em", lineHeight: 1.3, marginBottom: 8, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{card.name}</div>
			<div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
				{card.tags.map(t => <span key={t} className="tag-chip" style={{ fontSize: 9, padding: "1px 6px" }}>{t}</span>)}
			</div>
			<div style={{ fontSize: 11, color: "#6a6a8a", fontFamily: "'Segoe UI', system-ui, sans-serif", lineHeight: 1.5, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
				{card.functionality}
			</div>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
				<span style={{ fontSize: 10, color: rarity.color, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{rarity.symbol} {card.rarity.toUpperCase()}</span>
				{card.power !== null && <span style={{ fontSize: 12, color: "#6a6a8a", fontFamily: "'Segoe UI', system-ui, sans-serif", fontWeight: 700 }}>{card.power}/{card.toughness}</span>}
			</div>
		</div>
	);
}
