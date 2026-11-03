"use client";
import { Fragment, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { COLORS, FONT_MONO } from "../../lib/data";
import { legendLabel } from "../../lib/cards/data";
import LegendIcon from "../cards/LegendIcon";
import RuneIcons from "../cards/RuneIcons";
import MatchStats from "./MatchStats";
import MobileProfile from "./MobileProfile";
import NexusNight from "./NexusNight";
import MatchNotes, { NoteEditor } from "./MatchNotes";
import SideboardNotes from "./SideboardNotes";
import UnofficialMatches from "./UnofficialMatches";
import { LegendPick, ScorePick, NoteToggle } from "./MatchPicks";
import Dropdown from "../Dropdown";
import { useIsMobile } from "../../hooks/useIsMobile";
import { StatTiles } from "./ProfileStats";
import { latestSeason, summarize, sortChronological, seasonOfMatch, seasonsOf, seasonLabel, scoreOptions, startedSeasons, playedLabel, recordsBy } from "../../lib/matchStats";
import { countryFlag } from "../../lib/countries";
import { useAuth } from "../../hooks/useAuth";
import { saveMatchHistory, getMatchHistory, getDrafts, saveDraft, deleteDraft, getUnofficialMatches, saveUnofficialMatch, deleteUnofficialMatch, getSideboardNotes, saveSideboardNote, saveSideboardBattlefields, deleteSideboardNote, getSideboardCards, searchPlayers, getPlayerHistory, findBoundriftId, resolveEvents, lookupEvent, getProfile, addEloAccount, selectEloAccount, removeEloAccount } from "../../lib/api";
import { byPlayed, fromSaved, mergeHistory, withLegacyPicks, applyEvents, retryMissing, needsLookup, lookupHints, eventKey, groupKeys, withSourceScores, playerSummary, isUnpairedLegacy, pairCandidates, pairByHand, liveItems } from "../../lib/history";
import { readGuestDraft, writeGuestDraft, clearGuestDraft } from "../../lib/guestDraft";
import { newDraft, matchDraftGames, draftPicks, readLocalDrafts, writeLocalDrafts } from "../../lib/nexusDrafts";
import { matchupKey, noteIsEmpty, readLocalNotes, writeLocalNotes, readLocalBattlefields, writeLocalBattlefields } from "../../lib/sideboardNotes";
import { newUnofficial, byNewest, asStatItem, asRow, readLocalUnofficial, writeLocalUnofficial, readIncludeUnofficial, writeIncludeUnofficial } from "../../lib/unofficial";
import GuestNotice, { GUEST_SAVE_HINT } from "./GuestNotice";
import GetStarted from "./GetStarted";

// Shown in the profile header while signed out.
const GUEST = { username: "Guest", subtitle: "Not signed in — nothing on this page is saved" };

// "shadowrift" → "SH" — the avatar when no legend has been played yet.
const initials = name => name.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "?";

// The match section's tabs ([key, label, phone label]), and those the season
// selector applies to.
const MATCH_TABS = [
	["data", "DATA", "DATA"],
	["history", "MATCH HISTORY (OFFICIAL)", "OFFICIAL"],
	["unofficial", "MATCH HISTORY (UNOFFICIAL)", "UNOFFICIAL"],
	["notes", "GAME NOTES", "GAME NOTES"],
	["sideboard", "SIDEBOARD NOTES", "SIDEBOARD"],
	["nexus", "NEXUS NIGHT", "NEXUS NIGHT"],
];
const SEASONAL_TABS = ["data", "history", "notes"];

// How many match-history rows to reveal per "Load More" click.
const ELO_PAGE_SIZE = 10;
// Nexus Night drafts save this long after the last edit.
const DRAFT_SAVE_DELAY_MS = 800;
// ...and match notes this long after the last keystroke.
const NOTE_SAVE_DELAY_MS = 1000;

// ── Match history data ────────────────────────────────────────────────────────
// The rows are { points } — see lib/history.js for their shape — whether they
// came from our MatchHistory table, from a BoundRift Search, or both.

// The season both tabs show: the one picked beside the tabs ("all" = every
// season), else the newest season with matches, else the current one.
function pickSeason(choice, seasons, matches) {
	if (choice === "all") return null;
	return choice ?? seasonsOf(matches)[0] ?? seasons.find(s => s.is_current)?.slug ?? null;
}

// A history narrowed to one season's rows (unchanged when slug is null).
function historyForSeason(history, slug, seasons) {
	if (!history || !slug) return history;
	return { ...history, points: history.points.filter(p => seasonOfMatch(p, seasons) === slug) };
}

// Saved rows with a guest draft for the same account laid over them: the
// draft's matches merged in and its picks winning, since they're the newer work.
function withDraft(playerId, items, draft) {
	const { history, picks } = fromSaved(playerId, items);
	if (draft?.activeId !== playerId || !draft.history) return { history, picks };
	return { history: mergeHistory(history, draft.history.points), picks: { ...picks, ...draft.picks } };
}

// The BoundRift id an account reads its matches from: set on accounts linked
// through BoundRift, and found for ones linked through EloShowdown.
const boundriftIdOf = account => account?.boundrift_id ?? (account?.id?.startsWith("br-") ? account.id.slice(3) : null);

// One page row as Save sends it. Picks go as null when the row has none, which
// clears any stored pick — as does a score that no longer fits the result. A
// note is sent once the row has one (an emptied note goes as null, clearing it).
function toPayload(m, picks = {}) {
	return {
		matchId: m.match_id,
		result: m.result,
		score: scoreOptions(m.result).includes(picks.score) ? picks.score : null,
		playedAt: m.date,
		month: m.month,
		opponent: m.opponent_name,
		opponentId: m.opponent_id,
		myChampion: picks.mine ?? null,
		opponentChampion: picks.opponent ?? null,
		eventName: m.event?.name,
		eventId: m.event?.id,
		eloBefore: m.elo_before,
		eloChange: m.elo_change,
		eloAfter: m.elo_after,
		season: m.season,
		notes: noteValue(picks.notes),
	};
}

// A note as it's sent: trimmed, null once emptied, absent if never written.
const noteValue = notes => (typeof notes === "string" ? notes.trim() || null : undefined);

// One row as a note's autosave sends it: the row without its picks, so the
// stored picks are left as they are (lambda/saveMatchHistory.mjs).
function notePayload(m, notes) {
	const row = toPayload(m);
	for (const k of ["myChampion", "opponentChampion", "score"]) delete row[k];
	return { ...row, notes: noteValue(notes) ?? null };
}

// The stored items once a note has saved: the row's item takes the note (or
// loses it), or is added if the row wasn't stored yet.
function withStoredNote(items, row) {
	const id = String(row.matchId);
	if (!items.some(m => String(m.matchId) === id)) return [...items, asStored(row)];
	return items.map(m => (String(m.matchId) === id ? asStored({ ...m, notes: row.notes }) : m));
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
	const { status, token, user: authUser } = useAuth();
	// Signed out: the page still works, but nothing reaches the backend — the
	// work lives in this tab's guest draft (lib/guestDraft.js) until they log in.
	const isGuest = status === "guest";

	const [eloQuery, setEloQuery] = useState("");
	const [eloResults, setEloResults] = useState([]);
	const [eloLoading, setEloLoading] = useState(false);
	const [eloError, setEloError] = useState(null);
	// Player accounts linked to this user, and the one whose history is shown.
	// Accounts linked before BoundRift have an EloShowdown id; their BoundRift id
	// is looked up once (see the effect below).
	const [accounts, setAccounts] = useState([]);
	const [activeId, setActiveId] = useState(null);
	const linkedPlayer = accounts.find(a => a.id === activeId) ?? null;
	const boundriftId = boundriftIdOf(linkedPlayer);
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
	// The other linked accounts' items (signed in), for the Data tab's report
	// across every account: { [accountId]: items }.
	const [otherSaved, setOtherSaved] = useState({});
	// True while the Search button is pulling the latest matches from BoundRift.
	const [syncing, setSyncing] = useState(false);
	const [syncError, setSyncError] = useState(null);
	const [eloVisible, setEloVisible] = useState(ELO_PAGE_SIZE);
	// Per-match picks — both legends, the final score and the match's note:
	// { ["playerId:matchId"]: { mine, opponent, score, notes } }.
	const [matchChampions, setMatchChampions] = useState({});
	const [saving, setSaving] = useState(false);
	// "Apply to all matches in this event" in your legend picker — on by default,
	// since a player almost always runs one legend for a whole event.
	const [fillEvent, setFillEvent] = useState(true);
	// Match section tab: "data" (analysis), "history" (the official rows, from
	// BoundRift), "unofficial" (games logged by hand), "notes" (match notes by
	// matchup) or "nexus" (Nexus Night drafts).
	const [matchTab, setMatchTab] = useState("data");
	const [saveMsg, setSaveMsg] = useState(null);
	const dismissSave = useCallback(() => setSaveMsg(null), []);
	// Signed in with guest work from this tab, loaded onto the page but not yet saved.
	const [carriedOver, setCarriedOver] = useState(false);
	// Phones get MobileProfile: same state and handlers, laid out for a small screen.
	const isMobile = useIsMobile();
	// Season shown on both tabs, picked beside them; null until picked (current season).
	const [seasonChoice, setSeasonChoice] = useState(null);
	// The signed-in user's Users row: { displayName, createdAt } (set at sign-up).
	const [member, setMember] = useState(null);
	// Nexus Night drafts (every linked account's), their load status, and each
	// draft's save state: { [draftId]: "saving" | "saved" | "error" }.
	const [drafts, setDrafts] = useState([]);
	const [draftsStatus, setDraftsStatus] = useState("loading");
	const [draftSave, setDraftSave] = useState({});
	const draftTimers = useRef({});
	// Each note's autosave state, { ["playerId:matchId"]: "saving" | "saved" |
	// "error" }, and the saves waiting on the typing to stop: { [key]: { timer, send } }.
	const [noteSave, setNoteSave] = useState({});
	const noteTimers = useRef({});
	// Unofficial matches (every linked account's — lib/unofficial.js), their load
	// status, each one's save state ({ [matchId]: "saving" | "saved" | "error" })
	// and the saves waiting on the typing to stop ({ [matchId]: { timer, send } }).
	// Sideboard notes (one per matchup), the battlefields brought with each
	// legend, their load status and save states keyed "myLegend|oppLegend", and
	// the pickers' cards and battlefields — fetched the first time the tab opens.
	const [sideboard, setSideboard] = useState([]);
	const [battlefieldSets, setBattlefieldSets] = useState([]);
	const [battlefieldError, setBattlefieldError] = useState(null); // legend id whose save failed
	const [sideboardStatus, setSideboardStatus] = useState("loading");
	const [sideboardSave, setSideboardSave] = useState({});
	const sideboardTimers = useRef({});
	const [sideCards, setSideCards] = useState(null);
	const [sideCardsFailed, setSideCardsFailed] = useState(false);
	const sideCardsRequested = useRef(false);
	const [unofficial, setUnofficial] = useState([]);
	const [unofficialStatus, setUnofficialStatus] = useState("loading");
	const [unofficialSave, setUnofficialSave] = useState({});
	const unofficialTimers = useRef({});
	// Whether the Data tab counts unofficial matches. The page renders nothing
	// until the session resolves, so reading the browser's choice here can't
	// differ from the server render.
	const [includeUnofficial, setIncludeUnofficial] = useState(readIncludeUnofficial);
	// History rows (desktop) whose note box is open, by "playerId:matchId".
	const [openNotes, setOpenNotes] = useState(() => new Set());
	// The seasons (Riftbound sets) that have started: the selector's options, and
	// the dates that place rows saved without a season.
	const [seasons] = useState(() => startedSeasons());
	// "accountId:YYYY-MM" months whose events have been asked for, so each is
	// looked up once (Search and a pasted event link clear an account's).
	const requestedMonths = useRef(new Set());
	// The "Event not found" header whose paste-a-link form is open (its
	// groupKeyFor key), and that form's { busy, error }.
	const [linking, setLinking] = useState(null);
	const [eventLink, setEventLink] = useState({ busy: false, error: null });

	// Find the events behind the visible rows that only know their month, a few
	// months at a time. BoundRift looks through the stores the player is known to
	// play at — learned from the events other rows link to, and from event names
	// on drafts and on rows saved before BoundRift.
	useEffect(() => {
		const accountId = linkedPlayer?.id;
		if (!accountId || !boundriftId || !eloHistory?.points?.length) return;
		const shown = historyForSeason(eloHistory, pickSeason(seasonChoice, seasons, eloHistory.points), seasons);
		const months = [...new Set([...shown.points].reverse().slice(0, eloVisible).filter(needsLookup).map(p => p.month))]
			.filter(m => !requestedMonths.current.has(`${accountId}:${m}`))
			.slice(0, 3);
		if (months.length === 0) return;
		months.forEach(m => requestedMonths.current.add(`${accountId}:${m}`));
		const hints = lookupHints(eloHistory.points, drafts.filter(d => d.eloPlayerId === accountId));
		// Every match in those months still without an event, visible or not.
		const waiting = m => eloHistory.points.filter(p => needsLookup(p) && p.month === m);
		const pending = Object.fromEntries(months.map(m => [m, waiting(m).map(p => p.match_id)]));
		// When EloShowdown has dated all of a month's matches, only events
		// starting around those dates are checked.
		const dates = Object.fromEntries(months
			.filter(m => waiting(m).every(p => p.date))
			.map(m => [m, [...new Set(waiting(m).map(p => p.date))]]));
		const apply = found => {
			if (historyRequest.current === accountId) setEloHistory(prev => applyEvents(prev, found, months));
		};
		resolveEvents(boundriftId, { months, pending, dates, ...hints })
			.then(res => apply(res.events))
			.catch(() => apply({}));
	}, [linkedPlayer, boundriftId, eloHistory, eloVisible, seasonChoice, seasons, drafts]);

	// Accounts linked through EloShowdown get their BoundRift id once, which is
	// saved to the profile so it isn't looked up again.
	useEffect(() => {
		if (!linkedPlayer || boundriftId) return;
		let cancelled = false;
		findBoundriftId(linkedPlayer.id)
			.then(id => {
				if (cancelled) return;
				if (!id) {
					setSyncError("BoundRift doesn't know this account — search for your Riot account ID again to relink it.");
					return;
				}
				const account = { ...linkedPlayer, boundrift_id: id };
				setAccounts(prev => prev.map(a => (a.id === account.id ? account : a)));
				if (token) addEloAccount(token, account).catch(() => {});
			})
			.catch(() => {
				if (!cancelled) setSyncError("Couldn't move this account over to BoundRift — reload the page to try again.");
			});
		return () => { cancelled = true; };
	}, [linkedPlayer, boundriftId, token]);

	// Restore the player accounts saved on the user's profile, so they don't
	// have to search for themselves on every visit, and show the active account's
	// saved history from the MatchHistory table. BoundRift is only asked for
	// matches when the user clicks Search.
	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		// Work done as a guest earlier in this tab (they logged in to save it).
		const draft = readGuestDraft();
		const draftAccount = draft?.accounts.find(a => a.id === draft.activeId);
		(async () => {
			// No backend / no row yet — fall back to the search box.
			let profile = await getProfile(token).catch(() => null);
			if (!cancelled && profile) setMember({ displayName: profile.displayName, createdAt: profile.createdAt });
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

	// Signed in with several accounts: load the others' saved matches for the
	// Data tab. Done again on switching, so the one just left is fresh.
	const accountIds = accounts.map(a => a.id).join(",");
	useEffect(() => {
		if (!token || !accountIds.includes(",")) return;
		let cancelled = false;
		const others = accountIds.split(",").filter(id => id !== activeId);
		Promise.all(others.map(id => getMatchHistory(token, id).then(items => [id, items]).catch(() => null)))
			.then(found => { if (!cancelled) setOtherSaved(Object.fromEntries(found.filter(Boolean))); });
		return () => { cancelled = true; };
	}, [token, accountIds, activeId]);

	// Signed in: load the Nexus Night drafts.
	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		getDrafts(token)
			.then(found => { if (!cancelled) { setDrafts(found); setDraftsStatus("ready"); } })
			.catch(() => { if (!cancelled) setDraftsStatus("error"); });
		return () => { cancelled = true; };
	}, [token]);

	// Signed in: load the sideboard notes.
	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		getSideboardNotes(token)
			.then(found => { if (!cancelled) { setSideboard(found.notes); setBattlefieldSets(found.battlefields); setSideboardStatus("ready"); } })
			.catch(() => { if (!cancelled) setSideboardStatus("error"); });
		return () => { cancelled = true; };
	}, [token]);

	// The pickers' cards and battlefields, once, when Sideboard Notes first opens.
	useEffect(() => {
		if (matchTab !== "sideboard" || sideCardsRequested.current) return;
		sideCardsRequested.current = true;
		getSideboardCards().then(setSideCards).catch(() => setSideCardsFailed(true));
	}, [matchTab]);

	// Signed in: load the unofficial matches.
	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		getUnofficialMatches(token)
			.then(found => { if (!cancelled) { setUnofficial(found); setUnofficialStatus("ready"); } })
			.catch(() => { if (!cancelled) setUnofficialStatus("error"); });
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
		setDrafts(readLocalDrafts());
		setDraftsStatus("ready");
		setUnofficial(readLocalUnofficial());
		setUnofficialStatus("ready");
		setSideboard(readLocalNotes());
		setBattlefieldSets(readLocalBattlefields());
		setSideboardStatus("ready");
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

	// A guest's Nexus Night drafts and unofficial matches live in this browser.
	useEffect(() => {
		if (status === "guest" && draftsStatus === "ready") writeLocalDrafts(drafts);
	}, [status, draftsStatus, drafts]);
	useEffect(() => {
		if (status === "guest" && unofficialStatus === "ready") writeLocalUnofficial(unofficial);
	}, [status, unofficialStatus, unofficial]);
	useEffect(() => {
		if (status === "guest" && sideboardStatus === "ready") writeLocalNotes(sideboard);
	}, [status, sideboardStatus, sideboard]);
	useEffect(() => {
		if (status === "guest" && sideboardStatus === "ready") writeLocalBattlefields(battlefieldSets);
	}, [status, sideboardStatus, battlefieldSets]);

	// A guest with legend picks gets the browser's "leave site?" prompt on
	// closing or reloading the tab — closing it is when their work is lost.
	const guestHasPicks = isGuest && Object.values(matchChampions).some(p => p.mine || p.opponent || p.score || p.notes?.trim());
	useEffect(() => {
		if (!guestHasPicks) return;
		const warn = e => { e.preventDefault(); e.returnValue = ""; };
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [guestHasPicks]);

	// Session still resolving — render nothing.
	if (status === "loading") return null;

	// The active account's Nexus Night drafts, newest event first, each drafted
	// game paired with its History row once that exists. A row's picks include
	// those made on the row saved from EloShowdown it replaced; matched games
	// fill the empty ones, as do the game scores BoundRift has, so History shows
	// (and Save sends) them.
	const accountDrafts = drafts
		.filter(d => d.eloPlayerId === linkedPlayer?.id)
		.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
	const draftMatches = linkedPlayer && eloHistory ? matchDraftGames(accountDrafts, eloHistory.points) : new Map();
	const rowPicks = linkedPlayer
		? withSourceScores(
			draftPicks(withLegacyPicks(matchChampions, eloHistory?.points ?? [], linkedPlayer.id), accountDrafts, draftMatches, linkedPlayer.id),
			eloHistory?.points ?? [], linkedPlayer.id)
		: matchChampions;

	// The event a match was played at: undefined while it's being looked up,
	// null when it wasn't found (or can't be — BoundRift has no month for
	// matches before May 2026).
	const tournamentFor = m => (m.event !== undefined ? m.event : needsLookup(m) && boundriftId ? undefined : null);
	// Matches from one event share a key; one whose event isn't known is its own
	// event. Headers group by groupKeyFor, which puts those under their day —
	// or, with no date either, with the matches whose ids are close to theirs.
	const eventKeyFor = eventKey;
	const groupKeyFor = groupKeys(eloHistory?.points ?? []);

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

	// Write a match's note. Signed in, it saves on its own a moment after the
	// typing stops (or when the box loses focus — see flushNote): notes are too
	// much typing to leave waiting on Save. A guest's stay in the tab's draft.
	function setNote(match, notes) {
		const accountId = linkedPlayer.id;
		const key = `${accountId}:${match.match_id}`;
		setMatchChampions(prev => ({ ...prev, [key]: { ...prev[key], notes } }));
		if (isGuest) return;
		clearTimeout(noteTimers.current[key]?.timer);
		const send = () => sendNote(accountId, match, notes);
		noteTimers.current[key] = { send, timer: setTimeout(send, NOTE_SAVE_DELAY_MS) };
		setNoteSave(prev => ({ ...prev, [key]: "saving" }));
	}

	// Save a note now if its save is still waiting on the typing to stop.
	function flushNote(match) {
		const pending = noteTimers.current[`${linkedPlayer?.id}:${match.match_id}`];
		if (!pending) return;
		clearTimeout(pending.timer);
		pending.send();
	}

	async function sendNote(accountId, match, notes) {
		const key = `${accountId}:${match.match_id}`;
		delete noteTimers.current[key];
		const row = notePayload(match, notes);
		try {
			await saveMatchHistory(token, accountId, [row]);
			if (historyRequest.current === accountId) setSavedMatches(prev => withStoredNote(prev, row));
			// Still "saving" if more was typed while this one was in flight.
			if (!noteTimers.current[key]) setNoteSave(prev => ({ ...prev, [key]: "saved" }));
		} catch {
			setNoteSave(prev => ({ ...prev, [key]: "error" }));
		}
	}

	function toggleNote(key) {
		setOpenNotes(prev => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}

	// Every row on the page (with its picks), as Save sends it. A row that took
	// over a row saved from EloShowdown also marks that one as replaced, so it
	// isn't loaded again.
	function pageMatches() {
		if (!linkedPlayer || !eloHistory) return [];
		return eloHistory.points.flatMap(m => {
			const row = toPayload(m, rowPicks[`${linkedPlayer.id}:${m.match_id}`]);
			return m.legacy_id ? [row, { matchId: m.legacy_id, result: m.result, rekeyedTo: m.match_id }] : [row];
		});
	}

	// Store a draft a moment after the last edit (signed in), so typing doesn't
	// send a request per key. A guest's drafts are written to this browser.
	function persistDraft(draft) {
		if (isGuest) return;
		const id = draft.draftId;
		clearTimeout(draftTimers.current[id]);
		setDraftSave(prev => ({ ...prev, [id]: "saving" }));
		draftTimers.current[id] = setTimeout(() => {
			saveDraft(token, draft)
				.then(() => setDraftSave(prev => (prev[id] ? { ...prev, [id]: "saved" } : prev)))
				.catch(() => setDraftSave(prev => (prev[id] ? { ...prev, [id]: "error" } : prev)));
		}, DRAFT_SAVE_DELAY_MS);
	}

	function createDraft() {
		const draft = newDraft(linkedPlayer.id);
		setDrafts(prev => [draft, ...prev]);
		persistDraft(draft);
	}

	function changeDraft(draft) {
		setDrafts(prev => prev.map(d => (d.draftId === draft.draftId ? draft : d)));
		persistDraft(draft);
	}

	// Remove a draft; if the delete fails it comes back, marked unsaved.
	function removeDraft(id) {
		const removed = drafts.find(d => d.draftId === id);
		clearTimeout(draftTimers.current[id]);
		setDrafts(prev => prev.filter(d => d.draftId !== id));
		setDraftSave(prev => { const next = { ...prev }; delete next[id]; return next; });
		if (isGuest || !removed) return;
		deleteDraft(token, id).catch(() => {
			setDrafts(prev => [removed, ...prev]);
			setDraftSave(prev => ({ ...prev, [id]: "error" }));
		});
	}

	// Store an unofficial match a moment after the last edit (signed in) — or at
	// once, through flushUnofficial — so typing doesn't send a request per key. A
	// guest's are written to this browser.
	function persistUnofficial(match) {
		if (isGuest) return;
		const id = match.matchId;
		clearTimeout(unofficialTimers.current[id]?.timer);
		setUnofficialSave(prev => ({ ...prev, [id]: "saving" }));
		const send = () => {
			delete unofficialTimers.current[id];
			saveUnofficialMatch(token, match)
				// Still "saving" if more was edited while this one was in flight.
				.then(() => { if (!unofficialTimers.current[id]) setUnofficialSave(prev => (prev[id] ? { ...prev, [id]: "saved" } : prev)); })
				.catch(() => setUnofficialSave(prev => (prev[id] ? { ...prev, [id]: "error" } : prev)));
		};
		unofficialTimers.current[id] = { send, timer: setTimeout(send, DRAFT_SAVE_DELAY_MS) };
	}

	function flushUnofficial(id) {
		const pending = unofficialTimers.current[id];
		if (!pending) return;
		clearTimeout(pending.timer);
		pending.send();
	}

	// A new match goes on top, carrying the last one's legend and kind.
	function createUnofficial() {
		const match = newUnofficial(linkedPlayer.id, unofficial.filter(m => m.eloPlayerId === linkedPlayer.id).sort(byNewest)[0]);
		setUnofficial(prev => [match, ...prev]);
		persistUnofficial(match);
	}

	function changeUnofficial(match) {
		setUnofficial(prev => prev.map(m => (m.matchId === match.matchId ? match : m)));
		persistUnofficial(match);
	}

	// Remove an unofficial match; if the delete fails it comes back, marked unsaved.
	function removeUnofficial(id) {
		const removed = unofficial.find(m => m.matchId === id);
		clearTimeout(unofficialTimers.current[id]?.timer);
		delete unofficialTimers.current[id];
		setUnofficial(prev => prev.filter(m => m.matchId !== id));
		setUnofficialSave(prev => { const next = { ...prev }; delete next[id]; return next; });
		if (isGuest || !removed) return;
		deleteUnofficialMatch(token, id).catch(() => {
			setUnofficial(prev => [removed, ...prev]);
			setUnofficialSave(prev => ({ ...prev, [id]: "error" }));
		});
	}

	// Store a sideboard note a moment after the last edit (signed in) — or at
	// once, through flushSideboard — so typing doesn't send a request per key.
	function persistSideboard(note) {
		if (isGuest) return;
		const key = matchupKey(note.myLegend, note.oppLegend);
		clearTimeout(sideboardTimers.current[key]?.timer);
		setSideboardSave(prev => ({ ...prev, [key]: "saving" }));
		const send = () => {
			delete sideboardTimers.current[key];
			saveSideboardNote(token, note)
				// Still "saving" if more was edited while this one was in flight.
				.then(() => { if (!sideboardTimers.current[key]) setSideboardSave(prev => (prev[key] ? { ...prev, [key]: "saved" } : prev)); })
				.catch(() => setSideboardSave(prev => (prev[key] ? { ...prev, [key]: "error" } : prev)));
		};
		sideboardTimers.current[key] = { send, timer: setTimeout(send, DRAFT_SAVE_DELAY_MS) };
	}

	function flushSideboard(key) {
		const pending = sideboardTimers.current[key];
		if (!pending) return;
		clearTimeout(pending.timer);
		pending.send();
	}

	// Edit a matchup's note, creating it on the first edit. A note emptied of
	// everything is deleted rather than stored blank.
	function changeSideboard(note) {
		const key = matchupKey(note.myLegend, note.oppLegend);
		const exists = sideboard.some(n => matchupKey(n.myLegend, n.oppLegend) === key);
		if (noteIsEmpty(note)) {
			if (exists) removeSideboard(note.myLegend, note.oppLegend);
			return;
		}
		setSideboard(prev => (exists ? prev.map(n => (matchupKey(n.myLegend, n.oppLegend) === key ? note : n)) : [...prev, note]));
		persistSideboard(note);
	}

	// Remove a matchup's note; if the delete fails it comes back, marked unsaved.
	function removeSideboard(myLegend, oppLegend) {
		const key = matchupKey(myLegend, oppLegend);
		const removed = sideboard.find(n => matchupKey(n.myLegend, n.oppLegend) === key);
		clearTimeout(sideboardTimers.current[key]?.timer);
		delete sideboardTimers.current[key];
		setSideboard(prev => prev.filter(n => matchupKey(n.myLegend, n.oppLegend) !== key));
		setSideboardSave(prev => { const next = { ...prev }; delete next[key]; return next; });
		if (isGuest || !removed) return;
		deleteSideboardNote(token, myLegend, oppLegend).catch(() => {
			setSideboard(prev => [...prev, removed]);
			setSideboardSave(prev => ({ ...prev, [key]: "error" }));
		});
	}

	// The (up to three) battlefields you bring with a legend. Stored at once —
	// it's a click, not typing — and put back, with a message, if that fails.
	function setBattlefields(myLegend, ids) {
		const before = battlefieldSets;
		setBattlefieldError(null);
		setBattlefieldSets(prev => [...prev.filter(s => s.myLegend !== myLegend), ...(ids.length ? [{ myLegend, battlefields: ids }] : [])]);
		if (isGuest) return;
		saveSideboardBattlefields(token, myLegend, ids).catch(() => {
			setBattlefieldSets(before);
			setBattlefieldError(myLegend);
		});
	}

	function changeIncludeUnofficial(on) {
		setIncludeUnofficial(on);
		writeIncludeUnofficial(on);
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
			const stored = matches.filter(m => !m.rekeyedTo).map(asStored);
			setSavedMatches(stored);
			setSaveMsg({ ok: true, text: `Saved ${stored.length} matches to your history.` });
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
	function showAccount(account) {
		setActiveId(account?.id ?? null);
		setSaveMsg(null);
		setSyncError(null);
		setLinking(null);
		setEventLink({ busy: false, error: null });
		if (account && isGuest) loadGuestHistory(account);
		else if (account) loadSavedHistory(account.id);
		else { historyRequest.current = null; setEloHistory(null); setSavedMatches([]); setEloHistoryLoading(false); }
	}

	// Link a player from the BoundRift search results, make it active, and save
	// it to the profile. One that's already linked (perhaps through EloShowdown)
	// is switched to instead.
	async function selectPlayer(player) {
		setEloResults([]);
		setEloQuery("");
		setEloError(null);
		setAddingAccount(false);
		setLinkError(null);
		const linked = accounts.find(a => boundriftIdOf(a) === player.id);
		if (linked) {
			switchAccount(linked.id);
			return;
		}
		// "br-" keeps the id apart from EloShowdown ids, which use the same numbers.
		const account = { id: `br-${player.id}`, boundrift_id: player.id, display_name: player.display_name };
		setAccounts(prev => [...prev, account]);
		showAccount(account);
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
		showAccount(accounts.find(a => a.id === id));
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
		if (id === activeId) showAccount(remaining[0] ?? null);
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
			const data = await searchPlayers(eloQuery.trim());
			setEloResults(data);
			if (data.length === 0) setEloError("No players found.");
		} catch {
			setEloError("Could not look up that Riot account ID. Please try again.");
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
			setSavedMatches(items.filter(m => !m.rekeyedTo));
			setMatchChampions(prev => ({ ...prev, ...picks }));
			setSavedStatus("ready");
		} catch {
			if (historyRequest.current === playerId) setSavedStatus("error");
		} finally {
			if (historyRequest.current === playerId) setEloHistoryLoading(false);
		}
	}

	// A guest has nothing saved, so an account's rows come straight from
	// BoundRift. Picks already made for it stay — they're keyed by account.
	// savedStatus only tracks the fetch here: there's no stored history to fail.
	async function loadGuestHistory(account) {
		const playerId = account.id;
		historyRequest.current = playerId;
		setEloHistory(null);
		setEloHistoryLoading(true);
		setEloVisible(ELO_PAGE_SIZE);
		setSavedStatus("loading");
		setSavedMatches([]);
		try {
			const id = boundriftIdOf(account) ?? await findBoundriftId(account.id);
			if (!id) throw new Error("Not on BoundRift");
			const fresh = await getPlayerHistory(id);
			if (historyRequest.current === playerId) setEloHistory(mergeHistory(null, fresh));
		} catch {
			if (historyRequest.current === playerId) setSyncError("Could not load matches for your Riot account ID. Please try again.");
		} finally {
			if (historyRequest.current === playerId) { setEloHistoryLoading(false); setSavedStatus("ready"); }
		}
	}

	// Look up events again for the account's months — after Search brings in new
	// matches, or a pasted link teaches it a new store.
	function forgetLookups(accountId) {
		for (const key of [...requestedMonths.current]) {
			if (key.startsWith(`${accountId}:`)) requestedMonths.current.delete(key);
		}
	}

	// Search button: pull every match the player has from BoundRift and merge
	// them into the rows. Picks stay — those on rows saved from EloShowdown show
	// on the matching BoundRift row. Rows whose event wasn't found are looked up
	// again, as the lookup may know more stores by now.
	async function handleSync() {
		if (!linkedPlayer || !boundriftId || syncing) return;
		const accountId = linkedPlayer.id;
		setSyncing(true);
		setSyncError(null);
		setSaveMsg(null);
		try {
			const fresh = await getPlayerHistory(boundriftId);
			if (historyRequest.current !== accountId) return;
			setEloHistory(retryMissing(mergeHistory(eloHistory, fresh)));
			forgetLookups(accountId);
		} catch {
			if (historyRequest.current === accountId) setSyncError("Could not load matches for your Riot account ID. Please try again.");
		} finally {
			setSyncing(false);
		}
	}

	// Open (or close) the paste-a-link form under one "Event not found" header.
	function toggleLink(key) {
		setLinking(open => (open === key ? null : key));
		setEventLink({ busy: false, error: null });
	}

	// A link pasted under an "Event not found" header: the event's matches get
	// it, and its store is searched for the months whose events weren't found.
	// It has to be the event (one of) the header's matches were played at.
	async function handleAddEvent(link) {
		if (!linkedPlayer || !boundriftId || !link.trim() || !eloHistory || !linking) return;
		const accountId = linkedPlayer.id;
		const rows = eloHistory.points.filter(p => groupKeyFor(p) === linking);
		setEventLink({ busy: true, error: null });
		try {
			const res = await lookupEvent(link.trim(), boundriftId);
			if (historyRequest.current !== accountId) return;
			if (!rows.some(p => res.matches[p.match_id])) {
				setEventLink({ busy: false, error: `None of these matches were played at ${res.event.name} — check the link.` });
				return;
			}
			setEloHistory(prev => applyEvents(retryMissing(prev), res.matches));
			forgetLookups(accountId);
			setLinking(null);
			setEventLink({ busy: false, error: null });
		} catch (err) {
			setEventLink({ busy: false, error: err.message });
		}
	}

	// "Same match as…": the user pairs a row saved from EloShowdown that didn't
	// pair on its own with its BoundRift row. Its picks show on that row, and
	// Save marks the old one as replaced, like an automatic pair.
	function pairRow(legacyId, matchId) {
		setEloHistory(prev => pairByHand(prev, legacyId, matchId));
	}

	// Switching season. BoundRift sends every season at once, so nothing needs
	// fetching.
	function changeSeason(slug) {
		setSeasonChoice(slug);
		setEloVisible(ELO_PAGE_SIZE);
	}

	const showSearch = profileStatus === "ready" && (!linkedPlayer || addingAccount);
	// No account linked yet: lead with the get-started steps above the search.
	const firstRun = profileStatus === "ready" && !linkedPlayer;

	// What the record boxes and Data tab count: the active account's saved
	// matches — or, for a guest, who has none, the rows on the page.
	const statMatches = isGuest ? pageMatches().filter(m => !m.rekeyedTo).map(asStored) : savedMatches;
	// The Data tab's report: every linked account's saved matches, each tagged
	// with its account (the active account's as above; a guest has only that).
	const dataMatches = [
		...(linkedPlayer ? liveItems(linkedPlayer.id, statMatches).map(m => ({ ...m, account: linkedPlayer.id })) : []),
		...accounts.filter(a => a.id !== activeId && otherSaved[a.id])
			.flatMap(a => liveItems(a.id, otherSaved[a.id]).map(m => ({ ...m, account: a.id }))),
	];
	const dataAccounts = accounts.filter(a => a.id === activeId || otherSaved[a.id]).map(a => ({ id: a.id, name: a.display_name ?? a.id }));
	// Unofficial matches on those accounts (with a result) as the Data tab counts
	// them — only while "Include unofficial" is ticked.
	const unofficialStats = unofficial
		.filter(m => dataAccounts.some(a => a.id === m.eloPlayerId))
		.map(m => { const item = asStatItem(m); return item && { ...item, account: m.eloPlayerId }; })
		.filter(Boolean);
	const statsProps = {
		matches: includeUnofficial ? [...dataMatches, ...unofficialStats] : dataMatches,
		accounts: dataAccounts, legends, status: savedStatus,
		unofficialCount: unofficialStats.length, includeUnofficial, onIncludeUnofficial: changeIncludeUnofficial,
	};
	// The Unofficial tab's props, shared by both layouts: the active account's
	// matches, newest first.
	const unofficialProps = {
		matches: unofficial.filter(m => m.eloPlayerId === linkedPlayer?.id).sort(byNewest),
		legends, status: unofficialStatus, isGuest, saveState: unofficialSave,
		onCreate: createUnofficial, onChange: changeUnofficial, onDelete: removeUnofficial, onFlush: flushUnofficial,
	};
	// User card numbers: the latest season of those. Shown as "—" until they've
	// loaded (or with no account linked).
	const statsReady = Boolean(linkedPlayer) && savedStatus === "ready";
	const cardSeason = latestSeason(statMatches);
	// The tabs' season, its label and options, and the rows narrowed to it.
	const season = pickSeason(seasonChoice, seasons, eloHistory?.points?.length ? eloHistory.points : statMatches);
	const seasonList = seasons.length ? seasons : seasonsOf(statMatches).map(slug => ({ slug, name: seasonLabel(slug) }));
	const seasonName = seasonList.find(s => s.slug === season)?.name ?? (season ? seasonLabel(season) : "All seasons");
	const seasonOptions = [...seasonList.map(s => [s.slug, s.name]), ["all", "All seasons"]];
	const shownHistory = historyForSeason(eloHistory, season, seasons);
	// The Nexus Night tab's props, shared by both layouts.
	const nexusProps = {
		drafts: accountDrafts, legends, matches: draftMatches, saveState: draftSave, status: draftsStatus, isGuest,
		savedById: new Map(savedMatches.map(m => [String(m.matchId), m])),
		onCreate: createDraft, onChange: changeDraft, onDelete: removeDraft, onGoToHistory: () => setMatchTab("history"),
	};
	// The Notes tab: every match with a note in the season shown, newest first,
	// across the linked accounts — the active one's as on the page (so a note
	// shows as it's typed), the others' as stored — and the unofficial ones.
	const noteEntries = [
		...(linkedPlayer && shownHistory ? shownHistory.points.map(m => [linkedPlayer.id, m, rowPicks[`${linkedPlayer.id}:${m.match_id}`]]) : []),
		...accounts.filter(a => a.id !== activeId && otherSaved[a.id]).flatMap(a => {
			const { history, picks } = fromSaved(a.id, otherSaved[a.id]);
			const all = withLegacyPicks(picks, history.points, a.id);
			return historyForSeason(history, season, seasons).points.map(m => [a.id, m, all[`${a.id}:${m.match_id}`]]);
		}),
		...unofficial.filter(m => dataAccounts.some(a => a.id === m.eloPlayerId)).flatMap(m => {
			const row = asRow(m);
			return historyForSeason({ points: [row] }, season, seasons).points
				.map(r => [m.eloPlayerId, r, { mine: m.myChampion, opponent: m.opponentChampion, score: m.score, notes: m.notes }]);
		}),
	]
		.filter(([, , picks]) => picks?.notes?.trim())
		.map(([account, m, picks]) => ({
			key: `${account}:${m.match_id}`, account: accounts.find(a => a.id === account)?.display_name ?? account,
			match: m, mine: picks.mine, opponent: picks.opponent, score: picks.score, notes: picks.notes.trim(),
		}))
		.sort((a, b) => byPlayed(b.match, a.match));
	const notesProps = {
		entries: noteEntries, legends, status: savedStatus, seasonName, showAccount: dataAccounts.length > 1,
		onGoToHistory: () => setMatchTab("history"),
	};
	// Notes can't be written until the stored ones have loaded, or one would be
	// saved over a note the page hasn't shown.
	const notesOff = !isGuest && savedStatus !== "ready";
	const cardStats = summarize(cardSeason.matches);
	// Who's signed in: the name stored at sign-up (the part of their email
	// before the @), their email and when they joined.
	const user = isGuest ? GUEST : {
		username: member?.displayName ?? authUser?.email?.split("@")[0] ?? "",
		subtitle: authUser?.email ?? "",
		joined: member?.createdAt ? new Date(member.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : null,
	};
	// The legend on their most recent match that has one picked.
	const lastPlayed = sortChronological(statMatches.filter(m => m.myChampion)).at(-1) ?? null;
	const lastLegend = lastPlayed ? legends.find(l => l.id === lastPlayed.myChampion) ?? null : null;
	// The Sideboard Notes tab: your record in each matchup over every game you've
	// logged, and your legends — the last played first, then the most played,
	// then any with notes.
	const allGames = [...dataMatches, ...unofficialStats];
	const sideboardProps = {
		notes: sideboard, legends, status: sideboardStatus, saveState: sideboardSave, isGuest,
		records: new Map(recordsBy(allGames.filter(m => m.myChampion && m.opponentChampion), m => matchupKey(m.myChampion, m.opponentChampion)).map(r => [r.key, r])),
		myLegends: [...new Set([lastLegend?.id, ...recordsBy(allGames, m => m.myChampion).map(r => r.key), ...sideboard.map(n => n.myLegend)].filter(Boolean))],
		battlefieldSets, battlefieldError, pickers: sideCards, cardsStatus: sideCards ? "ready" : sideCardsFailed ? "error" : "loading",
		onChange: changeSideboard, onDelete: removeSideboard, onFlush: flushSideboard, onSetBattlefields: setBattlefields,
	};
	// The legend they've picked most, with how many games: { legend, games }.
	const topPick = recordsBy(statMatches, m => m.myChampion)[0];
	const mostPlayed = topPick && legends.some(l => l.id === topPick.key)
		? { legend: legends.find(l => l.id === topPick.key), games: topPick.games }
		: null;

	// Picks that differ from what's stored, keyed "matchId:mine" /
	// "matchId:opponent" / "matchId:score" / "matchId:notes" — the phone save bar counts these and
	// outlines their slots. BoundRift's own score on a row with none stored isn't
	// a pick the user made, so it isn't counted.
	const unsaved = new Set();
	if (linkedPlayer && eloHistory) {
		const stored = new Map(savedMatches.map(m => [String(m.matchId), m]));
		for (const m of eloHistory.points) {
			const picks = rowPicks[`${linkedPlayer.id}:${m.match_id}`] || {};
			const saved = stored.get(String(m.match_id));
			const sourceScore = !saved?.score && picks.score === m.score;
			if ((picks.mine ?? null) !== (saved?.myChampion ?? null)) unsaved.add(`${m.match_id}:mine`);
			if ((picks.opponent ?? null) !== (saved?.opponentChampion ?? null)) unsaved.add(`${m.match_id}:opponent`);
			if ((picks.score ?? null) !== (saved?.score ?? null) && !sourceScore) unsaved.add(`${m.match_id}:score`);
			// Notes save on their own once typed into here; one that hasn't (a
			// guest's, or guest work carried over by logging in) waits on Save.
			if (!noteSave[`${linkedPlayer.id}:${m.match_id}`] && (noteValue(picks.notes) ?? null) !== (saved?.notes ?? null)) unsaved.add(`${m.match_id}:notes`);
		}
	}
	// "Event not found" headers offer a pasted link — once there's a BoundRift
	// player to look the event's pairings up for.
	const canLink = Boolean(boundriftId);

	if (isMobile) {
		return (
			<MobileProfile
				legends={legends} user={user} lastLegend={lastLegend} lastPlayed={lastPlayed} mostPlayed={mostPlayed} isGuest={isGuest} carriedOver={carriedOver}
				linkedPlayer={linkedPlayer} accounts={accounts} activeId={activeId}
				profileStatus={profileStatus} linkError={linkError} showSearch={showSearch} firstRun={firstRun} addingAccount={addingAccount}
				eloQuery={eloQuery} setEloQuery={setEloQuery} eloResults={eloResults} eloLoading={eloLoading} eloError={eloError}
				onSearch={handleEloSearch} onPickPlayer={selectPlayer}
				onCancelAdd={() => { setAddingAccount(false); setEloResults([]); setEloQuery(""); setEloError(null); }}
				onAddAccount={() => { setAddingAccount(true); setEloResults([]); setEloError(null); }}
				onSwitchAccount={switchAccount} onRemoveAccount={removeAccount}
				cardStats={cardStats} cardSeason={cardSeason} statsReady={statsReady}
				matchTab={matchTab} setMatchTab={setMatchTab} nexusProps={nexusProps} sideboardProps={sideboardProps} unofficialProps={unofficialProps} statsProps={statsProps} matchTabs={MATCH_TABS} seasonalTabs={SEASONAL_TABS}
				savedMatches={statMatches} savedStatus={savedStatus} eloHistory={shownHistory} eloHistoryLoading={eloHistoryLoading}
				season={season} seasonName={seasonName} seasons={seasons} seasonOptions={seasonOptions} onSeasonChange={changeSeason}
				syncing={syncing} syncError={syncError} onSync={handleSync} onRetry={() => loadSavedHistory(linkedPlayer.id)}
				eloVisible={eloVisible} onShowMore={() => setEloVisible(v => v + ELO_PAGE_SIZE)}
				matchChampions={rowPicks} onPick={setChampion} onScore={setScore} onNote={setNote} onNoteDone={flushNote} noteSave={noteSave} notesOff={notesOff} notesProps={notesProps}
				eventKeyFor={eventKeyFor} groupKeyFor={groupKeyFor} tournamentFor={tournamentFor}
				fillEvent={fillEvent} setFillEvent={setFillEvent}
				canLink={canLink} linking={linking} onToggleLink={toggleLink} eventLink={eventLink} onAddEvent={handleAddEvent}
				allPoints={eloHistory?.points ?? []} onPairRow={pairRow}
				dataMatches={dataMatches} dataAccounts={dataAccounts}
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
				{/* Avatar: the legend they last played, else their initials */}
				{lastLegend
					? <LegendIcon legend={lastLegend} size={48} borderColor={COLORS.borderHover} />
					: (
						<div style={{
							width: 48, height: 48, flexShrink: 0, background: COLORS.bgHover, border: `1px solid ${COLORS.borderHover}`,
							display: "flex", alignItems: "center", justifyContent: "center",
							fontSize: 16, fontWeight: 700, color: COLORS.textStrong, fontFamily: FONT_MONO,
						}}>{initials(user.username)}</div>
					)}

				{/* Info */}
				<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3, fontFamily: FONT_MONO }}>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<h1 style={{ fontSize: 16, fontWeight: 900, color: COLORS.accent, letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
							{user.username}
						</h1>
						{linkedPlayer && (
							<ProfileSwitcher accounts={accounts} activeId={activeId}
								onSelect={switchAccount}
								onRemove={removeAccount}
								onAdd={() => { setAddingAccount(true); setEloResults([]); setEloError(null); }} />
						)}
					</div>
					<div style={{ fontSize: 11, color: COLORS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
						{user.subtitle}
						{user.joined && <span style={{ color: COLORS.textDim }}> · Member since {user.joined}</span>}
					</div>
					{mostPlayed && (
						<div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, minWidth: 0 }}>
							<span style={{ fontSize: 9, letterSpacing: "0.14em", color: COLORS.textDim, flexShrink: 0 }}>MOST PLAYED</span>
							<span style={{ color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{legendLabel(mostPlayed.legend)}</span>
							<RuneIcons domains={mostPlayed.legend.domains} size={12} />
							<span style={{ color: COLORS.textDim, flexShrink: 0 }}>{mostPlayed.games} {mostPlayed.games === 1 ? "game" : "games"}</span>
						</div>
					)}
					{lastLegend && (
						<div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, minWidth: 0 }}>
							<span style={{ fontSize: 9, letterSpacing: "0.14em", color: COLORS.textDim, flexShrink: 0 }}>LAST PLAYED</span>
							<span style={{ color: COLORS.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{legendLabel(lastLegend)}</span>
							<RuneIcons domains={lastLegend.domains} size={12} />
						</div>
					)}
				</div>
				</div>
				<StatTiles stats={cardStats} season={cardSeason.season} ready={statsReady} />
			</div>

			{firstRun && <GetStarted guest={isGuest} />}
			{isGuest && !firstRun && <GuestNotice />}
			{carriedOver && <GuestNotice carried onSave={handleSaveHistory} saving={saving} />}

			{/* ── Player search (BoundRift) ── */}
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
					<div style={{ fontSize: 11, color: COLORS.text, letterSpacing: "0.1em", fontFamily: FONT_MONO }}>
						{addingAccount ? "Link another Riot account ID" : "Find your latest match history with your Riot account ID"}
					</div>
					{addingAccount && (
						<button onClick={() => { setAddingAccount(false); setEloResults([]); setEloQuery(""); setEloError(null); }}
							style={{ marginLeft: "auto", background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 10, letterSpacing: "0.12em", fontFamily: FONT_MONO }}>
							CANCEL
						</button>
					)}
				</div>

				<form onSubmit={handleEloSearch} style={{ display: "flex", gap: 6 }}>
					{/* The browser draws a placeholder faded and inline styles can't reach
					    ::placeholder, so the hint is an overlay in a readable colour. */}
					<span style={{ position: "relative", flex: 1, minWidth: 0, display: "flex" }}>
						<input
							type="text"
							aria-label="Riot account ID"
							value={eloQuery}
							onChange={e => setEloQuery(e.target.value)}
							onFocus={e => { e.target.style.borderColor = COLORS.accentDim; }}
							onBlur={e => { e.target.style.borderColor = COLORS.borderHover; }}
							style={{
								background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, borderRadius: 0,
								padding: "5px 8px", color: COLORS.textStrong, fontFamily: FONT_MONO, caretColor: COLORS.accent,
								fontSize: 12, width: "100%", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
							}}
						/>
						{!eloQuery && (
							<span aria-hidden="true" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: COLORS.textMuted, fontFamily: FONT_MONO, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", maxWidth: "calc(100% - 18px)", textOverflow: "ellipsis" }}>
								Enter your Riot account ID…
							</span>
						)}
					</span>
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
										{playerSummary(player)}
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
							{MATCH_TABS.map(([key, text]) => (
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
							{SEASONAL_TABS.includes(matchTab) && <SeasonSelect value={season ?? "all"} options={seasonOptions} onChange={changeSeason} />}
						</div>
						{matchTab === "nexus" ? (
							<NexusNight {...nexusProps} />
						) : matchTab === "notes" ? (
							<MatchNotes {...notesProps} />
						) : matchTab === "sideboard" ? (
							<SideboardNotes {...sideboardProps} />
						) : matchTab === "unofficial" ? (
							<UnofficialMatches {...unofficialProps} />
						) : matchTab === "data" ? (
							<MatchStats {...statsProps} season={season} seasonName={seasonName} seasons={seasons} />
						) : (<>
						{/* Current Elo + season from the rows shown, and Search to pull the latest from BoundRift. */}
						<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, fontFamily: FONT_MONO }}>
							<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.15em" }}>
								ELO
							</div>
							{/* The newest rated row — sealed events aren't rated */}
							{shownHistory?.points.findLast(p => p.elo_after != null) && (
								<div style={{ fontSize: 14, fontWeight: 700, color: COLORS.accent }}>
									{shownHistory.points.findLast(p => p.elo_after != null).elo_after}
								</div>
							)}
							<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.1em" }}>
								{seasonName.toUpperCase()}
							</div>
							<button onClick={handleSync} disabled={syncing || eloHistoryLoading}
								title="Load the latest matches for your Riot account ID"
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
									? `No matches found for this Riot account ID in ${seasonName}.`
									: `No saved matches in ${seasonName}. Click Search to load them for your Riot account ID.`}
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
											const key = `${linkedPlayer.id}:${m.match_id}`;
											const picks = rowPicks[key] || {};
											const noteOpen = openNotes.has(key);
											const unpaired = isUnpairedLegacy(m, eloHistory.points);
											// Consecutive matches from the same event (or, while it isn't
											// known, the same month) share one header row.
											const showHeader = i === 0 || groupKeyFor(m) !== groupKeyFor(recent[i - 1]);
											const endsGroup = i < recent.length - 1 && groupKeyFor(m) !== groupKeyFor(recent[i + 1]);
											return (
												<Fragment key={m.match_id}>
												{showHeader && (
													<TournamentHeader tournament={tournamentFor(m)} dateStr={playedLabel(m.date ?? m.month) || m.season}
														linking={linking === groupKeyFor(m)}
														onLink={canLink && tournamentFor(m) === null ? () => toggleLink(groupKeyFor(m)) : null} />
												)}
												{showHeader && linking === groupKeyFor(m) && (
													<EventLinkForm state={eventLink} onAdd={handleAddEvent} />
												)}
												{/* You | result + Elo | opponent | note. Equal side columns keep the result centred. */}
												<div
													style={{
														display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr) auto",
														alignItems: "center", columnGap: 16,
														height: 50, padding: "0 4px", background: COLORS.bg,
														border: `1px solid ${COLORS.border}`, borderTop: "none",
														marginBottom: endsGroup && !unpaired && !noteOpen ? 12 : 0,
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
													<NoteToggle open={noteOpen} note={picks.notes} onClick={() => toggleNote(key)} />
												</div>
												{noteOpen && (
													<div style={{
														padding: 8, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderTop: "none",
														marginBottom: endsGroup && !unpaired ? 12 : 0,
													}}>
														<NoteEditor value={picks.notes} onChange={text => setNote(m, text)} onBlur={() => flushNote(m)}
															state={noteSave[key]} isGuest={isGuest} disabled={notesOff} autoFocus />
													</div>
												)}
												{unpaired && (
													<SameMatch row={m} candidates={pairCandidates(eloHistory.points, m)} last={endsGroup}
														onPair={matchId => pairRow(m.match_id, matchId)} />
												)}
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
// Chip next to the username showing the active player account. The menu
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
				{active?.display_name ?? active?.id}
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
// Full-width row above each group of matches from the same event — or, while
// their event isn't known, the same month. Events found on BoundRift link to
// its page; ones saved before BoundRift only have a name. An event that wasn't
// found gets LINK EVENT (`onLink`), which opens the paste-a-link form below.

function TournamentHeader({ tournament, dateStr, onLink, linking }) {
	const label = tournament === undefined
		? "Looking up event…"
		: tournament
			? tournament.name
			: "Event not found";
	return (
		<div style={{
			display: "flex", alignItems: "center", gap: 8, height: 30, padding: "0 10px",
			background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 0,
			fontSize: 13, letterSpacing: "0.04em", fontFamily: FONT_MONO,
		}}>
			{tournament?.url ? (
				<a href={tournament.url} target="_blank" rel="noopener noreferrer"
					onMouseEnter={e => { e.currentTarget.style.textDecoration = "underline"; }}
					onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}
					style={{ color: COLORS.accent, fontWeight: 700, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
					{label}
				</a>
			) : tournament ? (
				<span style={{ color: COLORS.textStrong, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
			) : (
				<span style={{ color: COLORS.textDim, fontStyle: "italic" }}>{label}</span>
			)}
			{onLink && (
				<button onClick={onLink} aria-expanded={linking}
					onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accentDim; }}
					onMouseLeave={e => { e.currentTarget.style.borderColor = linking ? COLORS.accentDim : COLORS.border; }}
					style={{
						marginLeft: 8, padding: "2px 10px", background: linking ? COLORS.bgHover : "transparent", borderRadius: 0,
						border: `1px solid ${linking ? COLORS.accentDim : COLORS.border}`, color: COLORS.accent, cursor: "pointer",
						fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", flexShrink: 0,
					}}>
					{linking ? "CANCEL" : "LINK EVENT"}
				</button>
			)}
			<span style={{ color: COLORS.textDim, marginLeft: "auto", flexShrink: 0, fontSize: 11 }}>{dateStr}</span>
		</div>
	);
}

// ── Event link ───────────────────────────────────────────────────────────────
// Opens under an "Event not found" header. Events are only looked for at the
// stores the player is known to play at, so pasting one event from a new store
// links its matches and lets the lookup find that store's other events.

function EventLinkForm({ state, onAdd }) {
	const [link, setLink] = useState("");
	function submit(e) {
		e.preventDefault();
		onAdd(link);
	}
	const off = state.busy || !link.trim();
	return (
		<form onSubmit={submit} style={{ padding: "8px 10px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, borderTop: "none", fontFamily: FONT_MONO }}>
			<div style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 6 }}>
				Paste the link to the event these were played at, from PlayRiftbound, UVS or BoundRift &mdash; other events at the same store are then found too.
			</div>
			<div style={{ display: "flex", gap: 6 }}>
				<input type="url" value={link} onChange={e => setLink(e.target.value)} aria-label="Event link" autoFocus
					placeholder="https://events.playriftbound.com/en-US/events/…"
					onFocus={e => { e.target.style.borderColor = COLORS.accentDim; }}
					onBlur={e => { e.target.style.borderColor = COLORS.borderHover; }}
					style={{
						flex: 1, minWidth: 0, background: COLORS.bgRaised, border: `1px solid ${COLORS.borderHover}`, borderRadius: 0,
						padding: "5px 8px", color: COLORS.textStrong, fontFamily: FONT_MONO, fontSize: 12, outline: "none", caretColor: COLORS.accent,
					}} />
				<button type="submit" disabled={off} style={{
					background: off ? COLORS.border : COLORS.bgHover, border: `1px solid ${off ? COLORS.border : COLORS.accentDim}`, borderRadius: 0,
					padding: "5px 14px", color: off ? COLORS.textDim : COLORS.accent, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em",
					cursor: off ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0,
				}}>{state.busy ? "ADDING…" : "ADD EVENT"}</button>
			</div>
			{state.error && <div style={{ marginTop: 6, fontSize: 11, color: COLORS.loss }}>{state.error}</div>}
		</form>
	);
}

// ── Same match as… ───────────────────────────────────────────────────────────
// A strip under a row saved from EloShowdown that didn't pair with a BoundRift
// row — usually an opponent who has since renamed. SAME MATCH AS… lists the
// BoundRift rows it could be (same result and season, around the same time);
// picking one pairs them.

function SameMatch({ row, candidates, last, onPair }) {
	const [open, setOpen] = useState(false);
	return (
		<div style={{
			padding: "6px 10px", background: COLORS.bgRaised, border: `1px solid ${COLORS.border}`, borderTop: "none",
			marginBottom: last ? 12 : 0, fontFamily: FONT_MONO, fontSize: 11,
		}}>
			<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
				<span style={{ color: COLORS.textMuted, flex: 1, minWidth: 0 }}>
					Saved from EloShowdown &mdash; not matched to a BoundRift match{candidates.length ? "." : ", and none fits."}
				</span>
				{candidates.length > 0 && (
					<button onClick={() => setOpen(o => !o)} aria-expanded={open}
						onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accentDim; }}
						onMouseLeave={e => { e.currentTarget.style.borderColor = open ? COLORS.accentDim : COLORS.border; }}
						style={{
							padding: "2px 10px", background: open ? COLORS.bgHover : "transparent", borderRadius: 0, flexShrink: 0,
							border: `1px solid ${open ? COLORS.accentDim : COLORS.border}`, color: COLORS.accent, cursor: "pointer",
							fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em",
						}}>{open ? "CANCEL" : "SAME MATCH AS…"}</button>
				)}
			</div>
			{open && (
				<div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
					<span style={{ color: COLORS.textDim }}>Which BoundRift match is this game vs {row.opponent_name}? Opponents show their current name.</span>
					{candidates.map(c => (
						<button key={c.match_id} onClick={() => onPair(c.match_id)}
							onMouseEnter={e => { e.currentTarget.style.background = COLORS.bgHover; }}
							onMouseLeave={e => { e.currentTarget.style.background = COLORS.bg; }}
							style={{
								display: "flex", gap: 12, alignItems: "center", padding: "5px 8px", background: COLORS.bg, borderRadius: 0,
								border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: "pointer", fontFamily: FONT_MONO, fontSize: 11, textAlign: "left",
							}}>
							<span style={{ color: COLORS.textStrong, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
								vs {c.opponent_name}{c.event?.name && <span style={{ color: COLORS.textDim }}> · {c.event.name}</span>}
							</span>
							{c.score && <span>{c.score}</span>}
							<span style={{ color: COLORS.textDim, minWidth: 64, textAlign: "right" }}>{playedLabel(c.date ?? c.month) || c.season}</span>
						</button>
					))}
				</div>
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
