"use client";
import { Fragment, useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { COLORS } from "../../lib/data";
import { countryFlag } from "../../lib/countries";
import { useAuth } from "../../hooks/useAuth";
import { useCards } from "../CardStoreProvider";
import { saveMatchHistory, getPlayerTournaments, getProfile, addEloAccount, selectEloAccount, removeEloAccount } from "../../lib/api";

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

export default function UserProfile() {
	const router = useRouter();
	const { status, token } = useAuth();
	const cards = useCards();

	// Legends (Riftbound champions) for the match-row champion pickers.
	const legends = useMemo(
		() => cards
			.filter(c => c.card_type_text?.includes("Legend") && isBaseCard(c.id))
			.map(c => ({ id: c.id, name: c.name, image: c.image ?? null, tags_text: c.tags_text ?? "" }))
			.sort((a, b) => a.tags_text.localeCompare(b.tags_text) || a.name.localeCompare(b.name)),
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
	// EloShowdown accounts linked to this user, and the one whose history is shown.
	const [accounts, setAccounts] = useState([]);
	const [activeId, setActiveId] = useState(null);
	const linkedPlayer = accounts.find(a => a.id === activeId) ?? null;
	// "loading" until the linked accounts are read from the Users table, then "ready".
	const [profileStatus, setProfileStatus] = useState("loading");
	// True while a linked user is searching for another account to add.
	const [addingAccount, setAddingAccount] = useState(false);
	const [linkError, setLinkError] = useState(null);
	// Account whose elo-history was requested last — older responses are dropped.
	const historyRequest = useRef(null);
	const [eloHistory, setEloHistory] = useState(null);
	const [eloHistoryLoading, setEloHistoryLoading] = useState(false);
	const [eloVisible, setEloVisible] = useState(ELO_PAGE_SIZE);
	// Per-match champion picks: { ["playerId:matchId"]: { mine, opponent } }.
	const [matchChampions, setMatchChampions] = useState({});
	const [saving, setSaving] = useState(false);
	const [saveMsg, setSaveMsg] = useState(null);
	// UVS tournament per match date, keyed "playerId:date" → null | { id, name, url }.
	// A key that's missing is still being looked up.
	const [tournaments, setTournaments] = useState({});
	const requestedTournaments = useRef(new Set());

	// Look up the tournament for each visible row's date, once per player + date.
	useEffect(() => {
		const playerId = linkedPlayer?.id;
		if (!playerId || !eloHistory?.points?.length) return;
		const visibleDates = [...eloHistory.points].reverse().slice(0, eloVisible).map(m => m.date);
		const missing = [...new Set(visibleDates)].filter(d => !requestedTournaments.current.has(`${playerId}:${d}`));
		if (missing.length === 0) return;
		missing.forEach(d => requestedTournaments.current.add(`${playerId}:${d}`));
		const keyed = value => Object.fromEntries(missing.map(d => [`${playerId}:${d}`, value(d)]));
		getPlayerTournaments(playerId, missing)
			.then(found => setTournaments(prev => ({ ...prev, ...keyed(d => found[d] ?? null) })))
			.catch(() => setTournaments(prev => ({ ...prev, ...keyed(() => null) })));
	}, [linkedPlayer, eloHistory, eloVisible]);

	// Restore the EloShowdown accounts saved on the user's profile, so they don't
	// have to search for themselves on every visit.
	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		getProfile(token)
			.then(profile => {
				if (cancelled) return;
				const linked = profile?.eloPlayers ?? [];
				const active = linked.find(p => p.id === profile.activeEloPlayerId) ?? linked[0];
				setAccounts(linked);
				if (!active) return;
				setActiveId(active.id);
				historyRequest.current = active.id;
				setEloHistoryLoading(true);
				fetch(`/api/elo/players/${active.id}/elo-history`)
					.then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
					.then(data => { if (!cancelled && historyRequest.current === active.id) setEloHistory(data); })
					.catch(() => {})
					.finally(() => { if (!cancelled && historyRequest.current === active.id) setEloHistoryLoading(false); });
			})
			.catch(() => {}) // no backend / no row yet — fall back to the search box
			.finally(() => { if (!cancelled) setProfileStatus("ready"); });
		return () => { cancelled = true; };
	}, [token]);

	// Session still resolving, or a guest being redirected — render nothing.
	if (status !== "authed") return null;

	function setChampion(matchId, side, championId) {
		const key = `${linkedPlayer.id}:${matchId}`;
		setMatchChampions(prev => ({ ...prev, [key]: { ...prev[key], [side]: championId } }));
	}

	// Send the loaded match history (with champion picks) to DynamoDB. The Lambda
	// derives the userId from the JWT and keys each match by account + matchId.
	async function handleSaveHistory() {
		if (!linkedPlayer || !eloHistory?.points?.length) return;
		setSaving(true);
		setSaveMsg(null);
		const matches = eloHistory.points.map(m => {
			const picks = matchChampions[`${linkedPlayer.id}:${m.match_id}`] || {};
			return {
				matchId: m.match_id,
				result: m.result,
				playedAt: m.date,
				opponent: m.opponent_name,
				myChampion: picks.mine ?? null,
				opponentChampion: picks.opponent ?? null,
				eventName: tournaments[`${linkedPlayer.id}:${m.date}`]?.name ?? null,
			};
		});
		try {
			await saveMatchHistory(token, linkedPlayer.id, matches);
			setSaveMsg({ ok: true, text: `Saved ${matches.length} matches to your history.` });
		} catch {
			setSaveMsg({ ok: false, text: "Could not save — make sure the backend is deployed and you're signed in." });
		} finally {
			setSaving(false);
		}
	}

	function applyAccounts(res) {
		setAccounts(res.eloPlayers ?? []);
		setActiveId(res.activeEloPlayerId ?? null);
	}

	// Show an account's history, resetting per-account view state.
	function showAccount(id) {
		setActiveId(id);
		setSaveMsg(null);
		if (id) fetchEloHistory(id);
		else { historyRequest.current = null; setEloHistory(null); setEloHistoryLoading(false); }
	}

	// Link a player from the search results, make it active, and save it to the profile.
	async function selectPlayer(player) {
		const account = {
			id: String(player.id),
			display_name: player.display_name,
			primary_community: player.primary_community,
			country: player.country,
		};
		setAccounts(prev => prev.some(a => a.id === account.id) ? prev : [...prev, account]);
		setEloResults([]);
		setEloQuery("");
		setEloError(null);
		setAddingAccount(false);
		setLinkError(null);
		showAccount(account.id);
		try {
			applyAccounts(await addEloAccount(token, account));
		} catch {
			setLinkError("Couldn't save this account to your profile — you'll need to search again next time.");
		}
	}

	async function switchAccount(id) {
		if (id === activeId) return;
		setLinkError(null);
		showAccount(id);
		try {
			await selectEloAccount(token, id);
		} catch {
			// Only the remembered default failed to save; the switch itself still works.
		}
	}

	async function removeAccount(id) {
		const remaining = accounts.filter(a => a.id !== id);
		setAccounts(remaining);
		setLinkError(null);
		if (id === activeId) showAccount(remaining[0]?.id ?? null);
		try {
			applyAccounts(await removeEloAccount(token, id));
		} catch {
			setLinkError("Couldn't unlink that account from your profile.");
		}
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
		historyRequest.current = playerId;
		setEloHistory(null);
		setEloHistoryLoading(true);
		setEloVisible(ELO_PAGE_SIZE);
		let data = null;
		try {
			const res = await fetch(`/api/elo/players/${playerId}/elo-history`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			data = await res.json();
		} catch {
			// leave history empty
		}
		// A newer account switch happened while this was in flight — drop it.
		if (historyRequest.current !== playerId) return;
		setEloHistory(data);
		setEloHistoryLoading(false);
	}

	const showSearch = profileStatus === "ready" && (!linkedPlayer || addingAccount);

	const totalGames = USER.stats.wins + USER.stats.losses + USER.stats.draws;
	const winRate = Math.round((USER.stats.wins / totalGames) * 100);
	const rank = RANK_COLORS[USER.rank] || { color: "#e8d090", glow: "#e8d09044", icon: "⭐" };

	return (
		<div style={{ width: "100%", padding: "10px 12px", boxSizing: "border-box" }}>

			{/* ── Profile Header ── */}
			<div style={{
				background: "linear-gradient(135deg, #0f1120 0%, #12101e 50%, #0f1120 100%)",
				border: `1px solid ${COLORS.border}`,
				borderRadius: 4, padding: "10px 14px", marginBottom: 10,
				display: "flex", alignItems: "center", gap: 12,
				position: "relative", zIndex: 70,
			}}>
				{/* bg decoration — clipped on its own layer so the profile dropdown can overflow the card */}
				<div style={{ position: "absolute", inset: 0, borderRadius: 4, overflow: "hidden", pointerEvents: "none" }}>
					<div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #2a104044 0%, transparent 70%)" }} />
				</div>

				{/* Avatar */}
				<div style={{
					width: 40, height: 40, borderRadius: 4, flexShrink: 0,
					background: "linear-gradient(135deg, #2a1040, #1a0830)",
					border: "2px solid #4a2060",
					display: "flex", alignItems: "center", justifyContent: "center",
					fontSize: 20, boxShadow: "0 0 12px #6020a055",
				}}>{USER.avatar}</div>

				{/* Info */}
				<div style={{ flex: 1 }}>
					<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
						<h1 style={{ fontSize: 15, fontWeight: 900, color: COLORS.gold, letterSpacing: "0.08em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
							{USER.username}
						</h1>
						<span style={{
							background: rank.glow, border: `1px solid ${rank.color}44`,
							borderRadius: 3, padding: "0 6px",
							fontSize: 10, color: rank.color, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em",
						}}>{rank.icon} {USER.rank}</span>
						{linkedPlayer && (
							<ProfileSwitcher accounts={accounts} activeId={activeId}
								onSelect={switchAccount}
								onRemove={removeAccount}
								onAdd={() => { setAddingAccount(true); setEloResults([]); setEloError(null); }} />
						)}
					</div>
					<div style={{ fontSize: 11, color: COLORS.textMuted, fontStyle: "italic", marginBottom: 2, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
						{USER.title}
					</div>
					<div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em" }}>
						MEMBER SINCE {USER.joinDate.toUpperCase()} &nbsp;·&nbsp; WIN STREAK: <span style={{ color: "#4caf50" }}>+{USER.stats.winStreak}</span>
					</div>
				</div>

				{/* Stats */}
				<div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
					{[
						{ label: "WINS", value: USER.stats.wins, color: "#4caf50" },
						{ label: "LOSSES", value: USER.stats.losses, color: "#ef5350" },
						{ label: "WIN%", value: `${winRate}%`, color: COLORS.gold },
					].map(s => (
						<div key={s.label} style={{ background: "#10121a", border: "1px solid #1e2030", borderRadius: 3, padding: "3px 10px", textAlign: "center", minWidth: 52 }}>
							<div style={{ fontSize: 14, fontWeight: 900, color: s.color, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{s.value}</div>
							<div style={{ fontSize: 8, color: COLORS.textDim, letterSpacing: "0.15em", marginTop: 1, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{s.label}</div>
						</div>
					))}
				</div>
			</div>

			{/* ── EloShowdown Search ── */}
			<div style={{
				background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
				borderRadius: 4, padding: "8px 12px", marginBottom: 10,
			}}>
				{profileStatus === "loading" && (
					<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em", padding: "4px 0" }}>
						LOADING PROFILE…
					</div>
				)}

				{linkError && (
					<div style={{ marginBottom: 6, fontSize: 11, color: "#ef5350", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{linkError}</div>
				)}

				{showSearch && (<>
				<div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
					<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.18em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
						{addingAccount ? "Link another EloShowdown account" : "Find your latest match history with Riot ID"}
					</div>
					{addingAccount && (
						<button onClick={() => { setAddingAccount(false); setEloResults([]); setEloQuery(""); setEloError(null); }}
							style={{ marginLeft: "auto", background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 10, letterSpacing: "0.12em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
							CANCEL
						</button>
					)}
				</div>

				<form onSubmit={handleEloSearch} style={{ display: "flex", gap: 6 }}>
					<input
						type="text"
						placeholder="Enter your EloShowdown username…"
						value={eloQuery}
						onChange={e => setEloQuery(e.target.value)}
						onFocus={e => { e.target.style.borderColor = "#4a5090"; }}
						onBlur={e => { e.target.style.borderColor = "#1e2030"; }}
						style={{
							background: "#0d0f18", border: "1px solid #1e2030", borderRadius: 3,
							padding: "5px 8px", color: "#e8e0d0", fontFamily: "'Segoe UI', system-ui, sans-serif",
							fontSize: 12, width: "100%", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
						}}
					/>
					<button type="submit" disabled={eloLoading || !eloQuery.trim()}
						style={{
							background: eloLoading || !eloQuery.trim() ? "#1a1c28" : "#1a1f35",
							border: `1px solid ${eloLoading || !eloQuery.trim() ? "#1e2030" : "#4a5090"}`,
							borderRadius: 3, padding: "5px 14px", color: eloLoading || !eloQuery.trim() ? COLORS.textDim : "#8890cc",
							fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 10, letterSpacing: "0.12em",
							cursor: eloLoading || !eloQuery.trim() ? "not-allowed" : "pointer",
							whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0,
						}}>
						{eloLoading ? "SEARCHING…" : "SEARCH"}
					</button>
				</form>

				{ eloError && (
					<div style={{ marginTop: 6, fontSize: 11, color: "#ef5350", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{eloError}</div>
				) }

				{ eloResults.length > 0 && (
					<div style={{ marginTop: 6, background: "#0a0c14", border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
						{eloResults.map((player, i) => (
							<div key={player.id}
								onClick={() => selectPlayer(player)}
								onMouseEnter={e => { e.currentTarget.style.background = "#0d0f17"; }}
								onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
								style={{
									display: "flex", alignItems: "center", gap: 10, padding: "3px 8px",
									borderBottom: i < eloResults.length - 1 ? "1px solid #12141e" : "none",
									cursor: "pointer", transition: "background 0.15s",
								}}>
								<div style={{ flex: 1 }}>
									<div style={{ fontSize: 12, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{player.display_name}</div>
									<div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
										{player.primary_community} · {countryFlag(player.country)} {player.country}
									</div>
								</div>
							</div>
						))}
					</div>
				) }

				</>)}

				{/* ── ELO History ── */}
				{ linkedPlayer && !addingAccount && (
					<div style={{ marginBottom: 4 }}>
						{eloHistoryLoading && (
							<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em", padding: "4px 0" }}>
								LOADING MATCH HISTORY…
							</div>
						)}
						{ eloHistory && (() => {
							const points = [...eloHistory.points].reverse();
							const current = eloHistory.points[eloHistory.points.length - 1]?.elo_after;
							const recent = points.slice(0, eloVisible);
							const hasMore = points.length > eloVisible;
							const tournamentFor = m => tournaments[`${linkedPlayer.id}:${m.date}`];
							// Rows group by resolved tournament, or by day while unresolved.
							const groupKeyFor = m => tournamentFor(m)?.id ?? `${tournamentFor(m)}-${m.date.slice(0, 10)}`;
							return (
								<div>
									<div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
										<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.15em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
											ELO
										</div>
										<div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
											{current}
										</div>
										<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.1em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
											{eloHistory.season_slug.replace(/-/g, " ").toUpperCase()}
										</div>
									</div>
									<div>
										{recent.map((m, i) => {
											const resultColor = m.result === "win" ? "#4caf50" : m.result === "loss" ? "#ef5350" : "#ffd700";
											const changeSign = m.elo_change > 0 ? "+" : "";
											const d = new Date(m.date);
											const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
											const picks = matchChampions[`${linkedPlayer.id}:${m.match_id}`] || {};
											// Consecutive matches from the same tournament share one header row.
											const showHeader = i === 0 || groupKeyFor(m) !== groupKeyFor(recent[i - 1]);
											const endsGroup = i < recent.length - 1 && groupKeyFor(m) !== groupKeyFor(recent[i + 1]);
											return (
												<Fragment key={m.match_id}>
												{showHeader && (
													<TournamentHeader tournament={tournamentFor(m)} dateStr={dateStr} />
												)}
												<div
													style={{
														position: "relative", height: 44, background: "#0a0c14",
														border: `1px solid ${COLORS.border}`, borderTop: "none",
														marginBottom: endsGroup ? 12 : 0,
														overflow: "visible",
													}}>
													<ChampionHalf side="left" label="YOU" champions={legends} value={picks.mine}
														onSelect={id => setChampion(m.match_id, "mine", id)} />
													<ChampionHalf side="right" label="OPP" champions={legends} value={picks.opponent}
														onSelect={id => setChampion(m.match_id, "opponent", id)} />
													{/* 1fr | auto | 1fr keeps the opponent name centred regardless of the flanking widths. */}
													<div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", columnGap: 10, pointerEvents: "none", zIndex: 3 }}>
														<span style={{ justifySelf: "end", fontSize: 11, fontWeight: 700, color: resultColor, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", textShadow: "0 1px 4px #000" }}>
															{m.result}
														</span>
														<span style={{ fontSize: 14, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif", textShadow: "0 1px 4px #000" }}>{m.opponent_name}</span>
														<span style={{ justifySelf: "start", fontSize: 14, fontWeight: 700, color: m.elo_change > 0 ? "#4caf50" : m.elo_change < 0 ? "#ef5350" : COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", textShadow: "0 1px 4px #000" }}>
															{changeSign}{m.elo_change}
														</span>
													</div>
												</div>
												</Fragment>
											);
										})}
									</div>
									{ hasMore && (
										<button
											onClick={() => setEloVisible(v => v + ELO_PAGE_SIZE)}
											onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a5090"; e.currentTarget.style.color = "#8890cc"; }}
											onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2030"; e.currentTarget.style.color = COLORS.textMuted; }}
											style={{
												width: "100%", marginTop: 4, padding: "4px 12px",
												background: "#12141e", border: "1px solid #1e2030", borderRadius: 3,
												color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif",
												fontSize: 10, letterSpacing: "0.14em", cursor: "pointer", transition: "all 0.2s",
											}}>
											LOAD MORE ({points.length - eloVisible} MORE)
										</button>
									) }

									{/* Save the whole loaded history (with champion picks) to DynamoDB */}
									<button onClick={handleSaveHistory} disabled={saving}
										onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = "0 0 18px #e8d09055"; }}
										onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
										style={{
											width: "100%", marginTop: 4, padding: "5px 12px", borderRadius: 3,
											background: saving ? "#1a1c28" : "linear-gradient(135deg, #e8d090, #d4bc78)",
											border: `1px solid ${saving ? "#1e2030" : "#f0dca0"}`,
											color: saving ? COLORS.textDim : "#1a1206",
											fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
											cursor: saving ? "not-allowed" : "pointer", transition: "all 0.2s",
										}}>
										{saving ? "SAVING…" : "SAVE MATCH HISTORY"}
									</button>

									{saveMsg && (
										<div style={{ marginTop: 4, fontSize: 11, textAlign: "center", color: saveMsg.ok ? "#4caf50" : "#ef5350", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
											{saveMsg.text}
										</div>
									)}
								</div>
							);
						} ) () }
					</div>
				) }

			</div>
		</div>
	);
}

// ── Profile switcher ─────────────────────────────────────────────────────────
// Chip next to the username showing the active EloShowdown account. The menu
// lists every linked account: click one to switch, ✕ to unlink, or add another.

function ProfileSwitcher({ accounts, activeId, onSelect, onRemove, onAdd }) {
	const [open, setOpen] = useState(false);
	const font = "'Segoe UI', system-ui, sans-serif";
	const active = accounts.find(a => a.id === activeId);
	const hover = {
		onMouseEnter: e => { e.currentTarget.style.background = "#161a28"; },
		onMouseLeave: e => { e.currentTarget.style.background = "transparent"; },
	};

	return (
		<div style={{ position: "relative" }}>
			<button onClick={() => setOpen(o => !o)}
				onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a5090"; }}
				onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a3060"; }}
				style={{
					display: "flex", alignItems: "center", gap: 6,
					background: "#0d1020", border: "1px solid #2a3060", borderRadius: 3,
					padding: "1px 8px", cursor: "pointer", transition: "border-color 0.2s",
					fontSize: 11, color: "#8890cc", fontFamily: font,
				}}>
				🔗 {active?.display_name ?? active?.id}
				{accounts.length > 1 && <span style={{ fontSize: 10, color: COLORS.textMuted }}>+{accounts.length - 1}</span>}
				<span style={{ fontSize: 8, color: COLORS.textMuted }}>{open ? "▲" : "▼"}</span>
			</button>

			{open && (
				<>
					{/* click-away backdrop */}
					<div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
					<div style={{
						position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
						width: 280, maxWidth: "calc(100vw - 32px)", maxHeight: 360, overflowY: "auto",
						background: "#10121a", border: `1px solid ${COLORS.border}`, borderRadius: 3,
						boxShadow: "0 8px 24px #00000088",
					}}>
						{accounts.map(a => {
							const isActive = a.id === activeId;
							return (
								<div key={a.id} {...hover}
									onClick={() => { setOpen(false); onSelect(a.id); }}
									style={{
										display: "flex", alignItems: "center", gap: 8, padding: "7px 8px 7px 12px",
										borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", transition: "background 0.15s",
									}}>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? COLORS.gold : COLORS.text, fontFamily: font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
											{isActive ? "✓ " : ""}{a.display_name ?? a.id}
										</div>
										{(a.primary_community || a.country) && (
											<div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: font, marginTop: 2 }}>
												{[a.primary_community, a.country && `${countryFlag(a.country)} ${a.country}`].filter(Boolean).join(" · ")}
											</div>
										)}
									</div>
									<button title="Unlink this account"
										onClick={e => { e.stopPropagation(); setOpen(false); onRemove(a.id); }}
										onMouseEnter={e => { e.currentTarget.style.color = "#ef5350"; }}
										onMouseLeave={e => { e.currentTarget.style.color = COLORS.textDim; }}
										style={{ background: "transparent", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 12, padding: "2px 4px", flexShrink: 0 }}>
										✕
									</button>
								</div>
							);
						})}
						<button {...hover} onClick={() => { setOpen(false); onAdd(); }}
							style={{
								display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
								background: "transparent", border: "none", cursor: "pointer",
								fontSize: 11, letterSpacing: "0.1em", color: "#8890cc", fontFamily: font, transition: "background 0.15s",
							}}>
							＋ ADD ACCOUNT
						</button>
					</div>
				</>
			)}
		</div>
	);
}

// ── Tournament header ────────────────────────────────────────────────────────
// Full-width row above each group of matches from the same UVS tournament.

function TournamentHeader({ tournament, dateStr }) {
	const label = tournament === undefined
		? "Looking up tournament…"
		: tournament
			? tournament.name
			: "Tournament not found";
	return (
		<div style={{
			display: "flex", alignItems: "center", gap: 8, height: 20, padding: "0 8px",
			background: "#0d0f18", border: `1px solid ${COLORS.border}`, borderRadius: "3px 3px 0 0",
			fontSize: 10, letterSpacing: "0.06em", fontFamily: "'Segoe UI', system-ui, sans-serif",
		}}>
			{tournament ? (
				<a href={tournament.url} target="_blank" rel="noopener noreferrer"
					onMouseEnter={e => { e.currentTarget.style.textDecoration = "underline"; }}
					onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}
					style={{ color: COLORS.gold, fontWeight: 700, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
					{label}
				</a>
			) : (
				<span style={{ color: COLORS.textDim, fontStyle: "italic" }}>{label}</span>
			)}
			<span style={{ color: COLORS.textDim, marginLeft: "auto", flexShrink: 0 }}>{dateStr}</span>
		</div>
	);
}

// ── Champion half ────────────────────────────────────────────────────────────
// Fills its half (left/right) of a match row with the selected champion's art,
// clipped so it never overflows the row. Click opens the legend picker.

// Tallest the legend picker gets; it opens upward when there isn't this much room below.
const PICKER_MAX_HEIGHT = 360;
const PICKER_GAP = 4;

function ChampionHalf({ champions, value, onSelect, label, side }) {
	const [open, setOpen] = useState(false);
	const [openUp, setOpenUp] = useState(false);
	const wrapperRef = useRef(null);
	const champ = champions.find(c => c.id === value);
	const isLeft = side === "left";
	// Fade the art toward the row's centre so the match info stays readable.
	const fade = isLeft
		? "linear-gradient(90deg, rgba(10,12,20,0) 25%, rgba(10,12,20,0.96) 100%)"
		: "linear-gradient(270deg, rgba(10,12,20,0) 25%, rgba(10,12,20,0.96) 100%)";

	return (
		<div ref={wrapperRef} style={{ position: "absolute", [isLeft ? "left" : "right"]: 0, top: 0, width: "50%", height: "100%", zIndex: open ? 60 : 1 }}>
			<button onClick={() => {
				if (!open) {
					// Measure on open: flip above the row if the picker would run past
					// the bottom of the viewport and there's more room above.
					const rect = wrapperRef.current.getBoundingClientRect();
					const spaceBelow = window.innerHeight - rect.bottom;
					setOpenUp(spaceBelow < PICKER_MAX_HEIGHT + PICKER_GAP && rect.top > spaceBelow);
				}
				setOpen(o => !o);
			}}
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
					position: "relative", zIndex: 1, padding: "0 8px",
					fontSize: 10, letterSpacing: "0.1em", whiteSpace: "nowrap",
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
						position: "absolute", [openUp ? "bottom" : "top"]: `calc(100% + ${PICKER_GAP}px)`, [isLeft ? "left" : "right"]: 8, zIndex: 50,
						width: 280, maxWidth: "calc(100vw - 32px)", maxHeight: PICKER_MAX_HEIGHT, overflowY: "auto",
						background: "#10121a", border: `1px solid ${COLORS.border}`, borderRadius: 3,
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
								style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 12px", cursor: "pointer", transition: "background 0.15s" }}>
								<div style={{ position: "relative", width: 27, height: 36, borderRadius: 2, overflow: "hidden", background: "#0a0c14", flexShrink: 0 }}>
									{c.image && <Image src={c.image} alt={c.tags_text} fill sizes="27px" style={{ objectFit: "cover", objectPosition: "top" }} />}
								</div>
								<span style={{ fontSize: 14, color: c.id === value ? COLORS.gold : COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>{c.tags_text}</span>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}
