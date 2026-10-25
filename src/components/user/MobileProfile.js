"use client";
import { Fragment, useEffect, useState } from "react";
import { COLORS, FONT_MONO, LAYOUT, alpha } from "../../lib/data";
import { titleCase } from "../../lib/cards/data";
import { seasonLabel, scoreOptions, bestOf, playedLabel } from "../../lib/matchStats";
import { playerSummary, isUnpairedLegacy, pairCandidates } from "../../lib/history";
import BottomSheet from "../BottomSheet";
import LegendIcon from "../cards/LegendIcon";
import RuneIcons from "../cards/RuneIcons";
import NexusNight from "./NexusNight";
import MatchStats, { Chevron, FieldSelect } from "./MatchStats";
import GuestNotice from "./GuestNotice";
import GetStarted from "./GetStarted";

// ── Profile on phones ────────────────────────────────────────────────────────
// Same state and handlers as the desktop profile (UserProfile owns them), laid
// out for a 360–390px screen: one-line user card that expands to stat tiles,
// DATA / HISTORY tabs pinned under the navbar, two-line match rows whose legend
// slots open a bottom-sheet picker, and a save bar that docks at the bottom
// while picks are unsaved. Until an account is linked, the get-started steps sit
// above the search; after that a guest gets the not-saved notice under the card,
// and the save bar sends them to log in.

const LABEL = { fontSize: 10, letterSpacing: "0.14em", color: COLORS.textDim };
const RESULT_COLOR = { win: COLORS.win, loss: COLORS.loss, draw: COLORS.draw };
// "3 Oct" for a date, "Oct 2026" for a month-only match (see playedLabel).
const shortDate = d => playedLabel(d);

export default function MobileProfile(p) {
	const [accountsOpen, setAccountsOpen] = useState(false);
	// { match, side, round } while a picker is open — side "mine" / "opponent"
	// for a legend, "score" for the final score.
	const [picker, setPicker] = useState(null);

	const isHistory = p.matchTab === "history";
	const savingOff = p.savedStatus === "error";
	const showSaveBar = Boolean(p.linkedPlayer) && isHistory && (p.unsaved.size > 0 || savingOff);

	// A successful save confirms for 3s; a failure stays until dismissed.
	const { saveMsg, onDismissSave } = p;
	useEffect(() => {
		if (!saveMsg?.ok) return;
		const t = setTimeout(onDismissSave, 3000);
		return () => clearTimeout(t);
	}, [saveMsg, onDismissSave]);

	return (
		<div style={{ fontFamily: FONT_MONO, paddingBottom: showSaveBar ? 84 : 16 }}>
			<UserCard {...p} onOpenAccounts={() => setAccountsOpen(true)} />
			{p.firstRun && <GetStarted mobile guest={p.isGuest} />}
			{p.isGuest && !p.firstRun && <GuestNotice mobile />}
			{p.carriedOver && <GuestNotice mobile carried onSave={p.onSave} saving={p.saving} />}

			{p.profileStatus === "loading" && <Note>LOADING PROFILE…</Note>}
			{p.linkError && <Note color={COLORS.loss}>{p.linkError}</Note>}
			{p.showSearch && <LinkAccount {...p} />}

			{p.linkedPlayer && !p.addingAccount && (
				<>
					<div role="tablist" style={{
						position: "sticky", top: LAYOUT.navHeight, zIndex: 10, marginTop: 12,
						display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}`,
					}}>
						{[["data", "DATA"], ["history", "HISTORY"], ["nexus", "NEXUS NIGHT"]].map(([key, text]) => (
							<button key={key} role="tab" aria-selected={p.matchTab === key} onClick={() => p.setMatchTab(key)} style={{
								position: "relative", height: 48, background: "transparent", border: "none", cursor: "pointer",
								fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.14em", fontWeight: 700,
								color: p.matchTab === key ? COLORS.accent : COLORS.textMuted,
							}}>
								{text}
								<span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: COLORS.accent, opacity: p.matchTab === key ? 1 : 0 }} />
							</button>
						))}
					</div>
					{/* Season for Data and History; Nexus Night drafts aren't seasonal */}
					{p.matchTab !== "nexus" && (
						<div style={{ padding: "12px 12px 0" }}>
							<FieldSelect label="SEASON" value={p.season ?? "all"} options={p.seasonOptions} onChange={p.onSeasonChange} />
						</div>
					)}
					{p.matchTab === "nexus"
						? <div style={{ padding: 12 }}><NexusNight {...p.nexusProps} mobile /></div>
						: isHistory
						? <History {...p} onOpenPicker={setPicker} />
						: (
							<div style={{ padding: 12 }}>
								<MatchStats mobile matches={p.dataMatches} accounts={p.dataAccounts} legends={p.legends} status={p.savedStatus}
									season={p.season} seasonName={p.seasonName} seasons={p.seasons}
									onGoToHistory={() => p.setMatchTab("history")} />
							</div>
						)}
				</>
			)}

			{showSaveBar && <SaveBar count={p.unsaved.size} off={savingOff} saving={p.saving} onSave={p.onSave} guest={p.isGuest} />}
			{saveMsg && isHistory && <Toast ok={saveMsg.ok} onClose={onDismissSave} />}
			{picker && (picker.side === "score"
				? <ScoreSheet {...p} picker={picker} onClose={() => setPicker(null)} />
				: <LegendSheet {...p} picker={picker} onClose={() => setPicker(null)} />)}
			{accountsOpen && <AccountSheet {...p} onClose={() => setAccountsOpen(false)} />}
		</div>
	);
}

// ── User card ────────────────────────────────────────────────────────────────

function UserCard({ user, lastLegend, mostPlayed, linkedPlayer, cardStats, cardSeason, statsReady, onOpenAccounts }) {
	const { record, streaks, last, peak } = cardStats;
	const winPct = record.winRate == null ? "—" : `${Math.round(record.winRate * 100)}%`;
	const initials = user.username.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "?";
	return (
		<div style={{ padding: "12px 12px 0" }}>
			<div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}>
				<div style={{ display: "flex", gap: 12, padding: 12, alignItems: "center" }}>
					{/* The legend they last played, else their initials */}
					{lastLegend ? <LegendIcon legend={lastLegend} size={52} borderColor={COLORS.borderHover} /> : (
						<span style={{
							width: 52, height: 52, flexShrink: 0, background: COLORS.bgHover, border: `1px solid ${COLORS.borderHover}`,
							display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: COLORS.textStrong,
						}}>{initials}</span>
					)}
					<div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
						<span style={{ fontSize: 15, fontWeight: 700, color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</span>
						<span style={{ fontSize: 11, color: COLORS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.subtitle}</span>
						{mostPlayed && (
							<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, minWidth: 0 }}>
								<span style={{ fontSize: 9, letterSpacing: "0.14em", color: COLORS.textDim, flexShrink: 0 }}>MOST</span>
								<span style={{ color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mostPlayed.legend.tags_text}</span>
								<RuneIcons domains={mostPlayed.legend.domains} size={12} />
								<span style={{ color: COLORS.textDim, flexShrink: 0 }}>{mostPlayed.games}G</span>
							</span>
						)}
						{lastLegend && (
							<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, minWidth: 0 }}>
								<span style={{ fontSize: 9, letterSpacing: "0.14em", color: COLORS.textDim, flexShrink: 0 }}>LAST</span>
								<span style={{ color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastLegend.tags_text}</span>
								<RuneIcons domains={lastLegend.domains} size={12} />
							</span>
						)}
						{linkedPlayer && (
							<button onClick={onOpenAccounts} style={{
								alignSelf: "flex-start", maxWidth: "100%", height: 36, display: "flex", alignItems: "center", gap: 8, padding: "0 10px 0 6px",
								background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, color: COLORS.text, fontFamily: FONT_MONO, fontSize: 11, cursor: "pointer",
							}}>
								<EsBadge />
								<span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{linkedPlayer.display_name}</span>
								<Chevron color="currentColor" />
							</button>
						)}
					</div>
				</div>
				<div style={{ padding: 12, borderTop: `1px solid ${COLORS.border}` }}>
					<div style={{ ...LABEL, color: COLORS.textStrong, marginBottom: 8 }}>{cardSeason.season ? seasonLabel(cardSeason.season).toUpperCase() : "ALL SAVED MATCHES"}</div>
					{!statsReady ? (
						<div style={{ fontSize: 11, color: COLORS.textDim }}>Stats appear once your saved matches load.</div>
					) : (
						// ELO and PEAK get the wide row — the numbers people check first.
						<div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 }}>
							<Tile span={3} hero label="ELO" value={last?.eloAfter ?? "—"} valueColor={COLORS.accent}
								sub={last?.eloChange ? `${last.eloChange > 0 ? "+" : ""}${last.eloChange} last` : ""}
								subColor={last?.eloChange > 0 ? COLORS.win : COLORS.loss} />
							<Tile span={3} hero label="PEAK" value={peak?.eloAfter ?? "—"} sub={shortDate(peak?.playedAt ?? peak?.month)} />
							<Tile span={2} label="RECORD" value={<Record record={record} />} sub={`${record.games} games`} />
							<Tile span={2} label="WIN%" value={winPct} sub={record.draws ? "draws = games" : ""} />
							<Tile span={2} label="STREAK" value={streaks.current ? `${streaks.current.result[0]}${streaks.current.length}` : "—"}
								valueColor={streaks.current ? RESULT_COLOR[streaks.current.result.toLowerCase()] : undefined}
								sub={streaks.bestWin ? `best W${streaks.bestWin}` : ""} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function Tile({ span, hero, label, value, valueColor, sub, subColor }) {
	return (
		<div style={{ gridColumn: `span ${span}`, background: COLORS.bg, border: `1px solid ${COLORS.border}`, padding: hero ? 10 : "10px 8px", minWidth: 0 }}>
			<div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.14em" }}>{label}</div>
			<div style={{ fontSize: hero ? 28 : 16, fontWeight: 700, lineHeight: hero ? 1.15 : 1.5, color: valueColor ?? COLORS.textStrong, whiteSpace: "nowrap" }}>{value}</div>
			<div style={{ fontSize: hero ? 11 : 10, color: subColor ?? COLORS.textDim, minHeight: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
		</div>
	);
}

function Record({ record }) {
	return (
		<span style={{ whiteSpace: "nowrap" }}>
			<span style={{ color: COLORS.win }}>{record.wins}</span>-<span style={{ color: COLORS.loss }}>{record.losses}</span>-<span style={{ color: COLORS.draw }}>{record.draws}</span>
		</span>
	);
}

// "ID" mark for a linked Riot account ID.
function EsBadge() {
	return (
		<span style={{
			width: 22, height: 22, flexShrink: 0, border: `1px solid ${COLORS.borderHover}`, display: "flex", alignItems: "center", justifyContent: "center",
			fontSize: 8, fontWeight: 700, color: COLORS.textMuted, letterSpacing: "0.05em",
		}}>ID</span>
	);
}

// ── Linking a player account (BoundRift search) ──────────────────────────────

function LinkAccount({ addingAccount, eloQuery, setEloQuery, eloResults, eloLoading, eloError, onSearch, onPickPlayer, onCancelAdd }) {
	return (
		<div style={{ margin: "12px 12px 0", background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<span style={{ ...LABEL, flex: 1, lineHeight: 1.6 }}>{addingAccount ? "LINK ANOTHER RIOT ACCOUNT ID" : "FIND YOUR MATCH HISTORY WITH YOUR RIOT ACCOUNT ID"}</span>
				{addingAccount && (
					<button onClick={onCancelAdd} style={{ height: 44, padding: "0 8px", background: "transparent", border: "none", color: COLORS.textMuted, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", cursor: "pointer" }}>CANCEL</button>
				)}
			</div>
			<form onSubmit={onSearch} style={{ display: "flex", gap: 8 }}>
				<input value={eloQuery} onChange={e => setEloQuery(e.target.value)} placeholder="Your Riot account ID"
					onFocus={e => { e.target.style.borderColor = COLORS.accent; }}
					onBlur={e => { e.target.style.borderColor = COLORS.border; }}
					style={{ flex: 1, minWidth: 0, height: 48, padding: "0 12px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: 16, outline: "none" }} />
				<button type="submit" disabled={eloLoading || !eloQuery.trim()} style={{
					height: 48, padding: "0 14px", flexShrink: 0, cursor: "pointer",
					background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, color: COLORS.text,
					fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, opacity: eloLoading || !eloQuery.trim() ? 0.5 : 1,
				}}>{eloLoading ? "…" : "SEARCH"}</button>
			</form>
			{eloError && <span style={{ fontSize: 12, color: COLORS.loss }}>{eloError}</span>}
			{eloResults.length > 0 && (
				<div style={{ border: `1px solid ${COLORS.border}` }}>
					{eloResults.map((player, i) => (
						<button key={player.id} onClick={() => onPickPlayer(player)} style={{
							width: "100%", minHeight: 52, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, padding: "6px 12px",
							background: "transparent", border: "none", borderTop: i ? `1px solid ${COLORS.border}` : "none", cursor: "pointer", textAlign: "left", fontFamily: FONT_MONO,
						}}>
							<span style={{ fontSize: 13, color: COLORS.textStrong }}>{player.display_name}</span>
							<span style={{ fontSize: 10, color: COLORS.textMuted }}>{playerSummary(player)}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function AccountSheet({ isGuest, accounts, activeId, savedMatches, onSwitchAccount, onRemoveAccount, onAddAccount, onClose }) {
	const active = accounts.find(a => a.id === activeId);
	const row = { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "0 16px", background: "transparent", border: "none", borderTop: `1px solid ${COLORS.border}`, cursor: "pointer", textAlign: "left", fontFamily: FONT_MONO };
	return (
		<BottomSheet title="YOUR RIOT ACCOUNT IDS" onClose={onClose}>
			<div style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
				{accounts.map(a => {
					const isActive = a.id === activeId;
					return (
						<button key={a.id} onClick={() => { onSwitchAccount(a.id); onClose(); }} style={{ ...row, height: 60, borderTop: "none", borderBottom: `1px solid ${COLORS.border}` }}>
							<EsBadge />
							<span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
								<span style={{ fontSize: 13, color: isActive ? COLORS.accent : COLORS.textStrong, fontWeight: isActive ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis" }}>{a.display_name}</span>
								<span style={{ fontSize: 10, color: COLORS.textDim }}>{isActive ? `Active · ${savedMatches.length} ${isGuest ? "matches, not saved" : "saved matches"}` : "Tap to switch"}</span>
							</span>
							{isActive && <span style={{ color: COLORS.accent, fontWeight: 700 }}>✓</span>}
						</button>
					);
				})}
				<button onClick={() => { onAddAccount(); onClose(); }} style={{ ...row, height: 52, borderTop: "none", fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: COLORS.accent }}>+ ADD ANOTHER ACCOUNT</button>
				{active && (
					<button onClick={() => { onRemoveAccount(active.id); onClose(); }} style={{ ...row, height: 52, fontSize: 11, letterSpacing: "0.12em", color: COLORS.loss }}>
						UNLINK {active.display_name}
					</button>
				)}
			</div>
		</BottomSheet>
	);
}

// ── History ──────────────────────────────────────────────────────────────────

function History(p) {
	const { eloHistory, eloVisible, savedStatus, eloHistoryLoading } = p;
	const points = eloHistory?.points ?? [];
	// The newest rated row — sealed events aren't rated.
	const current = points.findLast(m => m.elo_after != null)?.elo_after;
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<div style={{ display: "flex", alignItems: "center", gap: 16, padding: 12, borderBottom: `1px solid ${COLORS.border}` }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<span style={{ ...LABEL, fontSize: 9 }}>ELO</span>
					<span style={{ fontSize: 22, fontWeight: 700, color: COLORS.accent, lineHeight: 1 }}>{current ?? "—"}</span>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
					<span style={{ ...LABEL, fontSize: 9 }}>SEASON</span>
					<span style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.seasonName}</span>
				</div>
				<SearchButton {...p} />
			</div>
			{p.syncError && <Note color={COLORS.loss}>{p.syncError}</Note>}

			{eloHistoryLoading && <Skeleton />}
			{savedStatus === "error" && (
				<div style={{ margin: 12, border: `1px solid ${COLORS.loss}`, background: `color-mix(in srgb, var(--loss) 8%, var(--bg-card))`, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
					<div style={{ fontSize: 12, fontWeight: 700, color: COLORS.loss, letterSpacing: "0.04em" }}>Couldn&rsquo;t load your saved matches.</div>
					<div style={{ fontSize: 12, lineHeight: 1.6, color: COLORS.text }}>Saving is off until they load, so your stored picks can&rsquo;t be overwritten.</div>
					<button onClick={p.onRetry} style={{ alignSelf: "flex-start", ...secondaryButton, height: 44 }}>RETRY</button>
				</div>
			)}
			{!eloHistoryLoading && savedStatus === "ready" && points.length === 0 && (
				<div style={{ margin: 12, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: "36px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
					<div style={LABEL}>{p.isGuest ? "NO MATCHES FOUND" : "NO SAVED MATCHES YET"}</div>
					<div style={{ fontSize: 13, lineHeight: 1.6 }}>{p.isGuest ? `This Riot account ID has no matches in ${p.seasonName}.` : `Nothing saved in ${p.seasonName}. Tap Search to load it for your Riot account ID.`}</div>
					<button onClick={p.onSync} disabled={p.syncing} style={{ ...primaryButton, padding: "0 20px" }}>{p.syncing ? "SEARCHING…" : "SEARCH"}</button>
				</div>
			)}
			{points.length > 0 && <Events {...p} />}
			{points.length > eloVisible && (
				<div style={{ padding: "16px 12px" }}>
					<button onClick={p.onShowMore} style={{
						width: "100%", height: 48, background: "transparent", border: `1px solid ${COLORS.borderHover}`, color: COLORS.textMuted,
						fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.14em", fontWeight: 700, cursor: "pointer",
					}}>LOAD MORE ({points.length - eloVisible})</button>
				</div>
			)}
		</div>
	);
}

const primaryButton = {
	height: 48, background: COLORS.accent, border: `1px solid ${COLORS.accent}`, color: COLORS.bg, cursor: "pointer",
	fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.12em", fontWeight: 700,
};
const secondaryButton = {
	height: 48, padding: "0 16px", background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, color: COLORS.text, cursor: "pointer",
	fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700,
};

function SearchButton({ onSync, syncing, eloHistoryLoading }) {
	return (
		<button onClick={onSync} disabled={syncing || eloHistoryLoading} title="Load the latest matches for your Riot account ID"
			style={{ ...secondaryButton, height: 44, padding: "0 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, opacity: eloHistoryLoading ? 0.5 : 1 }}>
			<SearchIcon />{syncing ? "SEARCHING…" : "SEARCH"}
		</button>
	);
}

function SearchIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" style={{ flexShrink: 0 }}>
			<circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" />
		</svg>
	);
}

// Opens under an "Event not found" header: pasting the event's link links its
// matches, and lets the lookup find that store's other events.
function EventLink({ state, onAdd }) {
	const [link, setLink] = useState("");
	function submit(e) {
		e.preventDefault();
		onAdd(link);
	}
	const off = state.busy || !link.trim();
	return (
		<form onSubmit={submit} style={{ margin: "0 12px 8px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
			<span style={{ fontSize: 12, lineHeight: 1.6, color: COLORS.textMuted }}>
				Paste the link to the event these were played at, from PlayRiftbound, UVS or BoundRift &mdash; other events at the same store are then found too.
			</span>
			<div style={{ display: "flex", gap: 8 }}>
				<input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="Event link" aria-label="Event link"
					onFocus={e => { e.target.style.borderColor = COLORS.accent; }}
					onBlur={e => { e.target.style.borderColor = COLORS.border; }}
					style={{ flex: 1, minWidth: 0, height: 48, padding: "0 12px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: 16, outline: "none" }} />
				<button type="submit" disabled={off} style={{ ...secondaryButton, padding: "0 14px", flexShrink: 0, opacity: off ? 0.5 : 1 }}>
					{state.busy ? "…" : "ADD"}
				</button>
			</div>
			{state.error && <span style={{ fontSize: 12, color: COLORS.loss, lineHeight: 1.5 }}>{state.error}</span>}
		</form>
	);
}

// Placeholder rows in the real row's shape, so nothing jumps when data lands.
function Skeleton() {
	return (
		<div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
			<div style={LABEL}>LOADING SAVED MATCHES…</div>
			{[1, 0.7, 0.45, 0.25].map(o => (
				<div key={o} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: 12, display: "flex", flexDirection: "column", gap: 10, opacity: o }}>
					<div style={{ display: "flex", gap: 10 }}><span style={{ width: 48, height: 22, background: COLORS.bgHover }} /><span style={{ width: "40%", height: 22, background: COLORS.bgRaised }} /></div>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><span style={{ height: 46, background: COLORS.bgRaised }} /><span style={{ height: 46, background: COLORS.bgRaised }} /></div>
				</div>
			))}
		</div>
	);
}

// Visible rows (newest first) grouped into consecutive events — or, while a
// row's event isn't known, its month. Rounds number each match within its
// event from the earliest, across all rows; a month group has no rounds. An
// event that wasn't found gets LINK, which opens the paste-a-link form.
function Events(p) {
	const { eloHistory, eloVisible, eventKeyFor, groupKeyFor, tournamentFor, canLink, linking, onToggleLink, eventLink, onAddEvent } = p;
	const round = new Map();
	const seen = new Map();
	for (const m of eloHistory.points) {
		const key = eventKeyFor(m);
		seen.set(key, (seen.get(key) ?? 0) + 1);
		if (!key.startsWith("match:")) round.set(String(m.match_id), seen.get(key));
	}
	const events = [];
	for (const m of [...eloHistory.points].reverse().slice(0, eloVisible)) {
		const key = groupKeyFor(m);
		if (events.at(-1)?.key !== key) events.push({ key, tournament: tournamentFor(m), when: shortDate(m.date ?? m.month) || m.season, matches: [] });
		events.at(-1).matches.push(m);
	}
	return events.map(ev => {
		const name = ev.tournament === undefined ? "Looking up event…" : ev.tournament ? ev.tournament.name : "Event not found";
		const open = linking === ev.key;
		return (
			<div key={ev.key}>
				<div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "16px 12px 8px" }}>
					{ev.tournament?.url ? (
						<a href={ev.tournament.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, lineHeight: 1.4 }}>{name} ↗</a>
					) : ev.tournament ? (
						<span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textStrong, lineHeight: 1.4 }}>{name}</span>
					) : (
						<span style={{ fontSize: 13, color: COLORS.textDim, fontStyle: "italic", lineHeight: 1.4 }}>{name}</span>
					)}
					<span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
						{canLink && ev.tournament === null && (
							<button onClick={() => onToggleLink(ev.key)} aria-expanded={open} style={{
								height: 44, padding: "0 12px", margin: "-14px 0", background: "transparent", border: "none",
								color: COLORS.accent, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer",
							}}>{open ? "CANCEL" : "LINK"}</button>
						)}
						<span style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{ev.when}</span>
					</span>
				</div>
				{open && <EventLink state={eventLink} onAdd={onAddEvent} />}
				<div style={{ margin: "0 12px", background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}>
					{ev.matches.map((m, i) => (
						<Fragment key={m.match_id}>
							<MatchRow {...p} m={m} first={i === 0} round={round.get(String(m.match_id))} />
							{isUnpairedLegacy(m, p.allPoints) && <SameMatch row={m} candidates={pairCandidates(p.allPoints, m)} onPair={p.onPairRow} />}
						</Fragment>
					))}
				</div>
			</div>
		);
	});
}

// Under a row saved from EloShowdown that didn't pair with a BoundRift row —
// usually an opponent who has since renamed. SAME MATCH AS… opens a sheet of
// the BoundRift matches it could be; picking one pairs them.
function SameMatch({ row, candidates, onPair }) {
	const [open, setOpen] = useState(false);
	return (
		<div style={{ padding: "8px 10px", background: COLORS.bgRaised, borderTop: `1px dashed ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10 }}>
			<span style={{ flex: 1, minWidth: 0, fontSize: 11, lineHeight: 1.5, color: COLORS.textMuted }}>
				Saved from EloShowdown &mdash; not matched to a BoundRift match{candidates.length ? "." : ", and none fits."}
			</span>
			{candidates.length > 0 && (
				<button onClick={() => setOpen(true)} style={{ ...secondaryButton, height: 44, padding: "0 12px", flexShrink: 0, color: COLORS.accent }}>SAME AS…</button>
			)}
			{open && (
				<BottomSheet title="SAME MATCH AS…" subtitle={`vs ${row.opponent_name} · ${shortDate(row.date)} · opponents show their current name`} onClose={() => setOpen(false)}>
					{candidates.map(c => (
						<button key={c.match_id} onClick={() => { onPair(row.match_id, c.match_id); setOpen(false); }} style={{
							width: "100%", height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 16px",
							background: "transparent", border: "none", borderBottom: `1px solid ${COLORS.border}`,
							fontFamily: FONT_MONO, fontSize: 13, color: COLORS.text, cursor: "pointer", textAlign: "left",
						}}>
							<span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
								<span style={{ color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>vs {c.opponent_name}</span>
								{c.event?.name && <span style={{ fontSize: 10, color: COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.event.name}</span>}
							</span>
							{c.score && <span>{c.score}</span>}
							<span style={{ fontSize: 10, color: COLORS.textDim, minWidth: 60, textAlign: "right" }}>{shortDate(c.date ?? c.month) || c.season}</span>
						</button>
					))}
					<div style={{ height: "calc(16px + env(safe-area-inset-bottom))" }} />
				</BottomSheet>
			)}
		</div>
	);
}

// Line 1: result, Elo change, opponent, round. Line 2: your legend, the final
// score and their legend — 48px tall, so they're the tap targets.
function MatchRow({ m, first, round, legends, linkedPlayer, matchChampions, unsaved, onOpenPicker }) {
	const color = RESULT_COLOR[m.result] ?? COLORS.textDim;
	const picks = matchChampions[`${linkedPlayer.id}:${m.match_id}`] || {};
	const legendById = id => legends.find(l => l.id === id);
	const slot = side => ({
		label: side === "mine" ? "YOU" : "OPP",
		legend: legendById(side === "mine" ? picks.mine : picks.opponent),
		unsaved: unsaved.has(`${m.match_id}:${side}`),
		onClick: () => onOpenPicker({ match: m, side, round }),
	});
	return (
		<div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, borderTop: first ? "none" : `1px solid ${COLORS.border}` }}>
			<div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 24 }}>
				<span style={{
					minWidth: 48, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
					background: alpha(color, 14), color, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
				}}>{m.result.toUpperCase()}</span>
				<span style={{ fontSize: 15, fontWeight: 700, color, minWidth: 28 }}>
					{m.elo_change == null ? "—" : m.elo_change === 0 ? "" : `${m.elo_change > 0 ? "+" : ""}${m.elo_change}`}
				</span>
				<span style={{ flex: 1, minWidth: 0, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
					<span style={{ color: COLORS.textDim }}>vs </span><span style={{ color: COLORS.textStrong }}>{m.opponent_name}</span>
				</span>
				{round && <span style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em" }}>R{round}</span>}
			</div>
			<div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: 6 }}>
				<Slot {...slot("mine")} />
				<ScoreSlot score={picks.score} unsaved={unsaved.has(`${m.match_id}:score`)}
					onClick={() => onOpenPicker({ match: m, side: "score", round })} />
				<Slot {...slot("opponent")} />
			</div>
		</div>
	);
}

function Slot({ label, legend, unsaved, onClick }) {
	return (
		<button onClick={onClick} style={{
			height: 48, display: "flex", alignItems: "center", gap: 8, padding: "0 8px", minWidth: 0,
			background: COLORS.bgRaised, border: `1px solid ${unsaved ? COLORS.accentDim : COLORS.border}`,
			fontFamily: FONT_MONO, color: COLORS.text, cursor: "pointer", textAlign: "left",
		}}>
			{legend ? (
				<>
					<LegendIcon legend={legend} size={30} />
					<span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
						<span style={{ fontSize: 8, letterSpacing: "0.14em", color: COLORS.textDim }}>{label}</span>
						<span style={{ fontSize: 12, color: COLORS.textStrong, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{legend.tags_text}</span>
					</span>
					<span style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
						{legend.domains.map(d => <RuneIcons key={d} domains={[d]} size={13} />)}
					</span>
				</>
			) : (
				<>
					<span style={{ width: 30, height: 30, flexShrink: 0, border: `1px dashed ${COLORS.borderHover}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: COLORS.accent }}>+</span>
					<span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
						<span style={{ fontSize: 8, letterSpacing: "0.14em", color: COLORS.textDim }}>{label}</span>
						<span style={{ fontSize: 10, letterSpacing: "0.1em", color: COLORS.accent, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>PICK LEGEND</span>
					</span>
				</>
			)}
		</button>
	);
}

function ScoreSlot({ score, unsaved, onClick }) {
	return (
		<button onClick={onClick} aria-label={score ? `Final score ${score}` : "Set the final score"} style={{
			width: 46, height: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
			background: COLORS.bgRaised, border: `1px ${score || unsaved ? "solid" : "dashed"} ${unsaved ? COLORS.accentDim : score ? COLORS.border : COLORS.borderHover}`,
			fontFamily: FONT_MONO, cursor: "pointer", padding: 0,
		}}>
			<span style={{ fontSize: 8, letterSpacing: "0.14em", color: COLORS.textDim }}>SCORE</span>
			{score
				? <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textStrong }}>{score}</span>
				: <span style={{ fontSize: 14, color: COLORS.accent, lineHeight: 1 }}>+</span>}
		</button>
	);
}

// Bottom-sheet score picker: the scores that fit the result, best of 3 then
// best of 1, and clear when one is set.
function ScoreSheet({ picker, linkedPlayer, matchChampions, onScore, onClose }) {
	const { match, round } = picker;
	const current = (matchChampions[`${linkedPlayer.id}:${match.match_id}`] || {}).score;
	const pick = score => { onScore(match, score); onClose(); };
	return (
		<BottomSheet onClose={onClose} title={`FINAL SCORE · ${match.result.toUpperCase()}`}
			subtitle={[round && `R${round}`, `vs ${match.opponent_name}`, shortDate(match.date ?? match.month)].filter(Boolean).join(" · ")}>
			<div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
				{scoreOptions(match.result).map(score => {
					const selected = score === current;
					return (
						<button key={score} onClick={() => pick(score)} style={{
							height: 64, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
							background: selected ? alpha(COLORS.accent, 14) : COLORS.bgRaised,
							border: `1px solid ${selected ? COLORS.accent : COLORS.border}`, fontFamily: FONT_MONO, cursor: "pointer",
						}}>
							<span style={{ fontSize: 20, fontWeight: 700, color: selected ? COLORS.accent : COLORS.textStrong }}>{score}</span>
							<span style={{ fontSize: 9, letterSpacing: "0.14em", color: COLORS.textDim }}>BEST OF {bestOf(score)}</span>
						</button>
					);
				})}
			</div>
			{current && (
				<button onClick={() => pick(null)} style={{
					width: "100%", height: 48, display: "flex", alignItems: "center", gap: 12, padding: "0 16px",
					background: "transparent", border: "none", borderTop: `1px solid ${COLORS.border}`,
					color: COLORS.loss, fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.08em", cursor: "pointer", textAlign: "left",
				}}>
					<span style={{ width: 20, textAlign: "center" }}>✕</span>CLEAR SCORE
				</button>
			)}
			<div style={{ height: "calc(16px + env(safe-area-inset-bottom))" }} />
		</BottomSheet>
	);
}

// Bottom-sheet legend picker. Your side offers "apply to all N matches in this
// event" (on by default); either side can clear a pick.
function LegendSheet({ picker, legends, linkedPlayer, matchChampions, eloHistory, eventKeyFor, fillEvent, setFillEvent, onPick, onClose }) {
	const [query, setQuery] = useState("");
	const { match, side, round } = picker;
	const current = (matchChampions[`${linkedPlayer.id}:${match.match_id}`] || {})[side === "mine" ? "mine" : "opponent"];
	const eventCount = eloHistory.points.filter(p => eventKeyFor(p) === eventKeyFor(match)).length;
	const term = query.trim().toLowerCase();
	const list = legends.filter(l => l.tags_text.toLowerCase().includes(term) || l.name.toLowerCase().includes(term));
	const pick = id => { onPick(match, side, id); onClose(); };
	const row = { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "0 16px", background: "transparent", border: "none", borderBottom: `1px solid ${COLORS.border}`, fontFamily: FONT_MONO, cursor: "pointer", textAlign: "left" };

	return (
		<BottomSheet height="80%" onClose={onClose}
			title={side === "mine" ? "YOUR LEGEND" : "OPPONENT LEGEND"}
			subtitle={[round && `R${round}`, `vs ${match.opponent_name}`, shortDate(match.date ?? match.month)].filter(Boolean).join(" · ")}>
			<div style={{ position: "sticky", top: 0, zIndex: 1, background: COLORS.bgCard }}>
				<div style={{ padding: "8px 16px" }}>
					<div style={{ height: 48, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", background: COLORS.bgRaised, border: `1px solid ${COLORS.accent}`, color: COLORS.textDim }}>
						<SearchIcon />
						<input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search legends"
							onKeyDown={e => { if (e.key === "Enter" && list.length) pick(list[0].id); }}
							style={{ flex: 1, minWidth: 0, height: "100%", background: "transparent", border: "none", outline: "none", color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: 16, caretColor: COLORS.accent }} />
					</div>
				</div>
				{side === "mine" && eventCount > 1 && (
					<button onClick={() => setFillEvent(f => !f)} role="checkbox" aria-checked={fillEvent}
						style={{ ...row, height: 48, borderBottom: "none", borderTop: `1px solid ${COLORS.border}`, color: COLORS.text, fontSize: 12 }}>
						<span style={{
							width: 20, height: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
							border: `1px solid ${fillEvent ? COLORS.accent : COLORS.borderHover}`, background: fillEvent ? COLORS.accent : "transparent",
							color: COLORS.bg, fontSize: 12, fontWeight: 900,
						}}>{fillEvent ? "✓" : ""}</span>
						Apply to all {eventCount} matches in this event
					</button>
				)}
				{current && (
					<button onClick={() => pick(null)} style={{ ...row, height: 48, borderBottom: "none", borderTop: `1px solid ${COLORS.border}`, color: COLORS.loss, fontSize: 12, letterSpacing: "0.08em" }}>
						<span style={{ width: 20, textAlign: "center" }}>✕</span>CLEAR PICK
					</button>
				)}
				<div style={{ height: 1, background: COLORS.border }} />
			</div>
			{list.map(l => (
				<button key={l.id} onClick={() => pick(l.id)} style={{ ...row, height: 52, background: l.id === current ? COLORS.bgHover : "transparent" }}>
					<LegendIcon legend={l} size={32} />
					<span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
						<span style={{ color: l.id === current ? COLORS.accent : COLORS.textStrong, fontWeight: 700 }}>{l.tags_text}</span>
						<span style={{ color: COLORS.textMuted }}> - {titleCase(l.name)}</span>
					</span>
					{l.id === current && <span style={{ color: COLORS.accent, fontSize: 14, fontWeight: 700 }}>✓</span>}
				</button>
			))}
			{list.length === 0 && (
				<div style={{ padding: "32px 16px", textAlign: "center", fontSize: 11, letterSpacing: "0.12em", color: COLORS.textDim }}>NO LEGEND MATCHES &ldquo;{query.toUpperCase()}&rdquo;</div>
			)}
			<div style={{ height: "calc(16px + env(safe-area-inset-bottom))" }} />
		</BottomSheet>
	);
}

// Docks at the bottom while picks are unsaved — or, when the saved history
// failed to load, explains why saving is off. A guest's button logs in instead.
function SaveBar({ count, off, saving, onSave, guest }) {
	const disabled = off || saving;
	return (
		<div style={{
			position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
			background: COLORS.bgAlt, borderTop: `1px solid ${COLORS.borderHover}`, boxShadow: `0 -8px 24px ${COLORS.shadow}`,
			padding: "10px 12px calc(10px + env(safe-area-inset-bottom))", display: "flex", alignItems: "center", gap: 12, fontFamily: FONT_MONO,
		}}>
			<div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
				<span style={{ fontSize: 10, letterSpacing: "0.14em", fontWeight: 700, color: off ? COLORS.loss : COLORS.accent }}>
					{off ? "SAVING OFF" : `${count} UNSAVED PICK${count === 1 ? "" : "S"}`}
				</span>
				<span style={{ fontSize: 10, color: COLORS.textDim }}>{off ? "History didn’t load" : guest ? "Lost when this tab closes" : "Not stored yet"}</span>
			</div>
			<button onClick={onSave} disabled={disabled} style={{
				...primaryButton, flex: 1, fontSize: 11, whiteSpace: "nowrap", cursor: disabled ? "not-allowed" : "pointer",
				background: disabled ? COLORS.bgHover : COLORS.accent, borderColor: disabled ? COLORS.bgHover : COLORS.accent, color: disabled ? COLORS.textDim : COLORS.bg,
			}}>{saving ? "SAVING…" : guest ? "LOG IN TO SAVE" : "SAVE MATCH HISTORY"}</button>
		</div>
	);
}

function Toast({ ok, onClose }) {
	const color = ok ? COLORS.win : COLORS.loss;
	return (
		<div role="status" style={{
			position: "fixed", left: 12, right: 12, top: `calc(${LAYOUT.navHeight} + 8px)`, zIndex: 45,
			background: COLORS.bgCard, border: `1px solid ${color}`, boxShadow: `0 8px 24px ${COLORS.shadow}`,
			padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10, fontFamily: FONT_MONO,
		}}>
			<span style={{ fontSize: 13, fontWeight: 700, color }}>{ok ? "✓" : "!"}</span>
			<div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
				<span style={{ fontSize: 12, fontWeight: 700, color: COLORS.textStrong }}>{ok ? "Match history saved" : "Save failed"}</span>
				<span style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5 }}>
					{ok ? "Your legend picks are stored and stats are updated." : "Your picks are still here. Check your connection and try again."}
				</span>
			</div>
			<button onClick={onClose} aria-label="Dismiss" style={{ width: 28, height: 28, background: "transparent", border: "none", color: COLORS.textDim, fontSize: 14, cursor: "pointer", fontFamily: FONT_MONO }}>✕</button>
		</div>
	);
}

function Note({ children, color }) {
	return <div style={{ padding: "10px 12px 0", fontSize: 11, letterSpacing: "0.06em", color: color ?? COLORS.textDim }}>{children}</div>;
}

