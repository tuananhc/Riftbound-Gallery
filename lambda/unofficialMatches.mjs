// Unofficial matches — games the user logs by hand that BoundRift never sees:
// online games, friendlies, testing. They're kept apart from the official
// history, and the Data tab only counts them when the user asks it to.
//
//   GET    /unofficial[?cursor=<token>]  → { matches: [...], nextCursor }
//   PUT    /unofficial/{matchId}         → the stored match (whole-item replace)
//   DELETE /unofficial/{matchId}         → 204
//
// Fronted by API Gateway (HTTP API) with a Cognito JWT authorizer. The userId is
// derived from the verified token, NEVER from the request.
//
// Matches live in the MatchHistory table beside the user's official matches,
// under their own sort-key prefix, so no new table (or CI permission) is needed:
//   userId            PK — Cognito sub
//   accountMatchId    SK — "~unofficial#<matchId>". Official items are
//                     "<eloPlayerId>#<matchId>" and drafts "~draft#<draftId>";
//                     account ids can't start with "~", so none overlap.
//   matchId           client-generated id ([A-Za-z0-9_-], ≤ 64 chars)
//   eloPlayerId       linked account the match is logged under (see userProfile.mjs)
//   date              YYYY-MM-DD the match was played
//   type              ONLINE | FRIENDLY | OTHER
//   opponent          opponent's name, as typed
//   myChampion        your legend (card id)
//   opponentChampion  opponent's legend (card id)
//   result            WIN | LOSS | DRAW — absent until picked
//   score             final game score, yours first — one of SCORES[result]
//   notes             free-text notes (max 2000 chars)
//   createdAt / updatedAt  ISO timestamps
//
// Like official matches they're the user's own data, so they never expire (no
// ttl); the GET is bounded with Query Limit + LastEvaluatedKey pagination.
// Empty strings / nulls are stripped before writing.
//
// Deployed by infra/backend.yml on every push to master — don't change the
// function's settings in the console.
//   - Function riftbound-unofficial-matches, routes GET /unofficial, PUT and
//     DELETE /unofficial/{matchId}.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const HISTORY_TABLE = process.env.DYNAMODB_TABLE_HISTORY;

const PREFIX = "~unofficial#";
const PAGE_SIZE = 200;
const MAX_TEXT = 200;
const MAX_NOTES = 2000; // matches saveMatchHistory.mjs
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RESULTS = new Set(["WIN", "LOSS", "DRAW"]);
const TYPES = new Set(["ONLINE", "FRIENDLY", "OTHER"]);
// Matches SCORES in src/lib/matchStats.js.
const SCORES = {
	WIN: ["2-0", "2-1", "1-0"],
	LOSS: ["0-2", "1-2", "0-1"],
	DRAW: ["1-1", "0-0"],
};
// Attributes returned to the client — the keys and owner stay server-side.
const FIELDS = [
	"matchId", "eloPlayerId", "date", "type", "opponent", "myChampion", "opponentChampion",
	"result", "score", "notes", "createdAt", "updatedAt",
];

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

const publicMatch = item => Object.fromEntries(FIELDS.filter(f => item[f] !== undefined).map(f => [f, item[f]]));

export const handler = async (event) => {
	// Identity comes from the verified JWT, never the request.
	const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
	if (!userId) return json(401, { error: "Unauthorized" });

	const method = event.requestContext?.http?.method;
	if (method === "GET") return list(userId, event.queryStringParameters ?? {});

	const matchId = event.pathParameters?.matchId;
	if (!ID_PATTERN.test(matchId ?? "")) return json(400, { error: "Invalid match id." });
	const Key = { userId, accountMatchId: `${PREFIX}${matchId}` };

	if (method === "DELETE") {
		try {
			await ddb.send(new DeleteCommand({ TableName: HISTORY_TABLE, Key }));
			return { statusCode: 204 };
		} catch (err) {
			console.error("delete unofficial match failed", err);
			return json(500, { error: "Failed to delete the match." });
		}
	}
	if (method === "PUT") return put(Key, matchId, event.body);
	return json(405, { error: "Method not allowed." });
};

async function list(userId, params) {
	// The cursor is the previous page's LastEvaluatedKey; it must point inside
	// this caller's unofficial matches or it's rejected.
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
		console.error("load unofficial matches failed", err);
		return json(500, { error: "Failed to load unofficial matches." });
	}
	const nextCursor = page.LastEvaluatedKey
		? Buffer.from(JSON.stringify(page.LastEvaluatedKey)).toString("base64url")
		: null;
	return json(200, { matches: (page.Items ?? []).map(publicMatch), nextCursor });
}

async function put(Key, matchId, rawBody) {
	let body;
	try {
		body = JSON.parse(rawBody || "{}");
	} catch {
		return json(400, { error: "Body must be JSON." });
	}
	const eloPlayerId = text(body.eloPlayerId);
	if (!eloPlayerId || eloPlayerId.includes("#")) return json(400, { error: "Body must include the `eloPlayerId` the match is logged under." });
	const date = text(body.date, 10);
	if (!date || !DATE_PATTERN.test(date)) return json(400, { error: "`date` must be YYYY-MM-DD." });
	const type = text(body.type)?.toUpperCase();
	if (type && !TYPES.has(type)) return json(400, { error: `Invalid type "${type}" (expected ${[...TYPES].join(", ")}).` });
	const result = text(body.result)?.toUpperCase();
	if (result && !RESULTS.has(result)) return json(400, { error: `Invalid result "${result}".` });
	const score = text(body.score, 3);
	if (score && (!result || !SCORES[result].includes(score))) return json(400, { error: `Invalid score "${score}" for ${result ?? "no result"}.` });

	const now = new Date().toISOString();
	const item = clean({
		...Key,
		matchId,
		eloPlayerId,
		date,
		type,
		opponent: text(body.opponent),
		myChampion: text(body.myChampion),
		opponentChampion: text(body.opponentChampion),
		result,
		score,
		notes: text(body.notes, MAX_NOTES),
		createdAt: text(body.createdAt, 40) ?? now,
		updatedAt: now,
	});
	try {
		await ddb.send(new PutCommand({ TableName: HISTORY_TABLE, Item: item }));
	} catch (err) {
		console.error("save unofficial match failed", err);
		return json(500, { error: "Failed to save the match." });
	}
	return json(200, publicMatch(item));
}
