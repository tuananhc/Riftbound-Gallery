"use client";
import { useState, useMemo } from "react";
import { COLORS } from "../../lib/data";
import CardItem from "./CardItem";
import CardFilters from "./CardFilters";
import CardModal from "./CardModal";
import DeckPanel from "./DeckPanel";

export default function CardGrid({ initialCards }) {
	const [search, setSearch]               = useState("");
	const [selectedColors, setSelectedColors] = useState([]);
	const [selectedTags, setSelectedTags]   = useState([]);
	const [costRange, setCostRange]         = useState([0, 12]);
	const [selectedCard, setSelectedCard]   = useState(null);
	const [selectedAttribute, setSelectedAttribute] = useState([]);
	const [releaseSet, setReleaseSet]       = useState(null);
	const [sortBy, setSortBy]               = useState("name");
	const [deck, setDeck]                   = useState([]);
	const [deckOpen, setDeckOpen]           = useState(false);
	const [legendId, setLegendId]           = useState(null);
	const [championId, setChampionId]       = useState(null);

	const maxCopies = (card) => card.card_type_text?.includes("Legend") ? 1 : 3;

	const addToDeck = (card, e) => {
		e.stopPropagation();
		const isLegend   = card.card_type_text?.includes("Legend");
		const isChampion = card.card_type_text?.includes("Champion");

		setDeck(prev => {
			const existing = prev.find(e => e.card.id === card.id);
			if (existing) {
				if (existing.count >= maxCopies(card)) return prev;
				return prev.map(e => e.card.id === card.id ? { ...e, count: e.count + 1 } : e);
			}
			return [...prev, { card, count: 1 }];
		});

		if (!legendId && isLegend) {
			setLegendId(card.id);
			setSelectedTags(['Champion']);
			setSearch(card.tags_text.split(',')[0].trim());
		} else if (legendId && !championId && isChampion) {
			setChampionId(card.id);
			clearFilters();
		}
	};

	const removeFromDeck = (cardId) => {
		const entry = deck.find(e => e.card.id === cardId);
		if (cardId === legendId && entry?.count <= 1) {
			setLegendId(null);
			setChampionId(null);
			setSelectedTags(['Legend']);
			setSearch('');
		} else if (cardId === championId && entry?.count <= 1) {
			setChampionId(null);
		}
		setDeck(prev => {
			const existing = prev.find(e => e.card.id === cardId);
			if (!existing) return prev;
			if (existing.count <= 1) return prev.filter(e => e.card.id !== cardId);
			return prev.map(e => e.card.id === cardId ? { ...e, count: e.count - 1 } : e);
		});
	};

	const deckTotal = deck.reduce((sum, e) => sum + e.count, 0);

	const copyDeckList = () => {
		const text = deck.map(e => `${e.count}x ${e.card.name}`).join("\n");
		navigator.clipboard.writeText(text);
	};

	const toggleColor = c => setSelectedColors(p => {
		if (p.includes(c)) return p.filter(x => x !== c);
		if (p.length >= 2) return [...p.slice(1), c];
		return [...p, c];
	});
	const toggleTag   = t => setSelectedTags(p =>   p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
	const toggleAttribute = a => setSelectedAttribute(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

	const filtered = useMemo(() => {
		console.log("Filtering cards with:", { search, selectedColors, selectedTags, costRange, selectedAttribute, releaseSet, sortBy }); // Debug: Log filter criteria
		return initialCards
			.filter(card => {
				const nameMatch =
					!search ||
					card.name?.toLowerCase().includes(search.toLowerCase()) ||
					card.ability_text?.toLowerCase().includes(search.toLowerCase());
				const domainMatch =
					selectedColors.length === 0 ||
					selectedColors.every(c => card.domain_text?.includes(c));
				const tagMatch =
					selectedTags.length === 0 ||
					selectedTags.some(t => card.card_type_text?.includes(t));
				const attributeMatch =
					selectedAttribute.length === 0 ||
					selectedAttribute.some(a => card.card_type_text?.includes(a) || card.ability_text?.includes(a));
				const cost      = parseInt(card.energy_text);
				const costMatch = costRange[0] === 0 && costRange[1] === 12 ? true : (cost >= costRange[0] && cost <= costRange[1]);
				const releaseSetMatch = !releaseSet || card.card_set_text === releaseSet;
				return nameMatch && domainMatch && tagMatch && attributeMatch && costMatch && releaseSetMatch;
			})
			.sort((a, b) => {
				if (sortBy === "cost") return parseInt(a.energy_text) - parseInt(b.energy_text);
				if (sortBy === "rarity") {
					const order = ["Common", "Uncommon", "Rare", "Mythic", "Legendary"];
					return order.indexOf(b.rarity_text) - order.indexOf(a.rarity_text);
				}
				return a.name?.localeCompare(b.name);
			});
	}, [initialCards, search, selectedColors, selectedTags, selectedAttribute, costRange, releaseSet, sortBy]);

	const hasFilters  = selectedColors.length > 0 || selectedTags.length > 0 || search || costRange[0] > 0 || costRange[1] < 12 || releaseSet;
	const clearFilters = () => { setSelectedColors([]); setSelectedTags([]); setSearch(""); setCostRange([0, 12]); setReleaseSet(null); };

	const handleDeckOpen = () => {
		if (!deckOpen && !legendId) setSelectedTags(['Legend']);
		setDeckOpen(o => !o);
	};

	return (
		<>
			<style suppressHydrationWarning>{`
				.card-item { background: #10121a; border: 1px solid #1e2030; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.25s ease; }
				.card-item:hover { transform: translateY(-3px); }
				.filter-btn { background: #12141e; border: 1px solid #1e2030; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; color: #888; transition: all 0.2s; letter-spacing: 0.05em; }
				.filter-attribute-btn { background: #12141e; border: 1px solid #1e2030; border-radius: 6px; padding: 3px 6px; cursor: pointer; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; color: #888; transition: all 0.2s; letter-spacing: 0.05em; }
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
				.card-wrapper { position: relative; }
				.add-deck-btn { position: absolute; bottom: 8px; right: 8px; width: 28px; height: 28px; background: rgba(10,12,20,0.85); border: 1px solid #3a4060; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; color: #8890c0; opacity: 0; transition: opacity 0.15s, background 0.15s; z-index: 2; }
				.card-wrapper:hover .add-deck-btn { opacity: 1; }
				.add-deck-btn:hover { background: #1e2240; color: #e8d090; border-color: #e8d090; }
				.deck-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 10px; border-radius: 6px; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12px; color: #c0bab0; transition: background 0.15s; }
				.deck-row:hover { background: #13151f; }
				.deck-count-btn { background: #1a1c28; border: 1px solid #2a2c3a; border-radius: 4px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #888; font-size: 13px; line-height: 1; transition: border-color 0.15s, color 0.15s; }
				.deck-count-btn:hover { border-color: #5a6090; color: #e8d090; }
				.deck-panel { position: fixed; top: 62px; right: 0; bottom: 0; width: 300px; background: #0c0e18; border-left: 1px solid #1a1c28; display: flex; flex-direction: column; z-index: 50; transition: transform 0.3s cubic-bezier(0.4,0,0.2,1); }
				.deck-btn { background: #12141e; border: 1px solid #1e2030; border-radius: 6px; padding: 7px 14px; color: #aaa; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; cursor: pointer; letter-spacing: 0.08em; transition: all 0.2s; display: flex; align-items: center; gap: 7px; margin-right: 8px; }
				.deck-btn:hover { border-color: #3a4060; color: #e8d090; }
				.deck-btn.active { background: #1a2040; border-color: #4a5090; color: #8890c0; }
				.deck-badge { background: #3a4060; color: #c0c8f0; border-radius: 10px; padding: 1px 7px; font-size: 10px; font-weight: 700; }
			`}</style>

			<div style={{ display: "flex", minHeight: "calc(100vh - 62px)" }}>
				<CardFilters
					search={search}           setSearch={setSearch}
					selectedColors={selectedColors} toggleColor={toggleColor}
					selectedTags={selectedTags}   toggleTag={toggleTag}
					costRange={costRange}     setCostRange={setCostRange}
					hasFilters={hasFilters}   clearFilters={clearFilters}
					selectedAttribute={selectedAttribute} toggleAttribute={toggleAttribute}
					releaseSet={releaseSet}     setReleaseSet={setReleaseSet}
				/>

				<section style={{ flex: 1, padding: "24px 28px", transition: "padding-right 0.3s", paddingRight: deckOpen ? "328px" : "28px" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
						<div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
							{filtered.length === 0 ? "NO CARDS FOUND" : `${filtered.length} OF ${initialCards.length} CARDS`}
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<button className={`deck-btn${deckOpen ? " active" : ""}`} onClick={handleDeckOpen}>
								DECK BUILDER
								{deckTotal > 0 && <span className="deck-badge">{deckTotal}</span>}
							</button>
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
							{filtered.map(card => (
								<div key={card.id} className="card-wrapper">
									<CardItem card={card} onClick={() => setSelectedCard(card)} deckCount={deckOpen ? (deck.find(e => e.card.id === card.id)?.count ?? 0) : 0} />
									{deckOpen && <button className="add-deck-btn" onClick={e => addToDeck(card, e)} title="Add to deck">+</button>}
								</div>
							))}
						</div>
					)}
				</section>
			</div>

			<DeckPanel
				deck={deck}
				deckOpen={deckOpen}
				deckTotal={deckTotal}
				legendId={legendId}
				championId={championId}
				onClose={() => setDeckOpen(false)}
				onAdd={addToDeck}
				onRemove={removeFromDeck}
				onCopyList={copyDeckList}
				onClear={() => { setDeck([]); setLegendId(null); setChampionId(null); setSelectedTags(['Legend']); setSearch(''); }}
			/>

			<CardModal
				card={selectedCard}
				onClose={() => setSelectedCard(null)}
				deckOpen={deckOpen}
				onAddToDeck={card => addToDeck(card, { stopPropagation: () => {} })}
				deckCount={selectedCard ? (deck.find(e => e.card.id === selectedCard.id)?.count ?? 0) : 0}
				deckMax={selectedCard ? maxCopies(selectedCard) : 3}
			/>
		</>
	);
}
