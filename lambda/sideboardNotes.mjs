// Sideboard notes — one per matchup (your legend vs the opponent's): which
// cards to bring in and take out, and how to play it, separately for when
// you're on the play and on the draw.
//
//   GET    /sideboard[?cursor=<token>]               → { notes: [...], nextCursor }
//   PUT    /sideboard                                → the stored note (whole-item replace)
//   DELETE /sideboard?myLegend=<id>&oppLegend=<id>   → 204
//
// Legend ids are card ids like "OGN-123/300", so they travel in the body and
// query string rather than the path.
//
// Fronted by API Gateway (HTTP API) with a Cognito JWT authorizer. The userId is
// derived from the verified token, NEVER from the request.
//
// Notes live in the MatchHistory table beside the user's matches, under their
// own sort-key prefix, so no new table (or CI permission) is needed:
//   userId            PK — Cognito sub
//   accountMatchId    SK — "~side#<myLegend>|<oppLegend>". Official items are
//                     "<eloPlayerId>#<matchId>", drafts "~draft#…" and
//                     unofficial matches "~unofficial#…"; account ids can't
//                     start with "~", so none overlap.
//   myLegend          your legend (card id)
//   oppLegend         the opponent's legend (card id)
//   play / draw       { in: [{ id, name, count }], out: [...], plan } — the
//                     swaps and plan on the play and on the draw; empty parts
//                     are left out
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
const HISTORY_TABLE = process.env.DYNAMODB_TABLE_HISTORY;

const PREFIX = "~side#";
const PAGE_SIZE = 100;
const MAX_ID = 64;
const MAX_NAME = 120;
const MAX_PLAN = 2000;
const MAX_CARDS = 20; // per IN / OUT list
const MAX_COPIES = 3;
const SIDES = ["play", "draw"];
// Attributes returned to the client — the keys and owner stay server-side.
const FIELDS = ["myLegend", "oppLegend", "play", "draw", "updatedAt"];

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

const keyFor = (userId, myLegend, oppLegend) => ({ userId, accountMatchId: `${PREFIX}${myLegend}|${oppLegend}` });
const publicNote = item => Object.fromEntries(FIELDS.filter(f => item[f] !== undefined).map(f => [f, item[f]]));

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
			await ddb.send(new DeleteCommand({ TableName: HISTORY_TABLE, Key: keyFor(userId, myLegend, oppLegend) }));
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
		if (startKey?.userId !== userId || typeof startKey.accountMatchId !== "string" || !startKey.accountMatchId.startsWith(PREFIX)) {
			return json(400, { error: "Invalid cursor." });
		}
	}
	let page;
	try {
		page = await ddb.send(new QueryCommand({
			TableName: HISTORY_TABLE,
			KeyConditionExpression: "userId = :u AND begins_with(accountMatchId, :p)",
			ExpressionAttributeValues: { ":u": userId, ":p": PREFIX },
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
	return json(200, { notes: (page.Items ?? []).map(publicNote), nextCursor });
}

// { in, out, plan } with only the parts that hold something, or an error string.
function side(raw, label) {
	if (raw == null) return {};
	if (typeof raw !== "object") return `\`${label}\` must be an object.`;
	const out = {};
	for (const list of ["in", "out"]) {
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
	const oppLegend = legendId(body.oppLegend);
	if (!myLegend || !oppLegend) return json(400, { error: "Body must include `myLegend` and `oppLegend`." });

	const item = { ...keyFor(userId, myLegend, oppLegend), myLegend, oppLegend, updatedAt: new Date().toISOString() };
	for (const s of SIDES) {
		const parsed = side(body[s], s);
		if (typeof parsed === "string") return json(400, { error: parsed });
		if (Object.keys(parsed).length) item[s] = parsed;
	}
	try {
		await ddb.send(new PutCommand({ TableName: HISTORY_TABLE, Item: item }));
	} catch (err) {
		console.error("save sideboard note failed", err);
		return json(500, { error: "Failed to save the note." });
	}
	return json(200, publicNote(item));
}
