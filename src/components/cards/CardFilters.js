import { ALL_COLORS, ALL_TAGS, COLOR_CONFIG, KEYWORD_STYLES, TAGS_IMG } from "../../lib/cards/data";
import { COLORS, FONT_MONO } from "../../lib/data";
import Image from "next/image";

export default function CardFilters({
	search,
	setSearch,
	selectedColors,
	toggleColor,
	selectedTags,
	toggleTag,
	costRange,
	setCostRange,
	hasFilters,
	clearFilters,
	selectedAttribute,
	toggleAttribute,
	releaseSet,
	setReleaseSet
}) {
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
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: COLORS.text, marginBottom: 10, fontFamily: FONT_MONO }}>SEARCH</div>
				<div style={{ position: "relative" }}>
					<span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: COLORS.textDim, fontSize: 14 }}>⚔</span>
					<input className="search-input" placeholder="Name or ability text..." value={search} onChange={e => setSearch(e.target.value)} />
				</div>
			</div>

			{/* Cost */}
			<div>
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: COLORS.text, marginBottom: 10, fontFamily: FONT_MONO, display: "flex", justifyContent: "space-between" }}>
					<span>COST</span>
					<span style={{ color: COLORS.textMuted }}>{costRange[0]}–{costRange[1]}</span>
				</div>
				<div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
					{[0,1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
						<div key={n} onClick={() => setCostRange([n, Math.max(n, costRange[1])])} style={{
							width: 22, height: 22, borderRadius: 0, cursor: "pointer",
							background: n >= costRange[0] && n <= costRange[1] ? "color-mix(in srgb, var(--accent) 13%, transparent)" : COLORS.bgCard,
							border: `1px solid ${n >= costRange[0] && n <= costRange[1] ? COLORS.accentDim : COLORS.border}`,
							display: "flex", alignItems: "center", justifyContent: "center",
							fontSize: 10, color: n >= costRange[0] && n <= costRange[1] ? COLORS.accent : COLORS.textDim,
							fontFamily: FONT_MONO, transition: "all 0.15s",
						}}>{n}</div>
					))}
				</div>
				<input type="range" min={0} max={10} value={costRange[1]} className="range-slider"
					onChange={e => setCostRange([costRange[0], parseInt(e.target.value)])} />
			</div>

			{/* Colors */}
			<div>
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: COLORS.text, marginBottom: 10, fontFamily: FONT_MONO }}>CARD DOMAIN</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
					{ALL_COLORS.map(color => {
						const c      = COLOR_CONFIG[color];
						const active = selectedColors.includes(color);
						return (
							<button key={color} className="filter-btn" onClick={() => toggleColor(color)} style={{
								display: "flex", alignItems: "center", gap: 8, textAlign: "left",
								background: active ? c.bg : COLORS.bgRaised,
								borderColor: active ? c.glow + "88" : COLORS.border,
								color: active ? c.accent : COLORS.textMuted,
								boxShadow: active ? `0 0 10px ${c.glow}33` : "none",
							}}>
								<div style={{ display: "flex" }}>
									<Image src={c.icon} alt={color} width={16} height={16} style={{ marginRight: 10 }} />
									<span style={{ fontSize: 13 }}>{color}</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Type */}
			<div>
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: COLORS.text, marginBottom: 10, fontFamily: FONT_MONO }}>TYPE</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
					{ALL_TAGS.map(tag => {
						const active = selectedTags.includes(tag);
						return (
							<button key={tag} className="filter-btn" onClick={() => toggleTag(tag)} style={{
								background: active ? COLORS.bgHover : COLORS.bgRaised,
								borderColor: active ? COLORS.accentDim : COLORS.border,
								color: active ? COLORS.accent : COLORS.textDim,
								textAlign: "left",
							}}>
								<div style={{ display: "flex" }}>
									<Image src={TAGS_IMG[tag]} alt={tag} width={16} height={16} style={{ marginRight: 10 }} />
									<span style={{ fontSize: 13 }}>{tag}</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Additional attributes */}
			<div>
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: COLORS.text, marginBottom: 10, fontFamily: FONT_MONO }}>ATTRIBUTES</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
					{Object.keys(KEYWORD_STYLES).map(attribute => {
						const active = selectedAttribute.includes(attribute);
						return (
							<button key={attribute} className="filter-attribute-btn" onClick={() => toggleAttribute(attribute)} style={{
								...KEYWORD_STYLES[attribute],
								opacity: active ? 1 : 0.5,
							}}>
								<span style={{ fontSize: 13 }}>{attribute}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Set filters */}
			<div>
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: COLORS.text, marginBottom: 10, fontFamily: FONT_MONO }}>SET</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
					{["Proving Grounds", "Origins", "Spiritforged", "Unleashed"].map(attribute => {
						const active = releaseSet === attribute;
						return (
							<button key={attribute} className="filter-attribute-btn" onClick={() => setReleaseSet(prev => prev === attribute ? null : attribute)} style={{
								...KEYWORD_STYLES[attribute],
								opacity: active ? 1 : 0.5,
							}}>
								<span style={{ fontSize: 13 }}>{attribute}</span>
							</button>
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
