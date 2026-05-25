"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { COLORS } from "../../lib/data";

const DECK_TYPES = [
	{ id: "all",        label: "ALL" },
	{ id: "tournament", label: "TOURNAMENT" },
	{ id: "submitted",  label: "USER-SUBMITTED" },
];

const RANKINGS = [
	{ id: "popular",  label: "Most Popular" },
	{ id: "winrate",  label: "Highest Win Rate" },
	{ id: "newest",   label: "Newest First" },
	{ id: "oldest",   label: "Oldest First" },
];

const FILTER_DEFAULTS = {
	legend:   "",
	dateFrom: "",
	dateTo:   "",
	deckType: "all",
	ranking:  "popular",
};

function activeCount(filters) {
	return (
		(filters.legend !== "" ? 1 : 0) +
		(filters.dateFrom || filters.dateTo ? 1 : 0) +
		(filters.deckType !== "all" ? 1 : 0) +
		(filters.ranking !== "popular" ? 1 : 0)
	);
}

function LegendSelect({ legends, value, onChange }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	const selected = legends.find(l => l.name === value) ?? null;

	useEffect(() => {
		if (!open) return;
		const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	return (
		<div ref={ref} style={{ position: "relative", minWidth: 260 }}>
			{/* Trigger */}
			<button
				onClick={() => setOpen(o => !o)}
				style={{
					width: "100%", display: "flex", alignItems: "center", gap: 10,
					background: "#12141e", border: `1px solid ${open ? COLORS.gold + "55" : "#2a2c3a"}`,
					borderRadius: 8, padding: "7px 12px",
					cursor: "pointer", transition: "border-color 0.15s",
				}}
			>
				{selected?.image ? (
					<Image src={selected.image} alt={selected.name} width={28} height={28} style={{ objectFit: "contain", borderRadius: 4, flexShrink: 0 }} />
				) : (
					<div style={{ width: 28, height: 28, borderRadius: 4, background: "#1e2030", flexShrink: 0 }} />
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

			{/* Dropdown list */}
			{open && (
				<div style={{
					position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
					background: "#12141e", border: "1px solid #2a2c3a",
					borderRadius: 8, zIndex: 100,
					maxHeight: 280, overflowY: "auto",
					boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
				}}>
					{/* All legends option */}
					<div
						onClick={() => { onChange(""); setOpen(false); }}
						style={{
							display: "flex", alignItems: "center", gap: 10,
							padding: "8px 12px", cursor: "pointer",
							background: value === "" ? "#1e2030" : "transparent",
							borderBottom: "1px solid #1e2030",
						}}
					>
						<div style={{ width: 28, height: 28, borderRadius: 4, background: "#1e2030", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
							<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8M6 2v8" stroke={COLORS.textDim} strokeWidth="1.5" strokeLinecap="round" /></svg>
						</div>
						<span style={{ fontSize: 12, color: value === "" ? COLORS.gold : COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
							All legends
						</span>
					</div>

					{legends.length === 0 ? (
						<div style={{ padding: "12px", fontSize: 12, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", fontStyle: "italic" }}>
							No legends available yet.
						</div>
					) : (
						legends.map(l => (
							<div
								key={l.id}
								onClick={() => { onChange(l.name); setOpen(false); }}
								style={{
									display: "flex", alignItems: "center", gap: 10,
									padding: "8px 12px", cursor: "pointer",
									background: value === l.name ? "#1e2030" : "transparent",
									transition: "background 0.1s",
								}}
							>
								{l.image ? (
									<Image src={l.image} alt={l.name} width={28} height={28} style={{ objectFit: "contain", borderRadius: 4, flexShrink: 0 }} />
								) : (
									<div style={{ width: 28, height: 28, borderRadius: 4, background: "#1e2030", flexShrink: 0 }} />
								)}
								<span style={{
									fontSize: 12,
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
			)}
		</div>
	);
}

function DeckFilters({ legends, filters, onChange, onClear }) {
	const count = activeCount(filters);

	return (
		<div style={{
			background: "#0a0c14",
			border: "1px solid #1e2030",
			borderRadius: 14,
			marginBottom: 24,
			overflow: "hidden",
		}}>
			{/* Header */}
			<div style={{
				padding: "14px 20px",
				borderBottom: "1px solid #1e2030",
				display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
			}}>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.14em" }}>
						FILTER DECKS
					</span>
					{count > 0 && (
						<span style={{
							background: COLORS.gold + "20",
							border: `1px solid ${COLORS.gold}44`,
							borderRadius: 20, padding: "1px 9px",
							fontSize: 10, color: COLORS.gold,
							fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em",
						}}>
							{count} active
						</span>
					)}
				</div>
				{count > 0 && (
					<button onClick={onClear} style={{
						background: "none", border: "none", cursor: "pointer",
						fontSize: 11, color: COLORS.textMuted,
						fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em",
						padding: "4px 8px", borderRadius: 6,
					}}>
						Clear all
					</button>
				)}
			</div>

			<div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
				{/* Legend */}
				<div>
					<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.14em", marginBottom: 10 }}>
						LEGEND
					</div>
					<LegendSelect
						legends={legends}
						value={filters.legend}
						onChange={v => onChange("legend", v)}
					/>
				</div>

				{/* Bottom row: Deck type / Ranking / Date range */}
				<div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr", gap: 28, flexWrap: "wrap" }}>
					{/* Deck type */}
					<div>
						<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.14em", marginBottom: 10 }}>
							DECK TYPE
						</div>
						<div style={{ display: "flex", gap: 6 }}>
							{DECK_TYPES.map(t => {
								const on = filters.deckType === t.id;
								return (
									<button key={t.id} onClick={() => onChange("deckType", t.id)} style={{
										background: on ? "#1e2030" : "none",
										border: `1px solid ${on ? COLORS.gold + "55" : "#2a2c3a"}`,
										borderRadius: 6, padding: "5px 12px",
										fontSize: 10, color: on ? COLORS.gold : COLORS.textMuted,
										fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em",
										cursor: "pointer", transition: "all 0.15s",
									}}>
										{t.label}
									</button>
								);
							})}
						</div>
					</div>

					{/* Ranking */}
					<div>
						<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.14em", marginBottom: 10 }}>
							RANKING
						</div>
						<select
							value={filters.ranking}
							onChange={e => onChange("ranking", e.target.value)}
							style={{
								background: "#12141e", border: "1px solid #2a2c3a",
								borderRadius: 6, padding: "5px 32px 5px 12px",
								fontSize: 11, color: COLORS.text,
								fontFamily: "'Segoe UI', system-ui, sans-serif",
								cursor: "pointer", outline: "none",
								colorScheme: "dark",
								appearance: "none",
								backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236a6a8a'/%3E%3C/svg%3E")`,
								backgroundRepeat: "no-repeat",
								backgroundPosition: "right 10px center",
							}}
						>
							{RANKINGS.map(r => (
								<option key={r.id} value={r.id}>{r.label}</option>
							))}
						</select>
					</div>

					{/* Date range */}
					<div>
						<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.14em", marginBottom: 10 }}>
							DATE RANGE
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<input
								type="date"
								value={filters.dateFrom}
								onChange={e => onChange("dateFrom", e.target.value)}
								style={{
									background: "#12141e", border: "1px solid #2a2c3a",
									borderRadius: 6, padding: "5px 10px",
									fontSize: 11, color: filters.dateFrom ? COLORS.text : COLORS.textDim,
									fontFamily: "'Segoe UI', system-ui, sans-serif",
									outline: "none", colorScheme: "dark",
								}}
							/>
							<span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>to</span>
							<input
								type="date"
								value={filters.dateTo}
								min={filters.dateFrom || undefined}
								onChange={e => onChange("dateTo", e.target.value)}
								style={{
									background: "#12141e", border: "1px solid #2a2c3a",
									borderRadius: 6, padding: "5px 10px",
									fontSize: 11, color: filters.dateTo ? COLORS.text : COLORS.textDim,
									fontFamily: "'Segoe UI', system-ui, sans-serif",
									outline: "none", colorScheme: "dark",
								}}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

const SOURCES = [
	{
		id: "piltover-archive",
		name: "Piltover Archive",
		url: "piltoverarchive.gg",
		description: "Community-curated deck database with advanced filtering and in-depth write-ups.",
		tags: ["Community", "Meta", "Guides"],
		accentColor: "#4a90d9",
		glowColor: "#4a90d944",
		icon: "🏛️",
		deckCount: "4,200+",
		status: "active",
	},
	{
		id: "riftdecks",
		name: "Riftdecks",
		url: "riftdecks.io",
		description: "Tournament lists and ranked ladder decklists updated weekly with meta snapshots.",
		tags: ["Tournament", "Ladder", "Meta"],
		accentColor: "#a855f7",
		glowColor: "#a855f744",
		icon: "⚔️",
		deckCount: "2,800+",
		status: "active",
	},
	{
		id: "the-vault",
		name: "The Vault",
		url: "riftbound-vault.com",
		description: "Player-submitted decklists with community ratings, comments, and video guides.",
		tags: ["Community", "Budget", "Brewing"],
		accentColor: "#e8d090",
		glowColor: "#e8d09044",
		icon: "🔒",
		deckCount: "9,100+",
		status: "active",
	},
	{
		id: "metawatch",
		name: "MetaWatch",
		url: "metawatch.gg",
		description: "Data-driven tier lists and win-rate analytics pulled from ranked play every 48 hours.",
		tags: ["Tier List", "Analytics", "Ranked"],
		accentColor: "#34d399",
		glowColor: "#34d39944",
		icon: "📊",
		deckCount: "Tier data",
		status: "active",
	},
];

function SourceWidget({ source, selected, onSelect }) {
	const [hovered, setHovered] = useState(false);
	const highlighted = selected || hovered;

	return (
		<div
			onClick={() => onSelect(source.id)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				background: selected ? `linear-gradient(135deg, #0d0f1a, #12141e)` : "#0d0f1a",
				border: `1px solid ${highlighted ? source.accentColor + "66" : "#1e2030"}`,
				borderRadius: 14,
				padding: "22px 24px",
				cursor: "pointer",
				transition: "all 0.25s ease",
				position: "relative",
				overflow: "hidden",
				boxShadow: selected ? `0 0 28px ${source.glowColor}, inset 0 0 20px ${source.glowColor}` : hovered ? `0 4px 20px rgba(0,0,0,0.4)` : "none",
				transform: hovered && !selected ? "translateY(-2px)" : "none",
			}}
		>
			{selected && (
				<div style={{
					position: "absolute", top: 10, right: 12,
					background: source.accentColor + "22",
					border: `1px solid ${source.accentColor}55`,
					borderRadius: 20, padding: "2px 10px",
					fontSize: 9, fontFamily: "'Segoe UI', system-ui, sans-serif",
					letterSpacing: "0.15em", color: source.accentColor, fontWeight: 700,
				}}>
					SELECTED
				</div>
			)}

			<div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
				<div style={{
					width: 44, height: 44, borderRadius: 10, flexShrink: 0,
					background: source.glowColor,
					border: `1px solid ${source.accentColor}44`,
					display: "flex", alignItems: "center", justifyContent: "center",
					fontSize: 20,
				}}>
					{source.icon}
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontSize: 15, fontWeight: 700, color: highlighted ? source.accentColor : COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.04em", transition: "color 0.2s", marginBottom: 2 }}>
						{source.name}
					</div>
					<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.06em" }}>
						{source.url}
					</div>
				</div>
				<div style={{ textAlign: "right", flexShrink: 0 }}>
					<div style={{ fontSize: 13, fontWeight: 700, color: source.accentColor, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{source.deckCount}</div>
					<div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>DECKS</div>
				</div>
			</div>

			<div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", lineHeight: 1.6, marginBottom: 14 }}>
				{source.description}
			</div>

			<div style={{ display: "flex", gap: 6 }}>
				{source.tags.map(tag => (
					<span key={tag} style={{
						background: highlighted ? source.accentColor + "18" : "#1a1c28",
						border: `1px solid ${highlighted ? source.accentColor + "44" : "#2a2c3a"}`,
						borderRadius: 4, padding: "2px 8px",
						fontSize: 9, color: highlighted ? source.accentColor : COLORS.textMuted,
						fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em",
						transition: "all 0.2s",
					}}>
						{tag.toUpperCase()}
					</span>
				))}
			</div>
		</div>
	);
}

function DeckResultsPanel({ sources }) {
	const sourceList = sources.map(s => s.name).join(", ");

	return (
		<div style={{
			background: "#0d0f1a",
			border: "1px solid #1e2030",
			borderRadius: 14,
			overflow: "hidden",
		}}>
			{/* Panel header */}
			<div style={{
				padding: "18px 24px",
				borderBottom: "1px solid #1e2030",
				display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
			}}>
				<div>
					<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.12em", marginBottom: 6 }}>
						PULLING FROM
					</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
						{sources.map(s => (
							<span key={s.id} style={{
								display: "inline-flex", alignItems: "center", gap: 6,
								background: s.accentColor + "15",
								border: `1px solid ${s.accentColor}44`,
								borderRadius: 20, padding: "3px 12px",
								fontSize: 11, color: s.accentColor,
								fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em",
							}}>
								<span style={{ fontSize: 13 }}>{s.icon}</span>
								{s.name}
							</span>
						))}
					</div>
				</div>
				<div style={{
					display: "inline-flex", alignItems: "center", gap: 8,
					background: "#1a1c28",
					border: "1px solid #2a2c3a",
					borderRadius: 8, padding: "8px 16px",
					fontSize: 10, color: COLORS.textMuted,
					fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.12em",
				}}>
					<span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 6px #34d399" }} />
					CRAWLER PENDING
				</div>
			</div>

			{/* Placeholder deck rows */}
			<div style={{ padding: "24px" }}>
				<div style={{ marginBottom: 20, fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", lineHeight: 1.7 }}>
					Decklists from <span style={{ color: COLORS.text }}>{sourceList}</span> will appear here once the crawler is live.
					Results will be merged and sorted by source, date, and popularity.
				</div>

				{/* Skeleton rows */}
				{[...Array(5)].map((_, i) => (
					<div key={i} style={{
						display: "flex", alignItems: "center", gap: 16,
						padding: "14px 16px",
						background: i % 2 === 0 ? "#0a0c14" : "transparent",
						borderRadius: 8, marginBottom: 4,
						opacity: 1 - i * 0.15,
					}}>
						<div style={{ width: 36, height: 36, borderRadius: 6, background: "#1a1c28", flexShrink: 0 }} />
						<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
							<div style={{ height: 11, background: "#1a1c28", borderRadius: 4, width: `${55 + (i % 3) * 15}%` }} />
							<div style={{ height: 9, background: "#14161f", borderRadius: 4, width: `${30 + (i % 2) * 20}%` }} />
						</div>
						<div style={{ width: 60, height: 20, background: "#1a1c28", borderRadius: 10, flexShrink: 0 }} />
						<div style={{ width: 40, height: 20, background: "#14161f", borderRadius: 10, flexShrink: 0 }} />
					</div>
				))}

				<div style={{ textAlign: "center", paddingTop: 16 }}>
					<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em" }}>
						— SCRAPING INTEGRATION COMING SOON —
					</div>
				</div>
			</div>
		</div>
	);
}

export default function DeckSources({ legends = [] }) {
	const [selectedIds, setSelectedIds] = useState(new Set());
	const [filters, setFilters] = useState({ ...FILTER_DEFAULTS });

	const handleSelect = (id) => {
		setSelectedIds(prev => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const handleFilterChange = (key, value) => {
		setFilters(prev => ({ ...prev, [key]: value }));
	};

	const handleFilterClear = () => {
		setFilters({ ...FILTER_DEFAULTS });
	};

	const selectedSources = SOURCES.filter(s => selectedIds.has(s.id));

	return (
		<div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
			<div style={{ marginBottom: 28 }}>
				<h1 style={{ fontSize: 22, fontWeight: 900, color: COLORS.gold, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif", margin: "0 0 8px" }}>
					COMMUNITY DECKS
				</h1>
				<p style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", lineHeight: 1.6, margin: 0 }}>
					Select one or more sources — the crawler will pull decklists from all of them.
					{selectedIds.size > 0 && (
						<span style={{ color: COLORS.gold, marginLeft: 6 }}>
							{selectedIds.size} source{selectedIds.size > 1 ? "s" : ""} selected.
						</span>
					)}
				</p>
			</div>

			<DeckFilters
				legends={legends}
				filters={filters}
				onChange={handleFilterChange}
				onClear={handleFilterClear}
			/>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: selectedSources.length > 0 ? 28 : 0 }}>
				{SOURCES.map(source => (
					<SourceWidget
						key={source.id}
						source={source}
						selected={selectedIds.has(source.id)}
						onSelect={handleSelect}
					/>
				))}
			</div>

			{selectedSources.length > 0 && <DeckResultsPanel sources={selectedSources} />}
		</div>
	);
}
