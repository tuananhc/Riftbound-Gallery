// Nexus Night drafts — games logged at a local event as they're played, before
// UVS / EloShowdown publish the results. Once the real matches arrive, the
// profile matches each drafted game to its row and fills in the picks.
//
//   GET    /drafts[?cursor=<token>]  → { drafts: [...], nextCursor }
//   PUT    /drafts/{draftId}         → the stored draft (whole-item replace)
//   DELETE /drafts/{draftId}         → 204
//
// Fronted by API Gateway (HTTP API) with a Cognito JWT authorizer. The userId is
// derived from the verified token, NEVER from the request.
//
// Drafts live in the MatchHistory table beside the user's matches, under their
// own sort-key prefix, so no new table (or CI permission) is needed:
//   userId            PK — Cognito sub
//   accountMatchId    SK — "~draft#<draftId>". Match items are
//                     "<eloPlayerId>#<matchId>" and history reads Query
//                     begins_with "<eloPlayerId>#"; account ids can't start
//                     with "~", so the two never overlap.
//   draftId           client-generated id ([A-Za-z0-9_-], ≤ 64 chars)
//   eloPlayerId       EloShowdown account the event was played on
//   eventName         e.g. "Nexus Night @ Zen"
//   date              YYYY-MM-DD the event was played
//   games             [{ id, opponent, myChampion, opponentChampion, result,
//                       score }] in round order; result WIN | LOSS | DRAW
//   createdAt / updatedAt  ISO timestamps
//
// Drafts are the user's own data, so like match items they never expire (no
// ttl); the GET is bounded with Query Limit + LastEvaluatedKey pagination.
// Empty strings / nulls are stripped before writing.
//
// Deployed by infra/backend.yml on every push to master — don't change the
// function's settings in the console.
//   - Function riftbound-match-drafts, routes GET /drafts, PUT and DELETE /drafts/{draftId}.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const HISTORY_TABLE = process.env.DYNAMODB_TABLE_HISTORY;

export const DRAFT_PREFIX = "~draft#";
const PAGE_SIZE = 100;
const MAX_GAMES = 20;
const MAX_TEXT = 200;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RESULTS = new Set(["WIN", "LOSS", "DRAW"]);
// Matches SCORES in src/lib/matchStats.js.
const SCORES = {
	WIN: ["2-0", "2-1", "1-0"],
	LOSS: ["0-2", "1-2", "0-1"],
	DRAW: ["1-1", "0-0"],
};
// Attributes returned to the client — the keys and owner stay server-side.
const FIELDS = ["draftId", "eloPlayerId", "eventName", "date", "games", "createdAt", "updatedAt"];

function json(statusCode, body) {
	return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function text(v, max = MAX_TEXT) {
	if (typeof v === "number") v = String(v);
	if (typeof v !== "string") return undefined;
	const t = v.trim().slice(0, max);
	return t || undefined;
}

// Drop undefined / null / "" so nothing empty is stored.
function clean(obj) {
	return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

const publicDraft = item => Object.fromEntries(FIELDS.filter(f => item[f] !== undefined).map(f => [f, item[f]]));

export const handler = async (event) => {
	// Identity comes from the verified JWT, never the request.
	const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
	if (!userId) return json(401, { error: "Unauthorized" });

	const method = event.requestContext?.http?.method;
	if (method === "GET") return list(userId, event.queryStringParameters ?? {});

	const draftId = event.pathParameters?.draftId;
	if (!ID_PATTERN.test(draftId ?? "")) return json(400, { error: "Invalid draft id." });
	const Key = { userId, accountMatchId: `${DRAFT_PREFIX}${draftId}` };

	if (method === "DELETE") {
		try {
			await ddb.send(new DeleteCommand({ TableName: HISTORY_TABLE, Key }));
			return { statusCode: 204 };
		} catch (err) {
			console.error("delete draft failed", err);
			return json(500, { error: "Failed to delete the draft." });
		}
	}
	if (method === "PUT") return put(Key, draftId, event.body);
	return json(405, { error: "Method not allowed." });
};

async function list(userId, params) {
	// The cursor is the previous page's LastEvaluatedKey; it must point inside
	// this caller's drafts or it's rejected.
	let startKey;
	if (params.cursor) {
		try {
			startKey = JSON.parse(Buffer.from(params.cursor, "base64url").toString("utf8"));
		} catch {
			return json(400, { error: "Invalid cursor." });
		}
		if (startKey?.userId !== userId || typeof startKey.accountMatchId !== "string" || !startKey.accountMatchId.startsWith(DRAFT_PREFIX)) {
			return json(400, { error: "Invalid cursor." });
		}
	}
	let page;
	try {
		page = await ddb.send(new QueryCommand({
			TableName: HISTORY_TABLE,
			KeyConditionExpression: "userId = :u AND begins_with(accountMatchId, :p)",
			ExpressionAttributeValues: { ":u": userId, ":p": DRAFT_PREFIX },
			Limit: PAGE_SIZE,
			ExclusiveStartKey: startKey,
		}));
	} catch (err) {
		console.error("load drafts failed", err);
		return json(500, { error: "Failed to load drafts." });
	}
	const nextCursor = page.LastEvaluatedKey
		? Buffer.from(JSON.stringify(page.LastEvaluatedKey)).toString("base64url")
		: null;
	return json(200, { drafts: (page.Items ?? []).map(publicDraft), nextCursor });
}

async function put(Key, draftId, rawBody) {
	let body;
	try {
		body = JSON.parse(rawBody || "{}");
	} catch {
		return json(400, { error: "Body must be JSON." });
	}
	const eloPlayerId = text(body.eloPlayerId);
	if (!eloPlayerId || eloPlayerId.includes("#")) return json(400, { error: "Body must include the `eloPlayerId` the event was played on." });
	const date = text(body.date, 10);
	if (!date || !DATE_PATTERN.test(date)) return json(400, { error: "`date` must be YYYY-MM-DD." });
	if (!Array.isArray(body.games) || body.games.length > MAX_GAMES) return json(400, { error: `\`games\` must be a list of at most ${MAX_GAMES}.` });

	const games = [];
	for (const g of body.games) {
		const id = text(g?.id, 64);
		if (!id || !ID_PATTERN.test(id)) return json(400, { error: "Every game needs an `id`." });
		const result = text(g.result)?.toUpperCase();
		if (result && !RESULTS.has(result)) return json(400, { error: `Invalid result "${result}".` });
		const score = text(g.score, 3);
		if (score && (!result || !SCORES[result].includes(score))) return json(400, { error: `Invalid score "${score}" for ${result ?? "no result"}.` });
		games.push(clean({
			id,
			opponent: text(g.opponent),
			myChampion: text(g.myChampion),
			opponentChampion: text(g.opponentChampion),
			result,
			score,
		}));
	}

	const now = new Date().toISOString();
	const item = clean({
		...Key,
		draftId,
		eloPlayerId,
		eventName: text(body.eventName),
		date,
		games,
		createdAt: text(body.createdAt, 40) ?? now,
		updatedAt: now,
	});
	try {
		await ddb.send(new PutCommand({ TableName: HISTORY_TABLE, Item: item }));
	} catch (err) {
		console.error("save draft failed", err);
		return json(500, { error: "Failed to save the draft." });
	}
	return json(200, publicDraft(item));
}
