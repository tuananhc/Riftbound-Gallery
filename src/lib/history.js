// The profile's match rows, oldest first:
//   { match_id, date, month, season, result, opponent_name, opponent_id,
//     elo_before, elo_change, elo_after, score, event, legacy_id }
// Rows from BoundRift (ids "br-…", pulled by Search) know their month from May
// 2026 on, and get a date once the event they were played at is found. `event`
// is undefined until it's looked up, null when it wasn't found, else
// { id, name, url } — or just { name } on rows saved before BoundRift.
//
// Rows saved from EloShowdown before the switch keep EloShowdown's ids and Elo.
// Once BoundRift has the same match they're folded into its row, which takes
// over their date, event and picks; `legacy_id` remembers the saved row, so
// Save can mark it as replaced (lambda/saveMatchHistory.mjs). Pure functions.

import { compareChronological, isBoundriftId, seasonAt, seasonKey } from "./matchStats";

export const EVENT_URL = "https://boundrift.com/events";

const DAY_MS = 24 * 60 * 60 * 1000;
// How far before the previous pair an undated legacy row may pair — rounds in
// one event can be listed in either order — and how far after it.
const BEHIND = 8;
const AHEAD = 60;

export const byPlayed = (a, b) => compareChronological(
	{ id: a.match_id, at: a.date, month: a.month, season: a.season },
	{ id: b.match_id, at: b.date, month: b.month, season: b.season },
);

// Drop undefined fields, so spreading a row never blanks another's.
const defined = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

// Saved MatchHistory items → { history, picks }, picks keyed "accountId:matchId".
// Items replaced by a BoundRift row are skipped.
export function fromSaved(accountId, items) {
	const live = items.filter(m => !m.rekeyedTo);
	const points = live.map(m => defined({
		match_id: m.matchId,
		date: m.playedAt,
		month: m.month,
		season: seasonKey(m.season) ?? undefined,
		result: m.result.toLowerCase(),
		opponent_name: m.opponent,
		opponent_id: m.opponentId,
		elo_before: m.eloBefore,
		elo_change: m.eloChange,
		elo_after: m.eloAfter,
		event: m.eventId ? { id: m.eventId, name: m.eventName, url: `${EVENT_URL}/${m.eventId}` } : m.eventName ? { name: m.eventName } : undefined,
	}));
	const picks = Object.fromEntries(live
		.filter(m => m.myChampion || m.opponentChampion || m.score)
		.map(m => [`${accountId}:${m.matchId}`, { mine: m.myChampion, opponent: m.opponentChampion, score: m.score }]));
	return { history: { points: foldLegacy(points).sort(byPlayed) }, picks };
}

// The saved items worth counting in stats: not replaced by a BoundRift row,
// and not a legacy row a saved BoundRift row has taken over (both stay stored
// until a save marks the legacy one replaced).
export function liveItems(accountId, items) {
	const folded = new Set(fromSaved(accountId, items).history.points.map(p => p.legacy_id).filter(Boolean));
	return items.filter(m => !m.rekeyedTo && !folded.has(m.matchId));
}

// Lay BoundRift's rows over the ones on the page: its fields win, what the page
// learned (date, event, legacy_id) stays, and rows it no longer returns are
// kept. → the merged history.
export function mergeHistory(current, fresh) {
	const byId = new Map((current?.points ?? []).map(p => [String(p.match_id), p]));
	for (const p of fresh) {
		const id = String(p.match_id);
		byId.set(id, { ...byId.get(id), ...p });
	}
	return { points: foldLegacy([...byId.values()]).sort(byPlayed) };
}

// The picks a BoundRift row shows include those made on the legacy row folded
// into it (picks are keyed by match id, so they stay under the legacy id);
// picks made on the BoundRift row itself win.
export function withLegacyPicks(picks, points, accountId) {
	let out = picks;
	for (const p of points) {
		const old = p.legacy_id && picks[`${accountId}:${p.legacy_id}`];
		if (!old) continue;
		if (out === picks) out = { ...picks };
		out[`${accountId}:${p.match_id}`] = { ...old, ...defined(picks[`${accountId}:${p.match_id}`] ?? {}) };
	}
	return out;
}

// Fold each legacy row into the BoundRift row for the same match, which takes
// the legacy row's date and event when it has none. A legacy row BoundRift
// doesn't have takes on the event of a BoundRift row from the same event, so
// they share a header.
function foldLegacy(points) {
	const legacy = points.filter(p => !isBoundriftId(p.match_id)).sort(byPlayed);
	const rows = points.filter(p => isBoundriftId(p.match_id) && !p.legacy_id);
	if (!legacy.length) return points;
	const pairs = rows.length ? pairLegacy(legacy, rows) : [];
	const folded = new Map(pairs.map(([l, r]) => [r.match_id, { ...r, legacy_id: l.match_id, date: r.date ?? l.date, event: r.event ?? l.event }]));
	const gone = new Set(pairs.map(([l]) => l.match_id));
	const linked = points.filter(p => isBoundriftId(p.match_id) && p.event?.id);
	return points.filter(p => !gone.has(p.match_id)).map(p => {
		if (folded.has(p.match_id)) return folded.get(p.match_id);
		const same = !isBoundriftId(p.match_id) && !p.event?.id && linked.find(r => sameEvent(r, p));
		return same ? { ...p, event: same.event, date: same.date } : p;
	});
}

const near = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) <= DAY_MS;
// Two rows from one event: the same event id when both know it, else the same
// event name within a day. Rows saved before the save Lambda kept event ids
// (and legacy rows) only know the name.
function sameEvent(row, l) {
	if (!row.event || !l.event) return false;
	if (row.event.id && l.event.id) return row.event.id === l.event.id;
	return sameName(row.event.name, l.event.name) && near(row.date, l.date);
}

const norm = s => (s ?? "").trim().toLowerCase();
const squash = s => norm(s).replace(/[^\p{L}\p{N}]/gu, "");
// Parts of 4+ letters, for opponents who've renamed since ("Fennir P" → "BigTailFennir").
const nameParts = s => norm(s).split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 4);
const sameName = (a, b) => norm(a) === norm(b);
const likeName = (a, b) => nameParts(a).some(w => squash(b).includes(w)) || nameParts(b).some(w => squash(a).includes(w));

// The months within a day of an ISO date: a match's month and its event's start
// can fall either side of midnight UTC.
function monthsAround(date) {
	const t = Date.parse(date);
	if (Number.isNaN(t)) return [];
	return [...new Set([-1, 0, 1].map(d => new Date(t + d * DAY_MS).toISOString().slice(0, 7)))];
}

// Legacy row → the BoundRift row for the same match, as [[legacy, row]]. Both
// lists are oldest first but with different ids, so a pair is the same season,
// result and opponent: within the month it was played when BoundRift has that
// month (May 2026 on), else close after the previous pair. A second pass pairs
// opponents who've renamed since, between the pairs either side. BoundRift
// shows an opponent's current name, so one renamed to something else entirely
// ("SDPhantom" → "Kin") only pairs in the third pass: once the event is known,
// a legacy row from it pairs with the event's one unpaired row of the same
// result — if it's the event's only unpaired legacy row with that result too.
function pairLegacy(legacy, rows) {
	const lists = new Map();
	for (const r of rows) {
		if (!lists.has(r.season)) lists.set(r.season, []);
		lists.get(r.season).push(r);
	}
	const seasonOf = legacy.map(l => seasonKey(l.season) ?? seasonAt(l.date));
	const pairOf = new Map();
	const used = new Set();

	// Where in its season's list the nearest paired legacy row before / after `li` landed.
	function bounds(li, list) {
		const at = k => list.indexOf(pairOf.get(k));
		let lo = -1;
		let hi = null;
		for (let k = li - 1; k >= 0; k--) if (seasonOf[k] === seasonOf[li] && pairOf.has(k)) { lo = at(k); break; }
		for (let k = li + 1; k < legacy.length; k++) if (seasonOf[k] === seasonOf[li] && pairOf.has(k)) { hi = at(k); break; }
		return [Math.max(0, lo - BEHIND), Math.min(list.length, hi == null ? lo + 1 + AHEAD : hi + BEHIND)];
	}

	for (const match of [sameName, likeName]) {
		legacy.forEach((l, li) => {
			if (pairOf.has(li)) return;
			const list = lists.get(seasonOf[li]) ?? [];
			const fits = r => !used.has(r) && r.result === l.result && match(r.opponent_name, l.opponent_name);
			const months = monthsAround(l.date);
			const hit = list.some(r => months.includes(r.month))
				? list.find(r => months.includes(r.month) && fits(r))
				: list.slice(...bounds(li, list)).find(r => !r.month && fits(r));
			if (hit) {
				used.add(hit);
				pairOf.set(li, hit);
			}
		});
	}

	const unpaired = legacy.filter((_, li) => !pairOf.has(li));
	legacy.forEach((l, li) => {
		if (pairOf.has(li)) return;
		const options = rows.filter(r => !used.has(r) && r.result === l.result && sameEvent(r, l));
		if (options.length !== 1) return;
		const rivals = unpaired.filter(o => o.result === l.result && sameEvent(options[0], o));
		if (rivals.length !== 1) return;
		used.add(options[0]);
		pairOf.set(li, options[0]);
	});
	return [...pairOf].map(([li, r]) => [legacy[li], r]);
}

// A legacy row still on the page once BoundRift's rows are in: one that didn't
// pair, which the user can pair by hand.
export const isUnpairedLegacy = (p, points) => !isBoundriftId(p.match_id) && points.some(r => isBoundriftId(r.match_id));

// The BoundRift rows a legacy row could be, for pairing by hand: not paired
// yet, the same result and season, played around the same time (or with no
// date to tell). Rows from its event first, then dated rows nearest in time,
// then rows that only know their month, newest first (as History lists them).
export function pairCandidates(points, l) {
	const at = Date.parse(l.date);
	const months = monthsAround(l.date);
	const gap = r => (r.date ? Math.abs(Date.parse(r.date) - at) : Infinity);
	return points
		.filter(r => isBoundriftId(r.match_id) && !r.legacy_id && r.result === l.result && r.season === seasonKey(l.season)
			&& (r.date ? gap(r) <= 3 * DAY_MS : !r.month || months.includes(r.month)))
		.sort((a, b) => Number(sameEvent(b, l)) - Number(sameEvent(a, l)) || gap(a) - gap(b) || byPlayed(b, a));
}

// Pair a legacy row with the BoundRift row the user says it is — the same as
// an automatic pair: the BoundRift row takes its place, picks and event.
export function pairByHand(history, legacyId, matchId) {
	const l = history?.points.find(p => p.match_id === legacyId);
	if (!l) return history;
	return {
		...history,
		points: history.points
			.filter(p => p.match_id !== legacyId)
			.map(p => (p.match_id === matchId ? { ...p, legacy_id: legacyId, date: p.date ?? l.date, event: p.event ?? l.event } : p))
			.sort(byPlayed),
	};
}

// A BoundRift row whose event hasn't been looked up yet. Only rows that know
// their month can be: the lookup searches a month at a time.
export const needsLookup = p => isBoundriftId(p.match_id) && p.event === undefined && Boolean(p.month);

// Put found events on their rows — the event's start becomes the row's date —
// and mark rows in the searched `months` that weren't found as null. Knowing
// the events can pair more legacy rows (see pairLegacy), so they're folded again.
export function applyEvents(history, found, months = []) {
	if (!history) return history;
	const searched = new Set(months);
	const points = history.points.map(p => {
		const event = found[p.match_id];
		if (event) return { ...p, event: { id: event.id, name: event.name, url: event.url }, date: event.date };
		return needsLookup(p) && searched.has(p.month) ? { ...p, event: null } : p;
	});
	return { ...history, points: foldLegacy(points).sort(byPlayed) };
}

// Rows whose event wasn't found go back to waiting for a lookup — after the
// lookup learns a new store.
export function retryMissing(history) {
	if (!history) return history;
	return {
		...history,
		points: history.points.map(p => (p.event === null && isBoundriftId(p.match_id) && p.month ? { ...p, event: undefined } : p)),
	};
}

// What the event lookup learns stores from: ids of events rows already link
// to, and { name, date } of events without an id — drafts first, then rows
// saved before BoundRift — newest first either way.
export function lookupHints(points, drafts) {
	const newest = [...points].reverse();
	const events = [...new Set(newest.map(p => p.event?.id).filter(Boolean))].slice(0, 20);
	const seeds = drafts.filter(d => d.eventName?.trim()).slice(0, 3).map(d => ({ name: d.eventName, date: d.date }));
	const seen = new Set();
	for (const p of newest) {
		if (p.event?.id || !p.event?.name || !p.date) continue;
		const key = `${p.event.name}|${p.date.slice(0, 10)}`;
		if (!seen.has(key)) {
			seen.add(key);
			seeds.push({ name: p.event.name, date: p.date });
		}
	}
	return { events, seeds: seeds.slice(0, 8) };
}

// Rows from one event share a key: the event's id, else its name and day, else
// the day. A row with none of those is an event of its own.
export function eventKey(p) {
	const day = p.date?.slice(0, 10);
	if (p.event?.id) return `event:${p.event.id}`;
	if (p.event?.name && day) return `named:${p.event.name}|${day}`;
	if (day) return `day:${day}`;
	return `match:${p.match_id}`;
}

// Rows that share a header: one event — or, while a row's event isn't known,
// the month (else season) it was played in.
export function groupKey(p) {
	const key = eventKey(p);
	if (!key.startsWith("match:")) return key;
	return p.month ? `month:${p.month}` : `season:${p.season}`;
}

// The line under a player search result: "Yingxin L · 92 events · Master Yi".
export function playerSummary(player) {
	return [
		player.real_name !== player.display_name && player.real_name,
		player.event_count != null && `${player.event_count} event${player.event_count === 1 ? "" : "s"}`,
		player.legend?.split(",")[0],
	].filter(Boolean).join(" · ");
}

// BoundRift's game score fills any row whose score was never set — a score
// cleared on purpose is null, not missing, and stays clear.
export function withSourceScores(picks, points, accountId) {
	const out = { ...picks };
	for (const p of points) {
		const key = `${accountId}:${p.match_id}`;
		if (p.score && out[key]?.score === undefined) out[key] = { ...out[key], score: p.score };
	}
	return out;
}
