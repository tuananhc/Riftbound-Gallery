"use client";
import { useState, useMemo } from "react";
import { COLORS, FONT_MONO, LAYOUT, STRIP } from "../../lib/data";
import { useCards } from "../CardStoreProvider";
import { SOURCES } from "./sources";
import { FILTER_DEFAULTS } from "./DeckFilters";
import DeckFilters from "./DeckFilters";
import MobileDeckFilters from "./MobileDeckFilters";
import SourceWidget from "./SourceWidget";
import DeckResultsPanel from "./DeckResultsPanel";
import { legendOptions } from "../../lib/cards/data";

export default function DeckSources() {
	const cards = useCards();
	const legends = useMemo(() => legendOptions(cards), [cards]);

	const [selectedIds, setSelectedIds] = useState(new Set());
	const [filters, setFilters] = useState({ ...FILTER_DEFAULTS });
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState(null);
	const [crawlError, setCrawlError] = useState(null);

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

	const handleSearch = async () => {
		setSearching(true);
		setResults(null);
		setCrawlError(null);

		try {
			const response = await fetch("/api/crawl", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sources: [...selectedIds], filters }),
			});

			if (!response.ok) {
				const { error } = await response.json();
				throw new Error(error ?? `Server error ${response.status}`);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			const allDecks = [];

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop();
				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const chunk = JSON.parse(line);
						if (chunk.error) throw new Error(`${chunk.sourceId}: ${chunk.error}`);
						if (Array.isArray(chunk.decks)) allDecks.push(...chunk.decks);
					} catch (e) {
						setCrawlError(e.message);
					}
				}
			}

			setResults(allDecks);
		} catch (err) {
			setCrawlError(err.message);
		} finally {
			setSearching(false);
		}
	};

	const selectedSources = SOURCES.filter(s => selectedIds.has(s.id));
	const hasSearched = searching || results !== null || crawlError !== null;

	return (
		<div style={{ maxWidth: 1100, margin: "0 auto", padding: LAYOUT.contentPad }}>
			<div style={{ marginBottom: 28 }}>
				<h1 style={{ fontSize: 22, fontWeight: 900, color: COLORS.accent, letterSpacing: "0.1em", fontFamily: FONT_MONO, margin: "0 0 8px" }}>
					COMMUNITY DECKS
				</h1>
				<p style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: FONT_MONO, lineHeight: 1.6, margin: 0 }}>
					Select one or more sources — the crawler will pull decklists from all of them.
					{selectedIds.size > 0 && (
						<span style={{ color: COLORS.accent, marginLeft: 6 }}>
							{selectedIds.size} source{selectedIds.size > 1 ? "s" : ""} selected.
						</span>
					)}
				</p>
			</div>

			{/* Desktop and phone filter layouts; the SHOW tokens inside each pick which renders. */}
			<DeckFilters
				legends={legends}
				filters={filters}
				onChange={handleFilterChange}
				onClear={() => setFilters({ ...FILTER_DEFAULTS })}
			/>
			<MobileDeckFilters
				legends={legends}
				filters={filters}
				onChange={handleFilterChange}
				onClear={() => setFilters({ ...FILTER_DEFAULTS })}
			/>

			{/* A grid on desktop; on phones the sources swipe sideways and toggle on tap. */}
			<div style={{ ...STRIP, gap: 12, marginBottom: 20 }}>
				{SOURCES.map(source => (
					<SourceWidget
						key={source.id}
						source={source}
						selected={selectedIds.has(source.id)}
						onSelect={handleSelect}
					/>
				))}
			</div>

			{selectedIds.size > 0 && (
				<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: hasSearched ? 24 : 0 }}>
					<button
						onClick={handleSearch}
						disabled={searching}
						style={{
							display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, flex: "0 1 260px", minHeight: 48,
							background: searching ? COLORS.border : COLORS.accent,
							color: searching ? COLORS.textMuted : COLORS.bg,
							border: `1px solid ${searching ? COLORS.borderHover : COLORS.accent}`,
							borderRadius: 0, padding: "11px 28px",
							fontSize: 12, fontWeight: 700, letterSpacing: "0.12em",
							fontFamily: FONT_MONO,
							cursor: searching ? "not-allowed" : "pointer",
							transition: "all 0.2s",
						}}
					>
						{searching && (
							<span style={{
								width: 13, height: 13, borderRadius: "50%",
								border: `2px solid ${COLORS.textDim}`,
								borderTopColor: COLORS.accent,
								display: "inline-block",
								animation: "spin 0.7s linear infinite",
							}} />
						)}
						{searching ? "SEARCHING..." : "SEARCH DECKS"}
					</button>
					<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
				</div>
			)}

			{hasSearched && (
				<DeckResultsPanel
					sources={selectedSources}
					searching={searching}
					decks={results}
					error={crawlError}
				/>
			)}
		</div>
	);
}
