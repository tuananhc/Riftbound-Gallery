"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { COLOR_CONFIG, RARITY_CONFIG, cardGradient, cardGlow } from "../../lib/cards/data";
import { COLORS } from "../../lib/data";
import { countryFlag } from "../../lib/countries";
import { useAuth } from "../../hooks/useAuth";

// ── Dummy data ─────────────────────────────────────────────────────────────────

const RANK_COLORS = {
	"Bronze":   { color: "#cd7f32", glow: "#cd7f3233", icon: "🥉" },
	"Silver":   { color: "#c0c0c0", glow: "#c0c0c033", icon: "🥈" },
	"Gold":     { color: "#ffd700", glow: "#ffd70033", icon: "🥇" },
	"Platinum": { color: "#4fc3f7", glow: "#4fc3f733", icon: "💎" },
	"Diamond":  { color: "#b388ff", glow: "#b388ff33", icon: "🔷" },
	"Master":   { color: "#ff6d00", glow: "#ff6d0033", icon: "👑" },
};

const USER = {
	username:  "ShadowRift",
	avatar:    "🧙",
	title:     "Keeper of the Seventh Seal",
	rank:      "Platinum",
	joinDate:  "March 2024",
	stats: { wins: 142, losses: 58, draws: 7, winStreak: 6 },
};

const DECKS = [
	{
		id: "deck-1", name: "Fury of the Rift", description: "Aggressive burn strategy",
		colors: ["Fury"], wins: 54, losses: 18, lastPlayed: "18 Jul 2026",
		cardIds: ["c001", "c002", "c003", "c004", "c005"],
	},
	{
		id: "deck-2", name: "Mind & Order", description: "Control with counter magic",
		colors: ["Mind", "Order"], wins: 61, losses: 22, lastPlayed: "15 Jul 2026",
		cardIds: ["c010", "c011", "c012", "c013"],
	},
	{
		id: "deck-3", name: "Chaos Reigns", description: "High-variance combo build",
		colors: ["Chaos", "Body"], wins: 27, losses: 18, lastPlayed: "10 Jul 2026",
		cardIds: ["c020", "c021", "c022"],
	},
];

const MATCH_HISTORY = [
	{ id: "m1",  result: "WIN",  opponent: "VoidWalker",   date: "20 Jul 2026", deck: "Fury of the Rift",  opponentDeck: "Calm Storm",     turns: 12 },
	{ id: "m2",  result: "WIN",  opponent: "StormCaller",  date: "20 Jul 2026", deck: "Mind & Order",       opponentDeck: "Body Rush",       turns: 18 },
	{ id: "m3",  result: "LOSS", opponent: "IronClad",     date: "19 Jul 2026", deck: "Chaos Reigns",       opponentDeck: "Order Sentinel",  turns: 9  },
	{ id: "m4",  result: "WIN",  opponent: "NightShade",   date: "19 Jul 2026", deck: "Fury of the Rift",  opponentDeck: "Mind Weaver",     turns: 14 },
	{ id: "m5",  result: "DRAW", opponent: "EchoSerpent",  date: "18 Jul 2026", deck: "Mind & Order",       opponentDeck: "Mind & Order",    turns: 25 },
	{ id: "m6",  result: "LOSS", opponent: "BlazeKnight",  date: "18 Jul 2026", deck: "Chaos Reigns",       opponentDeck: "Fury Aggro",      turns: 7  },
	{ id: "m7",  result: "WIN",  opponent: "RuneMaster",   date: "17 Jul 2026", deck: "Fury of the Rift",  opponentDeck: "Chaos Reigns",    turns: 11 },
	{ id: "m8",  result: "WIN",  opponent: "CalmTide",     date: "17 Jul 2026", deck: "Mind & Order",       opponentDeck: "Calm Storm",     turns: 20 },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function UserPage() {
	const router = useRouter();
	const { status } = useAuth();

	// Redirect guests to sign-in once the session check resolves.
	useEffect(() => {
		if (status === "guest") router.replace("/login");
	}, [status, router]);

	const [activeTab, setActiveTab]         = useState("decks");
	const [expandedDeck, setExpandedDeck]   = useState(null);
	const [historyFilter, setHistoryFilter] = useState("ALL");
	const [hoveredTab, setHoveredTab]       = useState(null);
	const [hoveredDeck, setHoveredDeck]     = useState(null);

	const [eloQuery, setEloQuery]               = useState("");
	const [eloResults, setEloResults]           = useState([]);
	const [eloLoading, setEloLoading]           = useState(false);
	const [eloError, setEloError]               = useState(null);
	const [linkedPlayer, setLinkedPlayer]       = useState(null);
	const [eloHistory, setEloHistory]           = useState(null);
	const [eloHistoryLoading, setEloHistoryLoading] = useState(false);

	// Session still resolving, or a guest being redirected — render nothing.
	if (status !== "authed") return null;

	async function handleEloSearch(e) {
		e.preventDefault();
		if (!eloQuery.trim()) return;
		setEloLoading(true);
		setEloError(null);
		setEloResults([]);
		try {
			const res = await fetch(`/api/elo/search?q=${encodeURIComponent(eloQuery.trim())}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			setEloResults(data);
			if (data.length === 0) setEloError("No players found.");
		} catch {
			setEloError("Could not reach EloShowdown. Please try again.");
		} finally {
			setEloLoading(false);
		}
	}

	async function fetchEloHistory(playerId) {
		setEloHistoryLoading(true);
		try {
			const res = await fetch(`/api/elo/players/${playerId}/elo-history`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			setEloHistory(data);
		} catch {
			setEloHistory(null);
		} finally {
			setEloHistoryLoading(false);
		}
	}

	const totalGames = USER.stats.wins + USER.stats.losses + USER.stats.draws;
	const winRate    = Math.round((USER.stats.wins / totalGames) * 100);
	const rank       = RANK_COLORS[USER.rank] || { color: "#e8d090", glow: "#e8d09044", icon: "⭐" };

	const filteredHistory = MATCH_HISTORY.filter(m => historyFilter === "ALL" || m.result === historyFilter);

	return (
		<div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>

			{/* ── Profile Header ── */}
			<div style={{
				background: "linear-gradient(135deg, #0f1120 0%, #12101e 50%, #0f1120 100%)",
				border: `1px solid ${COLORS.border}`,
				borderRadius: 16, padding: "32px 36px", marginBottom: 32,
				display: "flex", alignItems: "flex-start", gap: 28,
				position: "relative", overflow: "hidden",
			}}>
				{/* bg decoration */}
				<div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #2a104044 0%, transparent 70%)", pointerEvents: "none" }} />

				{/* Avatar */}
				<div style={{
					width: 80, height: 80, borderRadius: 16, flexShrink: 0,
					background: "linear-gradient(135deg, #2a1040, #1a0830)",
					border: "2px solid #4a2060",
					display: "flex", alignItems: "center", justifyContent: "center",
					fontSize: 36, boxShadow: "0 0 24px #6020a055",
				}}>{USER.avatar}</div>

				{/* Info */}
				<div style={{ flex: 1 }}>
					<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
						<h1 style={{ fontSize: 26, fontWeight: 900, color: COLORS.gold, letterSpacing: "0.08em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
							{USER.username}
						</h1>
						<span style={{
							background: rank.glow, border: `1px solid ${rank.color}44`,
							borderRadius: 20, padding: "3px 12px",
							fontSize: 11, color: rank.color, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em",
						}}>{rank.icon} {USER.rank}</span>
					</div>
					<div style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: "italic", marginBottom: 16, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
						{USER.title}
					</div>
					<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em" }}>
						MEMBER SINCE {USER.joinDate.toUpperCase()} &nbsp;·&nbsp; WIN STREAK: <span style={{ color: "#4caf50" }}>+{USER.stats.winStreak}</span>
					</div>
				</div>

				{/* Stats */}
				<div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
					{[
						{ label: "WINS",   value: USER.stats.wins,   color: "#4caf50" },
						{ label: "LOSSES", value: USER.stats.losses, color: "#ef5350" },
						{ label: "WIN%",   value: `${winRate}%`,     color: COLORS.gold },
					].map(s => (
						<div key={s.label} style={{ background: "#10121a", border: "1px solid #1e2030", borderRadius: 10, padding: 18, textAlign: "center", minWidth: 70 }}>
							<div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{s.value}</div>
							<div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.15em", marginTop: 4, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{s.label}</div>
						</div>
					))}
				</div>
			</div>

			{/* ── EloShowdown Search ── */}
			<div style={{
				background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
				borderRadius: 16, padding: "24px 28px", marginBottom: 32,
			}}>
				<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.18em", fontFamily: "'Segoe UI', system-ui, sans-serif", marginBottom: 14 }}>
					Find your latest match history with Riot ID
				</div>

				{linkedPlayer && (
					<div style={{
						display: "flex", alignItems: "center", gap: 14, marginBottom: 16,
						background: "#0d1020", border: "1px solid #2a3060", borderRadius: 10, padding: "12px 16px",
					}}>
						<div style={{ fontSize: 18 }}>🔗</div>
						<div style={{ flex: 1 }}>
							<div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{linkedPlayer.display_name}</div>
							<div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", marginTop: 2 }}>
								{linkedPlayer.primary_community} · {countryFlag(linkedPlayer.country)} {linkedPlayer.country}
							</div>
						</div>
						<button onClick={() => { setLinkedPlayer(null); setEloResults([]); setEloQuery(""); setEloHistory(null); }}
							style={{ background: "transparent", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
					</div>
				)}

				{/* ── ELO History ── */}
				{linkedPlayer && (
					<div style={{ marginBottom: 16 }}>
						{eloHistoryLoading && (
							<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em", padding: "10px 0" }}>
								LOADING MATCH HISTORY…
							</div>
						)}
						{eloHistory && (() => {
							const points  = [...eloHistory.points].reverse();
							const current = eloHistory.points[eloHistory.points.length - 1]?.elo_after;
							const recent  = points.slice(0, 10);
							return (
								<div>
									<div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 12 }}>
										<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.15em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
											ELO
										</div>
										<div style={{ fontSize: 22, fontWeight: 700, color: COLORS.gold, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
											{current}
										</div>
										<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
											{eloHistory.season_slug.replace(/-/g, " ").toUpperCase()}
										</div>
									</div>
									<div style={{ background: "#0a0c14", border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
										{recent.map((m, i) => {
											const resultColor = m.result === "win" ? "#4caf50" : m.result === "loss" ? "#ef5350" : "#ffd700";
											const changeSign  = m.elo_change > 0 ? "+" : "";
											const d           = new Date(m.date);
											const dateStr     = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
											return (
												<div key={m.match_id}
													onMouseEnter={e => { e.currentTarget.style.background = "#0d0f17"; }}
													onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
													style={{
														display: "grid", gridTemplateColumns: "52px 1fr 60px",
														alignItems: "center", padding: "9px 14px", gap: 12,
														borderBottom: i < recent.length - 1 ? "1px solid #12141e" : "none",
														transition: "background 0.15s",
													}}>
													<span style={{ fontSize: 11, fontWeight: 700, color: resultColor, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
														{m.result}
													</span>
													<div>
														<div style={{ fontSize: 13, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{m.opponent_name}</div>
														<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", marginTop: 1 }}>{dateStr}</div>
													</div>
													<span style={{ fontSize: 13, fontWeight: 700, color: m.elo_change > 0 ? "#4caf50" : m.elo_change < 0 ? "#ef5350" : COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", textAlign: "right" }}>
														{changeSign}{m.elo_change}
													</span>
												</div>
											);
										})}
									</div>
								</div>
							);
						})()}
					</div>
				)}

				<form onSubmit={handleEloSearch} style={{ display: "flex", gap: 10 }}>
					<input
						type="text"
						placeholder="Enter your EloShowdown username…"
						value={eloQuery}
						onChange={e => setEloQuery(e.target.value)}
						onFocus={e => { e.target.style.borderColor = "#4a5090"; }}
						onBlur={e => { e.target.style.borderColor = "#1e2030"; }}
						style={{
							background: "#0d0f18", border: "1px solid #1e2030", borderRadius: 8,
							padding: "10px 14px", color: "#e8e0d0", fontFamily: "'Segoe UI', system-ui, sans-serif",
							fontSize: 13, width: "100%", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
						}}
					/>
					<button type="submit" disabled={eloLoading || !eloQuery.trim()}
						style={{
							background: eloLoading || !eloQuery.trim() ? "#1a1c28" : "#1a1f35",
							border: `1px solid ${eloLoading || !eloQuery.trim() ? "#1e2030" : "#4a5090"}`,
							borderRadius: 8, padding: "10px 20px", color: eloLoading || !eloQuery.trim() ? COLORS.textDim : "#8890cc",
							fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 11, letterSpacing: "0.12em",
							cursor: eloLoading || !eloQuery.trim() ? "not-allowed" : "pointer",
							whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0,
						}}>
						{eloLoading ? "SEARCHING…" : "SEARCH"}
					</button>
				</form>

				{eloError && (
					<div style={{ marginTop: 12, fontSize: 12, color: "#ef5350", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{eloError}</div>
				)}

				{eloResults.length > 0 && (
					<div style={{ marginTop: 14, background: "#0a0c14", border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
						{eloResults.map((player, i) => (
							<div key={player.id}
								onClick={() => { setLinkedPlayer(player); setEloResults([]); setEloQuery(""); fetchEloHistory(player.id); }}
								onMouseEnter={e => { e.currentTarget.style.background = "#0d0f17"; }}
								onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
								style={{
									display: "flex", alignItems: "center", gap: 14, padding: "10px 14px",
									borderBottom: i < eloResults.length - 1 ? "1px solid #12141e" : "none",
									cursor: "pointer", transition: "background 0.15s",
								}}>
								<div style={{ flex: 1 }}>
									<div style={{ fontSize: 13, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{player.display_name}</div>
									<div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", marginTop: 2 }}>
										{player.primary_community} · {countryFlag(player.country)} {player.country}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* ── Tabs ── */}
			<div style={{ borderBottom: `1px solid ${COLORS.border}`, marginBottom: 28, display: "flex", gap: 0 }}>
				{[
					{ id: "decks",   label: "MY DECKS"     },
					{ id: "history", label: "MATCH HISTORY" },
				].map(tab => {
					const isActive  = activeTab === tab.id;
					const isHovered = hoveredTab === tab.id;
					return (
						<button key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							onMouseEnter={() => setHoveredTab(tab.id)}
							onMouseLeave={() => setHoveredTab(null)}
							style={{
								background: "transparent", border: "none",
								borderBottom: `2px solid ${isActive ? "#e8d090" : "transparent"}`,
								padding: "10px 20px",
								fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 11, letterSpacing: "0.15em",
								color: isActive ? "#e8d090" : isHovered ? "#aaa" : "#6a6a8a",
								cursor: "pointer", transition: "all 0.2s",
							}}>
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* ── Decks Tab ── */}
			{activeTab === "decks" && (
				<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
					{DECKS.map(deck => {
						const primaryColor = COLOR_CONFIG[deck.colors[0]];
						const open    = expandedDeck === deck.id;
						const hovered = hoveredDeck === deck.id;
						const deckCards = deck.cardIds; // TODO: replace with real card lookups when decks are loaded from DynamoDB
						const wr = Math.round((deck.wins / (deck.wins + deck.losses)) * 100);

						return (
							<div key={deck.id}
								onMouseEnter={() => setHoveredDeck(deck.id)}
								onMouseLeave={() => setHoveredDeck(null)}
								style={{
									background: "#10121a",
									border: `1px solid ${open ? primaryColor.glow + "55" : hovered ? "#2a2c3a" : "#1e2030"}`,
									borderRadius: 12, overflow: "hidden", transition: "all 0.25s", cursor: "pointer",
									boxShadow: open ? `0 0 20px ${primaryColor.glow}22` : "none",
									transform: hovered && !open ? "translateY(-2px)" : "none",
								}}>
								{/* Header row */}
								<div onClick={() => setExpandedDeck(open ? null : deck.id)}
									style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 16,
													 background: open ? cardGradient(deck.colors) : "transparent" }}>
									<div style={{ display: "flex", gap: 4 }}>
										{deck.colors.map(c => <span key={c} style={{ fontSize: 18 }}>{COLOR_CONFIG[c].icon}</span>)}
									</div>
									<div style={{ flex: 1 }}>
										<div style={{ fontSize: 15, fontWeight: 700, color: COLORS.gold, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.06em" }}>{deck.name}</div>
										<div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", fontStyle: "italic", marginTop: 2 }}>{deck.description}</div>
									</div>
									<div style={{ display: "flex", gap: 20, alignItems: "center" }}>
										<div style={{ textAlign: "center" }}>
											<div style={{ fontSize: 16, fontWeight: 700, color: "#4caf50", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{wr}%</div>
											<div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>WIN RATE</div>
										</div>
										<div style={{ textAlign: "center" }}>
											<div style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{deck.wins}W {deck.losses}L</div>
											<div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>RECORD</div>
										</div>
										<div style={{ fontSize: 16, color: COLORS.textDim, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>▾</div>
									</div>
								</div>

								{/* Expanded: card previews */}
								{open && (
									<div style={{ padding: "0 20px 20px", borderTop: `1px solid ${primaryColor.glow}22` }}>
										<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.15em", fontFamily: "'Segoe UI', system-ui, sans-serif", margin: "14px 0 10px" }}>
											CARDS IN DECK ({deckCards.length})
										</div>
										<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.06em", fontStyle: "italic" }}>
											Card details will appear here once decks are loaded from the database.
										</div>
										<div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 12, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.06em" }}>
											LAST PLAYED: {deck.lastPlayed.toUpperCase()}
										</div>
									</div>
								)}
							</div>
						);
					})}

					{/* New deck CTA */}
					<button
						onMouseEnter={e => { e.target.style.borderColor = "#4a4a6a"; e.target.style.color = "#8a8aaa"; }}
						onMouseLeave={e => { e.target.style.borderColor = "#2a2c3a"; e.target.style.color = COLORS.textDim; }}
						style={{
							background: "transparent", border: "1px dashed #2a2c3a", borderRadius: 12,
							padding: "20px", color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif",
							fontSize: 11, letterSpacing: "0.15em", cursor: "pointer", transition: "all 0.2s",
						}}>
						+ CREATE NEW DECK
					</button>
				</div>
			)}

			{/* ── History Tab ── */}
			{activeTab === "history" && (
				<div>
					{/* Filter pills */}
					<div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
						{["ALL", "WIN", "LOSS", "DRAW"].map(f => {
							const isActive = historyFilter === f;
							return (
								<button key={f}
									onClick={() => setHistoryFilter(f)}
									style={{
										background: isActive ? "#1a1f35" : "#12141e",
										border: `1px solid ${isActive ? "#4a5090" : "#1e2030"}`,
										borderRadius: 20, padding: "5px 14px",
										fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em",
										color: isActive ? "#8890cc" : "#666",
										cursor: "pointer", transition: "all 0.2s",
									}}>
									{f}
								</button>
							);
						})}
						<span style={{ marginLeft: "auto", fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", alignSelf: "center", letterSpacing: "0.06em" }}>
							{filteredHistory.length} GAMES
						</span>
					</div>

					{/* Table */}
					<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
						{/* Header */}
						<div style={{
							display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr 60px", gap: 0,
							padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`,
							background: COLORS.bgAlt,
						}}>
							{["RESULT", "OPPONENT", "MY DECK", "OPP. DECK", "TURNS"].map(h => (
								<div key={h} style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.15em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{h}</div>
							))}
						</div>

						{filteredHistory.map((match, i) => {
							const resultColor = match.result === "WIN" ? "#4caf50" : match.result === "LOSS" ? "#ef5350" : "#ffd700";
							return (
								<div key={match.id}
									onMouseEnter={e => { e.currentTarget.style.background = "#0d0f17"; }}
									onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
									style={{
										display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr 60px", gap: 0,
										alignItems: "center", padding: "12px 16px",
										borderBottom: i < filteredHistory.length - 1 ? "1px solid #12141e" : "none",
										transition: "background 0.15s",
									}}>
									<span style={{ fontSize: 11, fontWeight: 700, color: resultColor, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em" }}>
										{match.result}
									</span>
									<div>
										<div style={{ fontSize: 13, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{match.opponent}</div>
										<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.04em" }}>{match.date}</div>
									</div>
									<span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{match.deck}</span>
									<span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{match.opponentDeck}</span>
									<span style={{ fontSize: 13, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{match.turns}</span>
								</div>
							);
						})}

						{filteredHistory.length === 0 && (
							<div style={{ padding: 40, textAlign: "center", color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 12, letterSpacing: "0.1em" }}>
								NO MATCHES FOUND
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
