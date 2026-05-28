"use client";
import { useState } from "react";
import { COLORS } from "../../lib/data";
import { SOURCES } from "./sources";
import { FILTER_DEFAULTS } from "./DeckFilters";
import DeckFilters from "./DeckFilters";
import SourceWidget from "./SourceWidget";
import DeckResultsPanel from "./DeckResultsPanel";

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
				onClear={() => setFilters({ ...FILTER_DEFAULTS })}
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
