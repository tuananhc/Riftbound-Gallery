import { ALL_COLORS, ALL_TAGS, COLOR_CONFIG, COLORS } from "../../lib/data";

export default function CardFilters({ search, setSearch, selectedColors, toggleColor, selectedTags, toggleTag, costRange, setCostRange, hasFilters, clearFilters }) {
	return (
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
						const c      = COLOR_CONFIG[color];
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
				<button className="clear-btn" onClick={clearFilters}>✕ CLEAR FILTERS</button>
			)}
		</aside>
	);
}
