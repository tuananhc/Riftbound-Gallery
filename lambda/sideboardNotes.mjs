// Sideboard notes — one per matchup (your legend vs the opponent's): the
// battlefield to choose and how to play it in game 1 (blind, main deck), and
// for games 2–3 on the play and on the draw, the battlefield, the cards to
// bring in and take out, and the plan. Plus, per legend, the three
// battlefields you bring with it, which each game's battlefield comes from.
//
//   GET    /sideboard[?cursor=<token>]               → { notes: [...], battlefields: [...], nextCursor }
//   PUT    /sideboard                                → the stored note or battlefield set (whole-item replace)
//                                                       body { myLegend, oppLegend, blind, play, draw }
//                                                       or   { myLegend, battlefields: [id, id, id] }
//   DELETE /sideboard?myLegend=<id>&oppLegend=<id>   → 204
//
// Legend ids are card ids like "OGN-123/300", so they travel in the body and
// query string rather than the path.
//
// Fronted by API Gateway (HTTP API) with a Cognito JWT authorizer. The userId is
// derived from the verified token, NEVER from the request.
//
// Everything lives in the SideboardNotes table (infra/backend.yml):
//   userId            PK — Cognito sub
//   noteKey           SK — "<myLegend>|<oppLegend>" for a note, and
//                     "bf#<myLegend>" for a legend's battlefields (legend ids
//                     can't hold "|" or "#", so the two never meet)
//   myLegend          your legend (card id)
//   oppLegend         the opponent's legend (card id)
//   blind             { battlefield, plan } — game 1, main deck, so no swaps
//   play / draw       { battlefield, in: [{ id, name, count }], out: [...], plan }
//                     — games 2–3 on the play and on the draw; empty parts are
//                     left out
//   battlefields      (battlefield-set items only) your three battlefield card ids
//   updatedAt         ISO timestamp of the last write
//
// Notes are the user's own data, so they never expire (no ttl); the GET is
// bounded with Query Limit + LastEvaluatedKey pagination. Empty strings / nulls
// are stripped before writing.
//
// Deployed by infra/backend.yml on every push to master — don't change the
// function's settings in the console.
//   - Function riftbound-sideboard-notes, routes GET, PUT and DELETE /sideboard.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.DYNAMODB_TABLE_SIDEBOARD;

const PAGE_SIZE = 100;
const MAX_ID = 64;
const MAX_NAME = 120;
const MAX_PLAN = 2000;
const MAX_CARDS = 20; // per IN / OUT list
const MAX_COPIES = 3;
const BF_PREFIX = "bf#";
const MAX_BATTLEFIELDS = 3;
// Game 1 is played blind with the main deck: a battlefield and a plan, no swaps.
const GAMES = [["blind", false], ["play", true], ["draw", true]];
// Attributes returned to the client — the keys and owner stay server-side.
const FIELDS = ["myLegend", "oppLegend", "blind", "play", "draw", "updatedAt"];
const BF_FIELDS = ["myLegend", "battlefields", "updatedAt"];

function json(statusCode, body) {
	return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function text(v, max) {
	if (typeof v !== "string") return undefined;
	const t = v.trim().slice(0, max);
	return t || undefined;
}

// A legend id usable in the sort key: no "|" (the separator) or "#".
function legendId(v) {
	const id = text(v, MAX_ID);
	return id && !/[|#]/.test(id) ? id : undefined;
}

const keyFor = (userId, myLegend, oppLegend) => ({ userId, noteKey: `${myLegend}|${oppLegend}` });
const pick = (item, fields) => Object.fromEntries(fields.filter(f => item[f] !== undefined).map(f => [f, item[f]]));
const publicNote = item => pick(item, FIELDS);

export const handler = async (event) => {
	// Identity comes from the verified JWT, never the request.
	const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
	if (!userId) return json(401, { error: "Unauthorized" });

	const method = event.requestContext?.http?.method;
	if (method === "GET") return list(userId, event.queryStringParameters ?? {});
	if (method === "PUT") return put(userId, event.body);
	if (method === "DELETE") {
		const params = event.queryStringParameters ?? {};
		const myLegend = legendId(params.myLegend);
		const oppLegend = legendId(params.oppLegend);
		if (!myLegend || !oppLegend) return json(400, { error: "Query must include `myLegend` and `oppLegend`." });
		try {
			await ddb.send(new DeleteCommand({ TableName: TABLE, Key: keyFor(userId, myLegend, oppLegend) }));
			return { statusCode: 204 };
		} catch (err) {
			console.error("delete sideboard note failed", err);
			return json(500, { error: "Failed to delete the note." });
		}
	}
	return json(405, { error: "Method not allowed." });
};

async function list(userId, params) {
	// The cursor is the previous page's LastEvaluatedKey; it must point inside
	// this caller's notes or it's rejected.
	let startKey;
	if (params.cursor) {
		try {
			startKey = JSON.parse(Buffer.from(params.cursor, "base64url").toString("utf8"));
		} catch {
			return json(400, { error: "Invalid cursor." });
		}
		if (startKey?.userId !== userId || typeof startKey.noteKey !== "string") {
			return json(400, { error: "Invalid cursor." });
		}
	}
	let page;
	try {
		page = await ddb.send(new QueryCommand({
			TableName: TABLE,
			KeyConditionExpression: "userId = :u",
			ExpressionAttributeValues: { ":u": userId },
			Limit: PAGE_SIZE,
			ExclusiveStartKey: startKey,
		}));
	} catch (err) {
		console.error("load sideboard notes failed", err);
		return json(500, { error: "Failed to load sideboard notes." });
	}
	const nextCursor = page.LastEvaluatedKey
		? Buffer.from(JSON.stringify(page.LastEvaluatedKey)).toString("base64url")
		: null;
	const items = page.Items ?? [];
	const isSet = item => item.noteKey.startsWith(BF_PREFIX);
	return json(200, {
		notes: items.filter(item => !isSet(item)).map(publicNote),
		battlefields: items.filter(isSet).map(item => pick(item, BF_FIELDS)),
		nextCursor,
	});
}

// { battlefield, in, out, plan } with only the parts that hold something, or an
// error string. `swaps` is false for game 1, which can't change cards.
function side(raw, label, swaps) {
	if (raw == null) return {};
	if (typeof raw !== "object") return `\`${label}\` must be an object.`;
	const out = {};
	const battlefield = text(raw.battlefield, MAX_ID);
	if (battlefield) out.battlefield = battlefield;
	if (!swaps) {
		if (raw.in?.length || raw.out?.length) return `\`${label}\` is played with the main deck and can't bring cards in or out.`;
	} else for (const list of ["in", "out"]) {
		const cards = raw[list] ?? [];
		if (!Array.isArray(cards) || cards.length > MAX_CARDS) return `\`${label}.${list}\` must be a list of at most ${MAX_CARDS} cards.`;
		const clean = [];
		for (const c of cards) {
			const id = text(c?.id, MAX_ID);
			const count = Number(c?.count);
			if (!id || !Number.isInteger(count) || count < 1 || count > MAX_COPIES) {
				return `Every card in \`${label}.${list}\` needs an \`id\` and a \`count\` from 1 to ${MAX_COPIES}.`;
			}
			const name = text(c.name, MAX_NAME);
			clean.push(name ? { id, name, count } : { id, count });
		}
		if (clean.length) out[list] = clean;
	}
	const plan = text(raw.plan, MAX_PLAN);
	if (plan) out.plan = plan;
	return out;
}

async function put(userId, rawBody) {
	let body;
	try {
		body = JSON.parse(rawBody || "{}");
	} catch {
		return json(400, { error: "Body must be JSON." });
	}
	const myLegend = legendId(body.myLegend);
	if (!myLegend) return json(400, { error: "Body must include `myLegend`." });
	if (body.battlefields !== undefined) return putBattlefields(userId, myLegend, body.battlefields);
	const oppLegend = legendId(body.oppLegend);
	if (!oppLegend) return json(400, { error: "Body must include `oppLegend`." });

	const item = { ...keyFor(userId, myLegend, oppLegend), myLegend, oppLegend, updatedAt: new Date().toISOString() };
	for (const [s, swaps] of GAMES) {
		const parsed = side(body[s], s, swaps);
		if (typeof parsed === "string") return json(400, { error: parsed });
		if (Object.keys(parsed).length) item[s] = parsed;
	}
	try {
		await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
	} catch (err) {
		console.error("save sideboard note failed", err);
		return json(500, { error: "Failed to save the note." });
	}
	return json(200, publicNote(item));
}

// The three battlefields you bring with a legend. An empty list deletes the set.
async function putBattlefields(userId, myLegend, raw) {
	const battlefields = Array.isArray(raw) ? [...new Set(raw.map(id => text(id, MAX_ID)).filter(Boolean))] : null;
	if (!battlefields || battlefields.length > MAX_BATTLEFIELDS) return json(400, { error: `\`battlefields\` must be a list of at most ${MAX_BATTLEFIELDS} card ids.` });
	const Key = { userId, noteKey: `${BF_PREFIX}${myLegend}` };
	try {
		if (!battlefields.length) {
			await ddb.send(new DeleteCommand({ TableName: TABLE, Key }));
			return json(200, { myLegend, battlefields: [] });
		}
		const item = { ...Key, myLegend, battlefields, updatedAt: new Date().toISOString() };
		await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
		return json(200, pick(item, BF_FIELDS));
	} catch (err) {
		console.error("save battlefields failed", err);
		return json(500, { error: "Failed to save your battlefields." });
	}
}
