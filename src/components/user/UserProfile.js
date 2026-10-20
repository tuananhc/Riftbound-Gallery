"use client";
import { Fragment, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { COLORS, FONT_MONO, alpha } from "../../lib/data";
import { legendLabel } from "../../lib/cards/data";
import RuneIcons from "../cards/RuneIcons";
import MatchStats from "./MatchStats";
import MobileProfile from "./MobileProfile";
import Dropdown from "../Dropdown";
import { useIsMobile } from "../../hooks/useIsMobile";
import { StatSummary, StatTiles } from "./ProfileStats";
import { latestSeason, summarize, seasonOfMatch, seasonsOf, seasonLabel, scoreOptions, bestOf } from "../../lib/matchStats";
import { countryFlag } from "../../lib/countries";
import { useAuth } from "../../hooks/useAuth";
import { saveMatchHistory, getMatchHistory, getEloHistory, getSeasons, getPlayerTournaments, getProfile, addEloAccount, selectEloAccount, removeEloAccount } from "../../lib/api";
import { readGuestDraft, writeGuestDraft, clearGuestDraft } from "../../lib/guestDraft";
import GuestNotice, { GUEST_SAVE_HINT } from "./GuestNotice";

// ── Dummy data ─────────────────────────────────────────────────────────────────

const RANK_COLORS = {
	"Bronze": { color: COLORS.textMuted, glow: "color-mix(in srgb, var(--text-muted) 20%, transparent)", icon: "🥉" },
	"Silver": { color: "#bebebe", glow: "#bebebe33", icon: "🥈" },
	"Gold": { color: "#bdb76b", glow: "#bdb76b33", icon: "🥇" },
	"Platinum": { color: "#8fa3bf", glow: "#8fa3bf33", icon: "💎" },
	"Diamond": { color: "#a09bbf", glow: "#a09bbf33", icon: "🔷" },
	"Master": { color: "#b08968", glow: "#b0896833", icon: "👑" },
};

const USER = {
	username: "ShadowRift",
	avatar: "🧙",
	title: "Keeper of the Seventh Seal",
	rank: "Platinum",
	joinDate: "March 2024",
	stats: { wins: 142, losses: 58, draws: 7, winStreak: 6 },
};

// Shown in the profile header while signed out.
const GUEST = { username: "Guest", avatar: "👤", title: "Not signed in — nothing on this page is saved", rank: "Guest" };
const GUEST_RANK = { color: COLORS.textMuted, glow: COLORS.bgRaised, icon: "" };

// How many match-history rows to reveal per "Load More" click.
const ELO_PAGE_SIZE = 10;

// ── Match history data ────────────────────────────────────────────────────────
// The rows render EloShowdown's elo-history shape — { season_slug, points } with
// points oldest first — whether it came from our MatchHistory table or from a
// fresh EloShowdown search.

const byPlayed = (a, b) => (a.date ?? "").localeCompare(b.date ?? "") || Number(a.match_id) - Number(b.match_id);

// Saved MatchHistory items → { history, picks }, picks keyed "playerId:matchId".
function fromSaved(playerId, items) {
	const points = items.map(m => ({
		match_id: m.matchId,
		date: m.playedAt,
		result: m.result.toLowerCase(),
		opponent_name: m.opponent,
		opponent_id: m.opponentId,
		elo_before: m.eloBefore,
		elo_change: m.eloChange,
		elo_after: m.eloAfter,
		season: m.season,
	})).sort(byPlayed);
	const picks = Object.fromEntries(items
		.filter(m => m.myChampion || m.opponentChampion || m.score)
		.map(m => [`${playerId}:${m.matchId}`, { mine: m.myChampion, opponent: m.opponentChampion, score: m.score }]));
	return { history: { season_slug: points.at(-1)?.season ?? null, points }, picks };
}

// Overlay a fresh EloShowdown elo-history on the saved one: EloShowdown's data
// wins for matches in both, and saved matches it no longer returns (e.g. from an
// earlier season) are kept.
function mergeHistory(saved, fresh) {
	const byId = new Map((saved?.points ?? []).map(p => [String(p.match_id), p]));
	for (const p of fresh.points ?? []) {
		const id = String(p.match_id);
		byId.set(id, { ...byId.get(id), ...p, season: fresh.season_slug });
	}
	const points = [...byId.values()].sort(byPlayed);
	return { season_slug: points.at(-1)?.season ?? fresh.season_slug, points };
}

// The season both tabs show: the one picked beside the tabs ("all" = every
// season), else EloShowdown's current season, else the newest saved one.
function pickSeason(choice, seasons, matches) {
	if (choice === "all") return null;
	return choice ?? seasons.find(s => s.is_current)?.slug ?? seasonsOf(matches)[0] ?? null;
}

// An elo-history narrowed to one season's points (unchanged when slug is null).
function historyForSeason(history, slug, seasons) {
	if (!history || !slug) return history;
	return { ...history, season_slug: slug, points: history.points.filter(p => seasonOfMatch(p, seasons) === slug) };
}

// Saved rows with a guest draft for the same account laid over them: the
// draft's matches merged in and its picks winning, since they're the newer work.
function withDraft(playerId, items, draft) {
	const { history, picks } = fromSaved(playerId, items);
	if (draft?.activeId !== playerId || !draft.history) return { history, picks };
	return { history: mergeHistory(history, draft.history), picks: { ...picks, ...draft.picks } };
}

// One page row as Save sends it. Picks go as null when the row has none, which
// clears any stored pick — as does a score that no longer fits the result.
function toPayload(m, picks = {}, eventName, season) {
	return {
		matchId: m.match_id,
		result: m.result,
		score: scoreOptions(m.result).includes(picks.score) ? picks.score : null,
		playedAt: m.date,
		opponent: m.opponent_name,
		opponentId: m.opponent_id,
		myChampion: picks.mine ?? null,
		opponentChampion: picks.opponent ?? null,
		eventName,
		eloBefore: m.elo_before,
		eloChange: m.elo_change,
		eloAfter: m.elo_after,
		season: m.season ?? season ?? undefined,
	};
}

// A sent row as the Lambda stores it, minus the empty fields it never keeps —
// the shape the record boxes and the Data tab read.
function asStored(m) {
	return Object.fromEntries(Object.entries({
		...m,
		matchId: String(m.matchId),
		result: String(m.result).toUpperCase(),
		opponentId: m.opponentId == null ? undefined : String(m.opponentId),
	}).filter(([, v]) => v != null && v !== ""));
}

// ── Component ──────────────────────────────────────────────────────────────────

// `legends` are fetched server-side in app/page.js — the pickers must work
// without the Cards page having been visited.
export default function UserProfile({ legends = [] }) {
	const router = useRouter();
	const { status, token } = useAuth();
	// Signed out: the page still works, but nothing reaches the backend — the
	// work lives in this tab's guest draft (lib/guestDraft.js) until they log in.
	const isGuest = status === "guest";

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
	// Account whose history was requested last — older responses are dropped.
	const historyRequest = useRef(null);
	const [eloHistory, setEloHistory] = useState(null);
	const [eloHistoryLoading, setEloHistoryLoading] = useState(false);
	// Saved history for the active account: "loading" | "ready" | "error". Saving
	// is blocked unless "ready" — an empty pick on the page clears the stored one,
	// so saving without the stored picks loaded would wipe them.
	const [savedStatus, setSavedStatus] = useState("loading");
	// The active account's MatchHistory items as stored — the record boxes count these.
	const [savedMatches, setSavedMatches] = useState([]);
	// True while the Search button is pulling the latest matches from EloShowdown.
	const [syncing, setSyncing] = useState(false);
	const [syncError, setSyncError] = useState(null);
	const [eloVisible, setEloVisible] = useState(ELO_PAGE_SIZE);
	// Per-match picks — both legends and the final score:
	// { ["playerId:matchId"]: { mine, opponent, score } }.
	const [matchChampions, setMatchChampions] = useState({});
	const [saving, setSaving] = useState(false);
	// "Apply to all matches in this event" in your legend picker — on by default,
	// since a player almost always runs one legend for a whole event.
	const [fillEvent, setFillEvent] = useState(true);
	// User card: collapsed shows a one-line record, expanded the full stat tiles.
	const [statsOpen, setStatsOpen] = useState(false);
	// Match section tab: "data" (analysis) or "history" (the editable rows).
	const [matchTab, setMatchTab] = useState("data");
	const [saveMsg, setSaveMsg] = useState(null);
	const dismissSave = useCallback(() => setSaveMsg(null), []);
	// Signed in with guest work from this tab, loaded onto the page but not yet saved.
	const [carriedOver, setCarriedOver] = useState(false);
	// Phones get MobileProfile: same state and handlers, laid out for a small screen.
	const isMobile = useIsMobile();
	// Season shown on both tabs, picked beside them; null until picked (current season).
	const [seasonChoice, setSeasonChoice] = useState(null);
	// EloShowdown's seasons: the selector's options, and the dates that place
	// rows saved without a season. If they can't load, the saved rows' own
	// seasons fill the selector instead.
	const [seasons, setSeasons] = useState([]);
	useEffect(() => {
		getSeasons().then(setSeasons).catch(() => {});
	}, []);
	// UVS tournament per match date, keyed "playerId:date" → null | { id, name, url }.
	// A key that's missing is still being looked up.
	const [tournaments, setTournaments] = useState({});
	const requestedTournaments = useRef(new Set());

	// Look up the tournament for each visible row's date, once per player + date.
	useEffect(() => {
		const playerId = linkedPlayer?.id;
		const shown = historyForSeason(eloHistory, pickSeason(seasonChoice, seasons, savedMatches), seasons);
		if (!playerId || !shown?.points?.length) return;
		const visibleDates = [...shown.points].reverse().slice(0, eloVisible).map(m => m.date);
		const missing = [...new Set(visibleDates)].filter(d => !requestedTournaments.current.has(`${playerId}:${d}`));
		if (missing.length === 0) return;
		missing.forEach(d => requestedTournaments.current.add(`${playerId}:${d}`));
		const keyed = value => Object.fromEntries(missing.map(d => [`${playerId}:${d}`, value(d)]));
		getPlayerTournaments(playerId, missing)
			.then(found => setTournaments(prev => ({ ...prev, ...keyed(d => found[d] ?? null) })))
			.catch(() => setTournaments(prev => ({ ...prev, ...keyed(() => null) })));
	}, [linkedPlayer, eloHistory, eloVisible, seasonChoice, seasons, savedMatches]);

	// Restore the EloShowdown accounts saved on the user's profile, so they don't
	// have to search for themselves on every visit, and show the active account's
	// saved history from the MatchHistory table. EloShowdown is only queried when
	// the user clicks Search.
	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		// Work done as a guest earlier in this tab (they logged in to save it).
		const draft = readGuestDraft();
		const draftAccount = draft?.accounts.find(a => a.id === draft.activeId);
		(async () => {
			// No backend / no row yet — fall back to the search box.
			let profile = await getProfile(token).catch(() => null);
			// Link the guest's account (which makes it active), so its work can be saved.
			if (draftAccount) {
				profile = await addEloAccount(token, draftAccount).catch(() => ({
					eloPlayers: [...(profile?.eloPlayers ?? []).filter(a => a.id !== draftAccount.id), draftAccount],
					activeEloPlayerId: draftAccount.id,
				}));
			}
			if (cancelled) return;
			setProfileStatus("ready");
			const linked = profile?.eloPlayers ?? [];
			const active = linked.find(p => p.id === profile?.activeEloPlayerId) ?? linked[0];
			setAccounts(linked);
			if (!active) return;
			setActiveId(active.id);
			historyRequest.current = active.id;
			setEloHistoryLoading(true);
			setSavedStatus("loading");
			try {
				const items = await getMatchHistory(token, active.id);
				if (cancelled || historyRequest.current !== active.id) return;
				const { history, picks } = withDraft(active.id, items, draft);
				setEloHistory(history);
				setSavedMatches(items);
				setMatchChampions(prev => ({ ...prev, ...picks }));
				setSavedStatus("ready");
				if (draftAccount?.id === active.id) {
					setCarriedOver(true);
					setMatchTab("history");
				}
			} catch {
				if (!cancelled && historyRequest.current === active.id) setSavedStatus("error");
			} finally {
				if (!cancelled && historyRequest.current === active.id) setEloHistoryLoading(false);
			}
		})();
		return () => { cancelled = true; };
	}, [token]);

	// Guests: pick up this tab's draft, so their work survives moving between
	// pages. Nothing is stored for them, so the save checks start out "ready".
	// A one-time read of sessionStorage, which doesn't exist during SSR — the
	// synchronous setState is intentional, as in useAuth.
	useEffect(() => {
		if (status !== "guest") return;
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setSavedStatus("ready");
		setProfileStatus("ready");
		const draft = readGuestDraft();
		if (!draft) return;
		setAccounts(draft.accounts);
		setActiveId(draft.activeId);
		historyRequest.current = draft.activeId;
		setEloHistory(draft.history);
		setMatchChampions(draft.picks ?? {});
	}, [status]);

	// ...and keep the draft up to date as they work.
	useEffect(() => {
		if (status !== "guest" || profileStatus !== "ready") return;
		writeGuestDraft({ accounts, activeId, history: eloHistory, picks: matchChampions });
	}, [status, profileStatus, accounts, activeId, eloHistory, matchChampions]);

	// A guest with legend picks gets the browser's "leave site?" prompt on
	// closing or reloading the tab — closing it is when their work is lost.
	const guestHasPicks = isGuest && Object.values(matchChampions).some(p => p.mine || p.opponent || p.score);
	useEffect(() => {
		if (!guestHasPicks) return;
		const warn = e => { e.preventDefault(); e.returnValue = ""; };
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [guestHasPicks]);

	// Session still resolving — render nothing.
	if (status === "loading") return null;

	// UVS tournament a match was played in, looked up by its date.
	const tournamentFor = m => tournaments[`${linkedPlayer?.id}:${m.date}`];
	// Matches in the same event share a key: the resolved tournament, or the day
	// while it's still being looked up.
	const eventKeyFor = m => tournamentFor(m)?.id ?? `${tournamentFor(m)}-${m.date?.slice(0, 10)}`;

	// Set (or clear, with null) one side's legend. Your own pick goes to every
	// match in the same event while "apply to all" is ticked.
	function setChampion(match, side, championId) {
		const targets = side === "mine" && fillEvent
			? eloHistory.points.filter(p => eventKeyFor(p) === eventKeyFor(match))
			: [match];
		setMatchChampions(prev => {
			const next = { ...prev };
			for (const p of targets) {
				const key = `${linkedPlayer.id}:${p.match_id}`;
				next[key] = { ...prev[key], [side]: championId };
			}
			return next;
		});
	}

	// Set (or clear, with null) a match's final game score.
	function setScore(match, score) {
		const key = `${linkedPlayer.id}:${match.match_id}`;
		setMatchChampions(prev => ({ ...prev, [key]: { ...prev[key], score } }));
	}

	// Every row on the page (with its picks), as Save sends it.
	function pageMatches() {
		if (!linkedPlayer || !eloHistory) return [];
		return eloHistory.points.map(m => toPayload(m,
			matchChampions[`${linkedPlayer.id}:${m.match_id}`],
			tournaments[`${linkedPlayer.id}:${m.date}`]?.name,
			eloHistory.season_slug));
	}

	// Send every row on the page to DynamoDB. The Lambda derives the userId from
	// the JWT and keys each match by account + matchId; null picks clear stored
	// ones, so the saved rows always end up matching the page. Guests have
	// nowhere to save — they're sent to log in, and their draft goes with them.
	async function handleSaveHistory() {
		if (isGuest) { router.push("/login"); return; }
		if (!linkedPlayer || !eloHistory?.points?.length || savedStatus !== "ready") return;
		setSaving(true);
		setSaveMsg(null);
		const matches = pageMatches();
		try {
			await saveMatchHistory(token, linkedPlayer.id, matches);
			// The stored items now match what was sent.
			setSavedMatches(matches.map(asStored));
			setSaveMsg({ ok: true, text: `Saved ${matches.length} matches to your history.` });
			// Guest work carried over by logging in is stored now.
			clearGuestDraft();
			setCarriedOver(false);
		} catch (err) {
			setSaveMsg({ ok: false, text: `Could not save (${err.message}) — make sure the backend is deployed and you're signed in.` });
		} finally {
			setSaving(false);
		}
	}

	function applyAccounts(res) {
		setAccounts(res.eloPlayers ?? []);
		setActiveId(res.activeEloPlayerId ?? null);
	}

	// Show an account's saved history, resetting per-account view state.
	function showAccount(id) {
		setActiveId(id);
		setSaveMsg(null);
		setSyncError(null);
		if (id && isGuest) loadGuestHistory(id);
		else if (id) loadSavedHistory(id);
		else { historyRequest.current = null; setEloHistory(null); setSavedMatches([]); setEloHistoryLoading(false); }
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
		if (isGuest) return;
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
		if (isGuest) return;
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
		if (isGuest) return;
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

	// Load an account's rows (and legend picks) from the MatchHistory table.
	async function loadSavedHistory(playerId) {
		historyRequest.current = playerId;
		setEloHistory(null);
		setEloHistoryLoading(true);
		setEloVisible(ELO_PAGE_SIZE);
		setSavedStatus("loading");
		setSavedMatches([]);
		try {
			const items = await getMatchHistory(token, playerId);
			// A newer account switch happened while this was in flight — drop it.
			if (historyRequest.current !== playerId) return;
			const { history, picks } = fromSaved(playerId, items);
			setEloHistory(history);
			setSavedMatches(items);
			setMatchChampions(prev => ({ ...prev, ...picks }));
			setSavedStatus("ready");
		} catch {
			if (historyRequest.current === playerId) setSavedStatus("error");
		} finally {
			if (historyRequest.current === playerId) setEloHistoryLoading(false);
		}
	}

	// A guest has nothing saved, so an account's rows come straight from
	// EloShowdown. Picks already made for it stay — they're keyed by account.
	// savedStatus only tracks the fetch here: there's no stored history to fail.
	async function loadGuestHistory(playerId) {
		historyRequest.current = playerId;
		setEloHistory(null);
		setEloHistoryLoading(true);
		setEloVisible(ELO_PAGE_SIZE);
		setSavedStatus("loading");
		setSavedMatches([]);
		try {
			const fresh = await getEloHistory(playerId);
			if (historyRequest.current === playerId) setEloHistory(mergeHistory(null, fresh));
		} catch {
			if (historyRequest.current === playerId) setSyncError("Could not reach EloShowdown. Please try again.");
		} finally {
			if (historyRequest.current === playerId) { setEloHistoryLoading(false); setSavedStatus("ready"); }
		}
	}

	// Search button: pull the latest matches from EloShowdown and merge them into
	// the rows. Picks are untouched, so nothing already chosen is lost.
	async function handleSync() {
		if (linkedPlayer) syncSeason(linkedPlayer.id, pickSeason(seasonChoice, seasons, savedMatches));
	}

	// Pull one season's matches from EloShowdown (null = the current season) and
	// merge them into the rows.
	async function syncSeason(playerId, slug) {
		if (syncing) return;
		setSyncing(true);
		setSyncError(null);
		setSaveMsg(null);
		try {
			const fresh = await getEloHistory(playerId, slug);
			if (historyRequest.current !== playerId) return;
			setEloHistory(prev => mergeHistory(prev, fresh));
		} catch {
			if (historyRequest.current === playerId) setSyncError("Could not reach EloShowdown. Please try again.");
		} finally {
			setSyncing(false);
		}
	}

	// Switching season. A guest has nothing saved, so that season's rows come
	// from EloShowdown straight away; signed-in users see what's saved and press
	// Search to pull the season.
	function changeSeason(slug) {
		setSeasonChoice(slug);
		setEloVisible(ELO_PAGE_SIZE);
		if (isGuest && linkedPlayer && slug !== "all") syncSeason(linkedPlayer.id, slug);
	}

	const showSearch = profileStatus === "ready" && (!linkedPlayer || addingAccount);

	// What the record boxes and Data tab count: the active account's saved
	// matches — or, for a guest, who has none, the rows on the page.
	const statMatches = isGuest ? pageMatches().map(asStored) : savedMatches;
	// User card numbers: the latest season of those. Shown as "—" until they've
	// loaded (or with no account linked).
	const statsReady = Boolean(linkedPlayer) && savedStatus === "ready";
	const cardSeason = latestSeason(statMatches);
	// The tabs' season, its label and options, and the rows narrowed to it.
	const season = pickSeason(seasonChoice, seasons, statMatches);
	const seasonList = seasons.length ? seasons : seasonsOf(statMatches).map(slug => ({ slug, name: seasonLabel(slug) }));
	const seasonName = seasonList.find(s => s.slug === season)?.name ?? (season ? seasonLabel(season) : "All seasons");
	const seasonOptions = [...seasonList.map(s => [s.slug, s.name]), ["all", "All seasons"]];
	const shownHistory = historyForSeason(eloHistory, season, seasons);
	const cardStats = summarize(cardSeason.matches);
	const user = isGuest ? GUEST : USER;
	const rank = isGuest ? GUEST_RANK : RANK_COLORS[USER.rank] || { color: COLORS.accent, glow: "color-mix(in srgb, var(--accent) 27%, transparent)", icon: "⭐" };

	// Picks that differ from what's stored, keyed "matchId:mine" /
	// "matchId:opponent" / "matchId:score" — the phone save bar counts these and
	// outlines their slots.
	const unsaved = new Set();
	if (linkedPlayer && eloHistory) {
		const stored = new Map(savedMatches.map(m => [String(m.matchId), m]));
		for (const m of eloHistory.points) {
			const picks = matchChampions[`${linkedPlayer.id}:${m.match_id}`] || {};
			const saved = stored.get(String(m.match_id));
			if ((picks.mine ?? null) !== (saved?.myChampion ?? null)) unsaved.add(`${m.match_id}:mine`);
			if ((picks.opponent ?? null) !== (saved?.opponentChampion ?? null)) unsaved.add(`${m.match_id}:opponent`);
			if ((picks.score ?? null) !== (saved?.score ?? null)) unsaved.add(`${m.match_id}:score`);
		}
	}

	if (isMobile) {
		return (
			<MobileProfile
				legends={legends} user={user} rank={rank} isGuest={isGuest} carriedOver={carriedOver}
				linkedPlayer={linkedPlayer} accounts={accounts} activeId={activeId}
				profileStatus={profileStatus} linkError={linkError} showSearch={showSearch} addingAccount={addingAccount}
				eloQuery={eloQuery} setEloQuery={setEloQuery} eloResults={eloResults} eloLoading={eloLoading} eloError={eloError}
				onSearch={handleEloSearch} onPickPlayer={selectPlayer}
				onCancelAdd={() => { setAddingAccount(false); setEloResults([]); setEloQuery(""); setEloError(null); }}
				onAddAccount={() => { setAddingAccount(true); setEloResults([]); setEloError(null); }}
				onSwitchAccount={switchAccount} onRemoveAccount={removeAccount}
				cardStats={cardStats} cardSeason={cardSeason} statsReady={statsReady} statsOpen={statsOpen} setStatsOpen={setStatsOpen}
				matchTab={matchTab} setMatchTab={setMatchTab}
				savedMatches={statMatches} savedStatus={savedStatus} eloHistory={shownHistory} eloHistoryLoading={eloHistoryLoading}
				season={season} seasonName={seasonName} seasons={seasons} seasonOptions={seasonOptions} onSeasonChange={changeSeason}
				syncing={syncing} syncError={syncError} onSync={handleSync} onRetry={() => loadSavedHistory(linkedPlayer.id)}
				eloVisible={eloVisible} onShowMore={() => setEloVisible(v => v + ELO_PAGE_SIZE)}
				matchChampions={matchChampions} onPick={setChampion} onScore={setScore} eventKeyFor={eventKeyFor} tournamentFor={tournamentFor}
				fillEvent={fillEvent} setFillEvent={setFillEvent}
				unsaved={unsaved} saving={saving} onSave={handleSaveHistory} saveMsg={saveMsg} onDismissSave={dismissSave}
			/>
		);
	}

	return (
		<div style={{ width: "100%", padding: "10px 12px", boxSizing: "border-box" }}>

			{/* ── Profile Header ── */}
			<div style={{
				background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card) 50%, var(--bg-card) 100%)",
				border: `1px solid ${COLORS.border}`,
				borderRadius: 0, padding: "10px 14px", marginBottom: 10,
				position: "relative", zIndex: 70,
			}}>
				{/* bg decoration — clipped on its own layer so the profile dropdown can overflow the card */}
				<div style={{ position: "absolute", inset: 0, borderRadius: 0, overflow: "hidden", pointerEvents: "none" }}>
					<div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in srgb, var(--bg-hover) 27%, transparent) 0%, transparent 70%)" }} />
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
				{/* Avatar */}
				<div style={{
					width: 40, height: 40, borderRadius: 0, flexShrink: 0,
					background: "linear-gradient(135deg, var(--bg-hover), var(--bg-alt))",
					border: "2px solid var(--border)",
					display: "flex", alignItems: "center", justifyContent: "center",
					fontSize: 20, boxShadow: "0 0 12px var(--shadow)",
				}}>{user.avatar}</div>

				{/* Info */}
				<div style={{ flex: 1 }}>
					<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
						<h1 style={{ fontSize: 15, fontWeight: 900, color: COLORS.accent, letterSpacing: "0.08em", fontFamily: FONT_MONO }}>
							{user.username}
						</h1>
						<span style={{
							background: rank.glow, border: `1px solid ${alpha(rank.color, 27)}`,
							borderRadius: 0, padding: "0 6px",
							fontSize: 10, color: rank.color, fontFamily: FONT_MONO, letterSpacing: "0.1em",
						}}>{rank.icon} {user.rank}</span>
						{linkedPlayer && (
							<ProfileSwitcher accounts={accounts} activeId={activeId}
								onSelect={switchAccount}
								onRemove={removeAccount}
								onAdd={() => { setAddingAccount(true); setEloResults([]); setEloError(null); }} />
						)}
					</div>
					<div style={{ fontSize: 11, color: COLORS.textMuted, fontStyle: "italic", marginBottom: 2, fontFamily: FONT_MONO }}>
						{user.title}
					</div>
					{!isGuest && (
						<div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.08em" }}>
							MEMBER SINCE {USER.joinDate.toUpperCase()}
						</div>
					)}
				</div>

				{/* Stats: one line here; click to expand the card to the full tiles */}
				<StatSummary stats={cardStats} ready={statsReady} open={statsOpen} onToggle={() => setStatsOpen(o => !o)} />
				</div>
				{statsOpen && <StatTiles stats={cardStats} season={cardSeason.season} ready={statsReady} />}
			</div>

			{isGuest && <GuestNotice />}
			{carriedOver && <GuestNotice carried onSave={handleSaveHistory} saving={saving} />}

			{/* ── EloShowdown Search ── */}
			<div style={{
				background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
				borderRadius: 0, padding: "8px 12px", marginBottom: 10,
			}}>
				{profileStatus === "loading" && (
					<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.1em", padding: "4px 0" }}>
						LOADING PROFILE…
					</div>
				)}

				{linkError && (
					<div style={{ marginBottom: 6, fontSize: 11, color: COLORS.loss, fontFamily: FONT_MONO }}>{linkError}</div>
				)}

				{showSearch && (<>
				<div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
					<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.18em", fontFamily: FONT_MONO }}>
						{addingAccount ? "Link another EloShowdown account" : "Find your latest match history with Riot ID"}
					</div>
					{addingAccount && (
						<button onClick={() => { setAddingAccount(false); setEloResults([]); setEloQuery(""); setEloError(null); }}
							style={{ marginLeft: "auto", background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 10, letterSpacing: "0.12em", fontFamily: FONT_MONO }}>
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
						onFocus={e => { e.target.style.borderColor = COLORS.accentDim; }}
						onBlur={e => { e.target.style.borderColor = COLORS.border; }}
						style={{
							background: COLORS.bgCard, border: "1px solid var(--border)", borderRadius: 0,
							padding: "5px 8px", color: COLORS.text, fontFamily: FONT_MONO,
							fontSize: 12, width: "100%", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
						}}
					/>
					<button type="submit" disabled={eloLoading || !eloQuery.trim()}
						style={{
							background: eloLoading || !eloQuery.trim() ? COLORS.border : COLORS.bgHover,
							border: `1px solid ${eloLoading || !eloQuery.trim() ? COLORS.border : COLORS.accentDim}`,
							borderRadius: 0, padding: "5px 14px", color: eloLoading || !eloQuery.trim() ? COLORS.textDim : COLORS.accent,
							fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em",
							cursor: eloLoading || !eloQuery.trim() ? "not-allowed" : "pointer",
							whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0,
						}}>
						{eloLoading ? "SEARCHING…" : "SEARCH"}
					</button>
				</form>

				{ eloError && (
					<div style={{ marginTop: 6, fontSize: 11, color: COLORS.loss, fontFamily: FONT_MONO }}>{eloError}</div>
				) }

				{ eloResults.length > 0 && (
					<div style={{ marginTop: 6, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 0, overflow: "hidden" }}>
						{eloResults.map((player, i) => (
							<div key={player.id}
								onClick={() => selectPlayer(player)}
								onMouseEnter={e => { e.currentTarget.style.background = COLORS.bgCard; }}
								onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
								style={{
									display: "flex", alignItems: "center", gap: 10, padding: "3px 8px",
									borderBottom: i < eloResults.length - 1 ? "1px solid var(--bg-raised)" : "none",
									cursor: "pointer", transition: "background 0.15s",
								}}>
								<div style={{ flex: 1 }}>
									<div style={{ fontSize: 12, color: COLORS.text, fontFamily: FONT_MONO }}>{player.display_name}</div>
									<div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONT_MONO }}>
										{player.primary_community} · {countryFlag(player.country)} {player.country}
									</div>
								</div>
							</div>
						))}
					</div>
				) }

				</>)}

				{/* ── Matches: Data (analysis) and History (the editable rows) ── */}
				{ linkedPlayer && !addingAccount && (
					<div style={{ marginBottom: 4 }}>
						<div role="tablist" style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, marginBottom: 10 }}>
							{[["data", "DATA"], ["history", "HISTORY"]].map(([key, text]) => (
								<button key={key} role="tab" aria-selected={matchTab === key} onClick={() => setMatchTab(key)}
									onMouseEnter={e => { if (matchTab !== key) e.currentTarget.style.color = COLORS.text; }}
									onMouseLeave={e => { if (matchTab !== key) e.currentTarget.style.color = COLORS.textMuted; }}
									style={{
										padding: "6px 16px", marginBottom: -1, cursor: "pointer",
										background: "transparent", border: "none", borderRadius: 0,
										borderBottom: `2px solid ${matchTab === key ? COLORS.accent : "transparent"}`,
										color: matchTab === key ? COLORS.accent : COLORS.textMuted,
										fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.14em", transition: "color 0.15s",
									}}>
									{text}
								</button>
							))}
							<SeasonSelect value={season ?? "all"} options={seasonOptions} onChange={changeSeason} />
						</div>
						{matchTab === "data" ? (
							<MatchStats matches={statMatches} legends={legends} status={savedStatus}
								season={season} seasonName={seasonName} seasons={seasons} />
						) : (<>
						{/* Current Elo + season from the rows shown, and Search to pull the latest from EloShowdown. */}
						<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, fontFamily: FONT_MONO }}>
							<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.15em" }}>
								ELO
							</div>
							{shownHistory?.points.at(-1)?.elo_after != null && (
								<div style={{ fontSize: 14, fontWeight: 700, color: COLORS.accent }}>
									{shownHistory.points.at(-1).elo_after}
								</div>
							)}
							<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.1em" }}>
								{seasonName.toUpperCase()}
							</div>
							<button onClick={handleSync} disabled={syncing || eloHistoryLoading}
								title="Load the latest matches from EloShowdown"
								onMouseEnter={e => { if (!syncing) { e.currentTarget.style.borderColor = COLORS.accentDim; e.currentTarget.style.color = COLORS.accent; } }}
								onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
								style={{
									marginLeft: "auto", padding: "3px 12px",
									background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, borderRadius: 0,
									color: COLORS.textMuted, fontFamily: FONT_MONO,
									fontSize: 10, letterSpacing: "0.14em",
									cursor: syncing || eloHistoryLoading ? "not-allowed" : "pointer", transition: "all 0.2s",
								}}>
								{syncing ? "SEARCHING…" : "SEARCH"}
							</button>
						</div>
						{eloHistoryLoading && (
							<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.1em", padding: "4px 0" }}>
								LOADING MATCH HISTORY…
							</div>
						)}
						{syncError && (
							<div style={{ fontSize: 11, color: COLORS.loss, fontFamily: FONT_MONO, padding: "4px 0" }}>{syncError}</div>
						)}
						{savedStatus === "error" && (
							<div style={{ fontSize: 11, color: COLORS.loss, fontFamily: FONT_MONO, padding: "4px 0" }}>
								Couldn&rsquo;t load your saved matches. Reload the page to try again &mdash; saving is off until they load, so your saved legends can&rsquo;t be overwritten.
							</div>
						)}
						{!eloHistoryLoading && savedStatus === "ready" && !shownHistory?.points?.length && (
							<div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT_MONO, padding: "4px 0" }}>
								{isGuest
									? `No matches found on EloShowdown for this account in ${seasonName}.`
									: `No saved matches in ${seasonName}. Click Search to load them from EloShowdown.`}
							</div>
						)}
						{ shownHistory?.points?.length > 0 && (() => {
							const points = [...shownHistory.points].reverse();
							const recent = points.slice(0, eloVisible);
							const hasMore = points.length > eloVisible;
							// Matches per event, across every row (not just the visible ones).
							const eventSize = new Map();
							for (const p of eloHistory.points) eventSize.set(eventKeyFor(p), (eventSize.get(eventKeyFor(p)) ?? 0) + 1);
							// Saving is off mid-save, and until the stored picks have loaded.
							const saveOff = saving || savedStatus !== "ready";
							return (
								<div>
									<div>
										{recent.map((m, i) => {
											const resultColor = m.result === "win" ? COLORS.win : m.result === "loss" ? COLORS.loss : COLORS.draw;
											const changeSign = m.elo_change > 0 ? "+" : "";
											const d = new Date(m.date);
											const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
											const picks = matchChampions[`${linkedPlayer.id}:${m.match_id}`] || {};
											// Consecutive matches from the same tournament share one header row.
											const showHeader = i === 0 || eventKeyFor(m) !== eventKeyFor(recent[i - 1]);
											const endsGroup = i < recent.length - 1 && eventKeyFor(m) !== eventKeyFor(recent[i + 1]);
											return (
												<Fragment key={m.match_id}>
												{showHeader && (
													<TournamentHeader tournament={tournamentFor(m)} dateStr={dateStr} />
												)}
												{/* You | result + Elo | opponent. Equal side columns keep the result centred. */}
												<div
													style={{
														display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
														alignItems: "center", columnGap: 16,
														height: 50, padding: "0 4px", background: COLORS.bg,
														border: `1px solid ${COLORS.border}`, borderTop: "none",
														marginBottom: endsGroup ? 12 : 0,
													}}>
													<LegendPick side="left" player="You" champions={legends} value={picks.mine}
														onSelect={id => setChampion(m, "mine", id)}
														fillEvent={{ count: eventSize.get(eventKeyFor(m)), on: fillEvent, onToggle: () => setFillEvent(f => !f) }} />
													{/* Fixed side columns so the score box sits on the row's centre line in every row. */}
													<div style={{ display: "grid", gridTemplateColumns: "48px 60px 48px", alignItems: "center", columnGap: 10, fontFamily: FONT_MONO }}>
														<span style={{ textAlign: "right", fontSize: 11, fontWeight: 700, color: resultColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
															{m.result}
														</span>
														<span style={{ display: "flex", justifyContent: "center" }}>
															<ScorePick result={m.result} value={picks.score} onSelect={score => setScore(m, score)} />
														</span>
														{/* No Elo moved (a draw between equal ratings) — the result says it all. */}
														<span style={{ fontSize: 14, fontWeight: 700, color: m.elo_change > 0 ? COLORS.win : m.elo_change < 0 ? COLORS.loss : COLORS.textDim }}>
															{m.elo_change === 0 ? "" : m.elo_change == null ? "—" : `${changeSign}${m.elo_change}`}
														</span>
													</div>
													<LegendPick side="right" player={m.opponent_name} champions={legends} value={picks.opponent}
														onSelect={id => setChampion(m, "opponent", id)} />
												</div>
												</Fragment>
											);
										})}
									</div>
									{ hasMore && (
										<button
											onClick={() => setEloVisible(v => v + ELO_PAGE_SIZE)}
											onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accentDim; e.currentTarget.style.color = COLORS.accent; }}
											onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
											style={{
												width: "100%", marginTop: 4, padding: "4px 12px",
												background: COLORS.bgRaised, border: "1px solid var(--border)", borderRadius: 0,
												color: COLORS.textMuted, fontFamily: FONT_MONO,
												fontSize: 10, letterSpacing: "0.14em", cursor: "pointer", transition: "all 0.2s",
											}}>
											LOAD MORE ({points.length - eloVisible} MORE)
										</button>
									) }

									{/* Save the whole loaded history (with champion picks) to DynamoDB — or, for a guest, log in first */}
									<button onClick={handleSaveHistory} disabled={saveOff} title={isGuest ? GUEST_SAVE_HINT : undefined}
										onMouseEnter={e => { if (!saveOff) e.currentTarget.style.boxShadow = "0 0 18px color-mix(in srgb, var(--accent) 33%, transparent)"; }}
										onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
										style={{
											width: "100%", marginTop: 4, padding: "5px 12px", borderRadius: 0,
											background: saveOff ? COLORS.border : "linear-gradient(135deg, var(--accent), var(--accent))",
											border: `1px solid ${saveOff ? COLORS.border : COLORS.accent}`,
											color: saveOff ? COLORS.textDim : COLORS.bg,
											fontFamily: FONT_MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
											cursor: saveOff ? "not-allowed" : "pointer", transition: "all 0.2s",
										}}>
										{saving ? "SAVING…" : isGuest ? "LOG IN TO SAVE MATCH HISTORY" : "SAVE MATCH HISTORY"}
									</button>
									{isGuest && (
										<div style={{ marginTop: 4, fontSize: 10, textAlign: "center", color: COLORS.textDim, fontFamily: FONT_MONO }}>
											Not saved — your picks stay in this tab until you log in, and are gone once you close it.
										</div>
									)}

									{saveMsg && (
										<div style={{ marginTop: 4, fontSize: 11, textAlign: "center", color: saveMsg.ok ? COLORS.win : COLORS.loss, fontFamily: FONT_MONO }}>
											{saveMsg.text}
										</div>
									)}
								</div>
							);
						} ) () }
						</>)}
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
		onMouseEnter: e => { e.currentTarget.style.background = COLORS.bgHover; },
		onMouseLeave: e => { e.currentTarget.style.background = "transparent"; },
	};

	return (
		<div style={{ position: "relative" }}>
			<button onClick={() => setOpen(o => !o)}
				onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accentDim; }}
				onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.borderHover; }}
				style={{
					display: "flex", alignItems: "center", gap: 6,
					background: COLORS.bgCard, border: "1px solid var(--border-hover)", borderRadius: 0,
					padding: "1px 8px", cursor: "pointer", transition: "border-color 0.2s",
					fontSize: 11, color: COLORS.accent, fontFamily: font,
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
						background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 0,
						boxShadow: "0 8px 24px var(--shadow)",
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
										<div style={{ fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? COLORS.accent : COLORS.text, fontFamily: font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
										onMouseEnter={e => { e.currentTarget.style.color = COLORS.loss; }}
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
								fontSize: 11, letterSpacing: "0.1em", color: COLORS.accent, fontFamily: font, transition: "background 0.15s",
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
			display: "flex", alignItems: "center", gap: 8, height: 30, padding: "0 10px",
			background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 0,
			fontSize: 13, letterSpacing: "0.04em", fontFamily: FONT_MONO,
		}}>
			{tournament ? (
				<a href={tournament.url} target="_blank" rel="noopener noreferrer"
					onMouseEnter={e => { e.currentTarget.style.textDecoration = "underline"; }}
					onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}
					style={{ color: COLORS.accent, fontWeight: 700, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
					{label}
				</a>
			) : (
				<span style={{ color: COLORS.textDim, fontStyle: "italic" }}>{label}</span>
			)}
			<span style={{ color: COLORS.textDim, marginLeft: "auto", flexShrink: 0, fontSize: 11 }}>{dateStr}</span>
		</div>
	);
}

// ── Score pick ───────────────────────────────────────────────────────────────
// The final game score, between the result and the Elo change. Click opens a
// small menu of the scores that fit the result (best of 3, then best of 1),
// plus ✕ to clear one already set.

function ScorePick({ result, value, onSelect }) {
	const [open, setOpen] = useState(false);
	const options = scoreOptions(result);
	const pick = score => { onSelect(score); setOpen(false); };

	return (
		<div style={{ position: "relative" }} onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}>
			<button onClick={() => setOpen(o => !o)} aria-expanded={open}
				title={value ? `Best of ${bestOf(value)} — click to change` : "Set the final score"}
				onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accentDim; e.currentTarget.style.color = COLORS.accent; }}
				onMouseLeave={e => { e.currentTarget.style.borderColor = value ? COLORS.border : COLORS.borderHover; e.currentTarget.style.color = value ? COLORS.textStrong : COLORS.textDim; }}
				style={{
					height: 22, minWidth: 40, padding: "0 6px", borderRadius: 0, cursor: "pointer",
					background: open ? COLORS.bgHover : "transparent",
					border: `1px ${value ? "solid" : "dashed"} ${value ? COLORS.border : COLORS.borderHover}`,
					color: value ? COLORS.textStrong : COLORS.textDim, fontFamily: FONT_MONO,
					fontSize: value ? 13 : 9, fontWeight: 700, letterSpacing: value ? "0.04em" : "0.14em",
					transition: "border-color 0.15s, color 0.15s",
				}}>
				{value ?? "SCORE"}
			</button>

			{open && (
				<>
					{/* click-away backdrop */}
					<div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
					<div style={{
						position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", zIndex: 50,
						background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, boxShadow: `0 8px 24px ${COLORS.shadow}`,
						padding: 8, fontFamily: FONT_MONO,
					}}>
						<div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.14em", marginBottom: 6, whiteSpace: "nowrap" }}>FINAL SCORE</div>
						<div style={{ display: "flex", gap: 4 }}>
							{options.map(score => {
								const selected = score === value;
								return (
									<button key={score} onClick={() => pick(score)} title={`Best of ${bestOf(score)}`}
										onMouseEnter={e => { if (!selected) e.currentTarget.style.background = COLORS.bgHover; }}
										onMouseLeave={e => { if (!selected) e.currentTarget.style.background = COLORS.bgRaised; }}
										style={{
											width: 48, height: 42, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
											background: selected ? alpha(COLORS.accent, 14) : COLORS.bgRaised,
											border: `1px solid ${selected ? COLORS.accent : COLORS.border}`, borderRadius: 0, cursor: "pointer",
											fontFamily: FONT_MONO, transition: "background 0.15s",
										}}>
										<span style={{ fontSize: 13, fontWeight: 700, color: selected ? COLORS.accent : COLORS.textStrong }}>{score}</span>
										<span style={{ fontSize: 8, letterSpacing: "0.1em", color: COLORS.textDim }}>BO{bestOf(score)}</span>
									</button>
								);
							})}
							{value && (
								<button onClick={() => pick(null)} title="Clear the score"
									onMouseEnter={e => { e.currentTarget.style.color = COLORS.loss; }}
									onMouseLeave={e => { e.currentTarget.style.color = COLORS.textDim; }}
									style={{
										width: 32, height: 42, background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 0,
										color: COLORS.textDim, fontFamily: FONT_MONO, fontSize: 12, cursor: "pointer", transition: "color 0.15s",
									}}>
									✕
								</button>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}

// ── Legend pick ──────────────────────────────────────────────────────────────
// One side of a match row: "[icon] Player - Legend - runes", with the icon on
// the outer edge (mirrored on the right). Click opens the legend picker, which
// is portalled to <body> so no other card on the page can cover it.

// Tallest the legend picker gets; it opens upward when there isn't this much room below.
const PICKER_MAX_HEIGHT = 360;
const PICKER_GAP = 4;
const PICK_ICON_SIZE = 32;

// `fillEvent` ({ count, on, onToggle }) adds the "apply to all matches in this
// event" checkbox; only your own side passes it.
function LegendPick({ champions, value, onSelect, player, side, fillEvent }) {
	const [open, setOpen] = useState(false);
	// Champions whose S3 icon 404s — those fall back to the card art.
	const [iconless, setIconless] = useState([]);
	const [pos, setPos] = useState(null);
	const [search, setSearch] = useState("");
	const buttonRef = useRef(null);
	const pickerRef = useRef(null);
	const champ = champions.find(c => c.id === value);
	const isLeft = side === "left";
	const term = search.trim().toLowerCase();
	const filtered = champions.filter(c =>
		c.tags_text.toLowerCase().includes(term) ||
		c.name.toLowerCase().includes(term)
	);
	const close = () => { setOpen(false); setSearch(""); };
	const pick = (id) => { onSelect(id); close(); };

	function openPicker() {
		// Measure on open: flip above the button if the picker would run past the
		// bottom of the viewport and there's more room above.
		const rect = buttonRef.current.getBoundingClientRect();
		const { clientWidth, clientHeight } = document.documentElement;
		const spaceBelow = clientHeight - rect.bottom - PICKER_GAP;
		const spaceAbove = rect.top - PICKER_GAP;
		const up = spaceBelow < PICKER_MAX_HEIGHT && spaceAbove > spaceBelow;
		setPos({
			...(up ? { bottom: clientHeight - rect.top + PICKER_GAP } : { top: rect.bottom + PICKER_GAP }),
			...(isLeft ? { left: rect.left } : { right: clientWidth - rect.right }),
			maxHeight: Math.min(PICKER_MAX_HEIGHT, (up ? spaceAbove : spaceBelow) - 8),
		});
		setOpen(true);
	}

	// The picker is fixed to the viewport, so close it rather than leave it
	// floating away from its row when the page scrolls or resizes.
	useEffect(() => {
		if (!open) return;
		const dismiss = () => { setOpen(false); setSearch(""); };
		const onScroll = e => { if (!pickerRef.current?.contains(e.target)) dismiss(); };
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", dismiss);
		return () => {
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", dismiss);
		};
	}, [open]);

	const iconFor = (c, size) => c.icon && !iconless.includes(c.id)
		? <Image src={c.icon} alt="" fill sizes={`${size}px`} style={{ objectFit: "cover" }}
			onError={() => setIconless(prev => prev.includes(c.id) ? prev : [...prev, c.id])} />
		: c.image && <Image src={c.image} alt="" fill sizes={`${size}px`} style={{ objectFit: "cover", objectPosition: "top" }} />;

	const icon = (
		<div style={{
			position: "relative", width: PICK_ICON_SIZE, height: PICK_ICON_SIZE, flexShrink: 0, overflow: "hidden",
			background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`,
			display: "flex", alignItems: "center", justifyContent: "center",
			color: COLORS.textDim, fontSize: 14, fontFamily: FONT_MONO,
		}}>
			{champ ? iconFor(champ, PICK_ICON_SIZE) : "+"}
		</div>
	);

	return (
		<div style={{ minWidth: 0, display: "flex", justifyContent: isLeft ? "flex-start" : "flex-end" }}>
			<button ref={buttonRef}
				onClick={() => open ? close() : openPicker()}
				title={champ ? legendLabel(champ) : "Pick a legend"}
				onMouseEnter={e => { e.currentTarget.style.background = COLORS.bgHover; }}
				onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
				style={{
					display: "flex", alignItems: "center", gap: 8, minWidth: 0, maxWidth: "100%",
					background: open ? COLORS.bgHover : "transparent", border: "none", borderRadius: 0,
					padding: "4px 6px", cursor: "pointer", transition: "background 0.15s",
				}}>
				{isLeft && icon}
				<span style={{
					minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
					fontSize: 13, fontFamily: FONT_MONO, color: COLORS.text,
				}}>
					{player}
					<span style={{ color: COLORS.textDim }}> - </span>
					<span style={{ color: champ ? COLORS.accent : COLORS.textDim }}>{champ ? champ.tags_text : "pick legend"}</span>
				</span>
				{champ?.domains.length > 0 && (
					<span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0, fontSize: 13, fontFamily: FONT_MONO, color: COLORS.textDim }}>
						-<RuneIcons domains={champ.domains} />
					</span>
				)}
				{!isLeft && icon}
			</button>

			{open && createPortal(
				<>
					{/* click-away backdrop */}
					<div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
					<div ref={pickerRef} style={{
						position: "fixed", ...pos, zIndex: 1000,
						width: 330, maxWidth: "calc(100vw - 32px)",
						display: "flex", flexDirection: "column",
						background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 0,
						boxShadow: `0 8px 24px ${COLORS.shadow}`,
					}}>
						{/* Search stays pinned above the scrolling list; Enter picks the top match. */}
						<div style={{ padding: 8, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
							<input
								autoFocus
								value={search}
								onChange={e => setSearch(e.target.value)}
								onKeyDown={e => {
									if (e.key === "Enter" && filtered.length > 0) pick(filtered[0].id);
									if (e.key === "Escape") close();
								}}
								onFocus={e => { e.target.style.borderColor = COLORS.accentDim; }}
								onBlur={e => { e.target.style.borderColor = COLORS.borderHover; }}
								placeholder="Search legends..."
								style={{
									width: "100%", background: COLORS.bg,
									border: `1px solid ${COLORS.borderHover}`, borderRadius: 0,
									padding: "6px 10px", fontSize: 12,
									color: COLORS.text, outline: "none",
									fontFamily: FONT_MONO,
								}}
							/>
						</div>
						{fillEvent?.count > 1 && (
							<div role="checkbox" aria-checked={fillEvent.on} tabIndex={0}
								onClick={fillEvent.onToggle}
								onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); fillEvent.onToggle(); } }}
								onMouseEnter={e => { e.currentTarget.style.color = COLORS.text; }}
								onMouseLeave={e => { e.currentTarget.style.color = COLORS.textMuted; }}
								style={{
									display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", flexShrink: 0,
									borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", userSelect: "none",
									fontSize: 11, color: COLORS.textMuted, fontFamily: FONT_MONO, transition: "color 0.15s",
								}}>
								<span style={{
									width: 13, height: 13, flexShrink: 0,
									display: "flex", alignItems: "center", justifyContent: "center",
									border: `1px solid ${fillEvent.on ? COLORS.accent : COLORS.borderHover}`,
									background: fillEvent.on ? COLORS.accent : "transparent",
									color: COLORS.bg, fontSize: 10, fontWeight: 700, lineHeight: 1,
								}}>
									{fillEvent.on && "✓"}
								</span>
								Apply to all {fillEvent.count} matches in this event
							</div>
						)}
						<div style={{ overflowY: "auto", flex: 1 }}>
							{/* Undo a wrong pick; saving then removes it from the stored match too. */}
							{champ && !term && (
								<div
									onClick={() => pick(null)}
									onMouseEnter={e => { e.currentTarget.style.background = COLORS.bgHover; }}
									onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
									style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 12px", cursor: "pointer", transition: "background 0.15s", borderBottom: `1px solid ${COLORS.border}` }}>
									<div style={{ width: 35, height: 35, flexShrink: 0, background: COLORS.bg, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textDim, fontFamily: FONT_MONO, fontSize: 14 }}>
										✕
									</div>
									<span style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: FONT_MONO }}>Clear pick</span>
								</div>
							)}
							{filtered.length === 0 && (
								<div style={{ padding: "12px 14px", fontSize: 11, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.06em" }}>
									{champions.length === 0 ? "No legends found." : <>No legends match &ldquo;{search}&rdquo;.</>}
								</div>
							)}
							{filtered.map(c => (
								<div key={c.id}
									onClick={() => pick(c.id)}
									onMouseEnter={e => { e.currentTarget.style.background = COLORS.bgHover; }}
									onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
									style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 12px", cursor: "pointer", transition: "background 0.15s" }}>
									<div style={{ position: "relative", width: 35, height: 35, overflow: "hidden", background: COLORS.bg, flexShrink: 0 }}>
										{iconFor(c, 35)}
									</div>
									<span style={{
										fontSize: 14, color: c.id === value ? COLORS.accent : COLORS.text, fontFamily: FONT_MONO,
										minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
									}}>
										{legendLabel(c)}
									</span>
								</div>
							))}
						</div>
					</div>
				</>,
				document.body
			)}
		</div>
	);
}

// ── Season selector ──────────────────────────────────────────────────────────
// Right end of the DATA / HISTORY tab bar; filters both tabs.

function SeasonSelect({ value, options, onChange }) {
	return (
		<span style={{ marginLeft: "auto", paddingBottom: 4 }}>
			<Dropdown variant="compact" label="SEASON" value={value} options={options} onChange={onChange} />
		</span>
	);
}
