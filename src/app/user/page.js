"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { COLORS } from "../../lib/data";
import { countryFlag } from "../../lib/countries";
import { useAuth } from "../../hooks/useAuth";
import { useCards } from "../../components/CardStoreProvider";

// A legend's base printing (mirrors the check in DeckSources).
function isBaseCard(id) {
	const match = id?.match(/-(\d+)[^/]*\/(\d+)/);
	if (!match) return true;
	return parseInt(match[1], 10) < parseInt(match[2], 10);
}

// ── Dummy data ─────────────────────────────────────────────────────────────────

const RANK_COLORS = {
	"Bronze": { color: "#cd7f32", glow: "#cd7f3233", icon: "🥉" },
	"Silver": { color: "#c0c0c0", glow: "#c0c0c033", icon: "🥈" },
	"Gold": { color: "#ffd700", glow: "#ffd70033", icon: "🥇" },
	"Platinum": { color: "#4fc3f7", glow: "#4fc3f733", icon: "💎" },
	"Diamond": { color: "#b388ff", glow: "#b388ff33", icon: "🔷" },
	"Master": { color: "#ff6d00", glow: "#ff6d0033", icon: "👑" },
};

const USER = {
	username: "ShadowRift",
	avatar: "🧙",
	title: "Keeper of the Seventh Seal",
	rank: "Platinum",
	joinDate: "March 2024",
	stats: { wins: 142, losses: 58, draws: 7, winStreak: 6 },
};

// How many match-history rows to reveal per "Load More" click.
const ELO_PAGE_SIZE = 10;

// ── Component ──────────────────────────────────────────────────────────────────

export default function UserPage() {
	const router = useRouter();
	const { status } = useAuth();
	const cards = useCards();

	// Legends (Riftbound champions) for the match-row champion pickers.
	const legends = useMemo(
		() => cards
			.filter(c => c.card_type_text?.includes("Legend") && isBaseCard(c.id))
			.map(c => ({ id: c.id, name: c.name, image: c.image ?? null, tags_text: c.tags_text ?? "" }))
			.sort((a, b) => a.name.localeCompare(b.name)),
		[cards]
	);

	// Redirect guests to sign-in once the session check resolves.
	useEffect(() => {
		if (status === "guest") router.replace("/login");
	}, [status, router]);

	const [eloQuery, setEloQuery] = useState("");
	const [eloResults, setEloResults] = useState([]);
	const [eloLoading, setEloLoading] = useState(false);
	const [eloError, setEloError] = useState(null);
	const [linkedPlayer, setLinkedPlayer] = useState(null);
	const [eloHistory, setEloHistory] = useState(null);
	const [eloHistoryLoading, setEloHistoryLoading] = useState(false);
	const [eloVisible, setEloVisible] = useState(ELO_PAGE_SIZE);
	// Per-match champion picks: { [matchId]: { mine, opponent } }.
	const [matchChampions, setMatchChampions] = useState({});

	// Session still resolving, or a guest being redirected — render nothing.
	if (status !== "authed") return null;

	function setChampion(matchId, side, championId) {
		setMatchChampions(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: championId } }));
	}

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
		setEloVisible(ELO_PAGE_SIZE);
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
	const winRate = Math.round((USER.stats.wins / totalGames) * 100);
	const rank = RANK_COLORS[USER.rank] || { color: "#e8d090", glow: "#e8d09044", icon: "⭐" };

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
						{ label: "WINS", value: USER.stats.wins, color: "#4caf50" },
						{ label: "LOSSES", value: USER.stats.losses, color: "#ef5350" },
						{ label: "WIN%", value: `${winRate}%`, color: COLORS.gold },
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

				{ eloError && (
					<div style={{ marginTop: 12, fontSize: 12, color: "#ef5350", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{eloError}</div>
				) }

				{ eloResults.length > 0 && (
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
				) }

				{ linkedPlayer && (
					<div style={{
						display: "flex", alignItems: "center", gap: 14, marginTop: 16, marginBottom: 16,
						background: "#0d1020", border: "1px solid #2a3060", borderRadius: 10, padding: "12px 16px",
					}}>
						<div style={{ fontSize: 18 }}>🔗</div>
						<div style={{ flex: 1 }}>
							<div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{linkedPlayer.display_name}</div>
							<div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif", marginTop: 2 }}>
								{linkedPlayer.primary_community} · {countryFlag(linkedPlayer.country)} {linkedPlayer.country}
							</div>
						</div>
						<button onClick={() => { setLinkedPlayer(null); setEloResults([]); setEloQuery(""); setEloHistory(null); setEloVisible(ELO_PAGE_SIZE); }}
							style={{ background: "transparent", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
					</div>
				) }

				{/* ── ELO History ── */}
				{ linkedPlayer && (
					<div style={{ marginBottom: 16 }}>
						{eloHistoryLoading && (
							<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em", padding: "10px 0" }}>
								LOADING MATCH HISTORY…
							</div>
						)}
						{ eloHistory && (() => {
							const points = [...eloHistory.points].reverse();
							const current = eloHistory.points[eloHistory.points.length - 1]?.elo_after;
							const recent = points.slice(0, eloVisible);
							const hasMore = points.length > eloVisible;
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
									<div style={{ background: "#0a0c14", border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "visible" }}>
										{recent.map((m, i) => {
											const resultColor = m.result === "win" ? "#4caf50" : m.result === "loss" ? "#ef5350" : "#ffd700";
											const changeSign = m.elo_change > 0 ? "+" : "";
											const d = new Date(m.date);
											const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
											const picks = matchChampions[m.match_id] || {};
											return (
												<div key={m.match_id}
													style={{
														position: "relative", height: 68,
														borderBottom: i < recent.length - 1 ? "1px solid #12141e" : "none",
														overflow: "visible",
													}}>
													<ChampionHalf side="left" label="YOU" champions={legends} value={picks.mine}
														onSelect={id => setChampion(m.match_id, "mine", id)} />
													<ChampionHalf side="right" label="OPP" champions={legends} value={picks.opponent}
														onSelect={id => setChampion(m.match_id, "opponent", id)} />
													<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, pointerEvents: "none", zIndex: 3 }}>
														<span style={{ fontSize: 11, fontWeight: 700, color: resultColor, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", textShadow: "0 1px 4px #000" }}>
															{m.result}
														</span>
														<div style={{ textAlign: "center" }}>
															<div style={{ fontSize: 13, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif", textShadow: "0 1px 4px #000" }}>{m.opponent_name}</div>
															<div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", marginTop: 1, textShadow: "0 1px 4px #000" }}>{dateStr}</div>
														</div>
														<span style={{ fontSize: 13, fontWeight: 700, color: m.elo_change > 0 ? "#4caf50" : m.elo_change < 0 ? "#ef5350" : COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", textShadow: "0 1px 4px #000" }}>
															{changeSign}{m.elo_change}
														</span>
													</div>
												</div>
											);
										})}
									</div>
									{ hasMore && (
										<button
											onClick={() => setEloVisible(v => v + ELO_PAGE_SIZE)}
											onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a5090"; e.currentTarget.style.color = "#8890cc"; }}
											onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2030"; e.currentTarget.style.color = COLORS.textMuted; }}
											style={{
												width: "100%", marginTop: 12, padding: "10px 20px",
												background: "#12141e", border: "1px solid #1e2030", borderRadius: 10,
												color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif",
												fontSize: 11, letterSpacing: "0.14em", cursor: "pointer", transition: "all 0.2s",
											}}>
											LOAD MORE ({points.length - eloVisible} MORE)
										</button>
									) }
								</div>
							);
						} ) () }
					</div>
				) }

			</div>
		</div>
	);
}

// ── Champion half ────────────────────────────────────────────────────────────
// Fills its half (left/right) of a match row with the selected champion's art,
// clipped so it never overflows the row. Click opens the legend picker.

function ChampionHalf({ champions, value, onSelect, label, side }) {
	const [open, setOpen] = useState(false);
	const champ = champions.find(c => c.id === value);
	const isLeft = side === "left";
	// Fade the art toward the row's centre so the match info stays readable.
	const fade = isLeft
		? "linear-gradient(90deg, rgba(10,12,20,0) 25%, rgba(10,12,20,0.96) 100%)"
		: "linear-gradient(270deg, rgba(10,12,20,0) 25%, rgba(10,12,20,0.96) 100%)";

	return (
		<div style={{ position: "absolute", [isLeft ? "left" : "right"]: 0, top: 0, width: "50%", height: "100%", zIndex: open ? 60 : 1 }}>
			<button onClick={() => setOpen(o => !o)}
				title={champ ? champ.tags_text : "Select champion"}
				style={{
					width: "100%", height: "100%", position: "relative", overflow: "hidden",
					border: "none", background: champ ? "transparent" : "#0a0c14", cursor: "pointer", padding: 0,
					display: "flex", alignItems: "center", justifyContent: isLeft ? "flex-start" : "flex-end",
				}}>
				{champ?.image && (
					<Image src={champ.image} alt={champ.tags_text} fill sizes="360px" style={{ objectFit: "cover", objectPosition: "center 22%" }} />
				)}
				<div style={{ position: "absolute", inset: 0, background: fade, pointerEvents: "none" }} />
				<span style={{
					position: "relative", zIndex: 1, padding: "0 12px",
					fontSize: 9, letterSpacing: "0.1em", whiteSpace: "nowrap",
					color: champ ? COLORS.gold : COLORS.textDim,
					fontFamily: "'Segoe UI', system-ui, sans-serif",
				}}>
					{champ ? `${label} · ${champ.tags_text}` : `＋ ${label}`}
				</span>
			</button>

			{open && (
				<>
					{/* click-away backdrop */}
					<div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
					<div style={{
						position: "absolute", top: "calc(100% + 4px)", [isLeft ? "left" : "right"]: 8, zIndex: 50,
						minWidth: 190, maxHeight: 260, overflowY: "auto",
						background: "#10121a", border: `1px solid ${COLORS.border}`, borderRadius: 10,
						boxShadow: "0 8px 24px #00000088",
					}}>
						{champions.length === 0 && (
							<div style={{ padding: "12px 14px", fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.06em" }}>
								Visit the Cards page first to load legends.
							</div>
						)}
						{champions.map(c => (
							<div key={c.id}
								onClick={() => { onSelect(c.id); setOpen(false); }}
								onMouseEnter={e => { e.currentTarget.style.background = "#161a28"; }}
								onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
								style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", cursor: "pointer", transition: "background 0.15s" }}>
								<div style={{ position: "relative", width: 26, height: 36, borderRadius: 4, overflow: "hidden", background: "#0a0c14", flexShrink: 0 }}>
									{c.image && <Image src={c.image} alt={c.tags_text} fill sizes="26px" style={{ objectFit: "cover", objectPosition: "top" }} />}
								</div>
								<span style={{ fontSize: 12, color: c.id === value ? COLORS.gold : COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{c.tags_text}</span>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}
