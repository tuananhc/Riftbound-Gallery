// POST /history — bulk upsert one linked account's match history.
// Body: { eloPlayerId, matches: [...] }
//
// Fronted by API Gateway (HTTP API) with a Cognito JWT authorizer. The userId is
// derived from the verified token, NEVER from the request body. A user can link
// several EloShowdown accounts, so each match is keyed by userId (PK) +
// accountMatchId (SK) = "<eloPlayerId>#<matchId>". Two of the user's own
// accounts playing each other therefore get two items, and one account's
// history is a Query with begins_with(accountMatchId, "<eloPlayerId>#").
//
// Item schema:
//   userId            PK — Cognito sub
//   accountMatchId    SK — "<eloPlayerId>#<matchId>"
//   eloPlayerId       EloShowdown account the match was played on
//   matchId           EloShowdown match id
//   opponent          opponent's display name
//   myChampion        your legend (card id)
//   opponentChampion  opponent's legend (card id)
//   result            WIN | LOSS | DRAW
//   playedAt          ISO date the match was played
//   eventName         tournament / event name
//   notes             free-text notes (max 2000 chars)
//   updatedAt         ISO timestamp of the last write
//
// Writes are UpdateItem (SET only the fields sent), not PutItem, so re-saving
// from the page never wipes attributes it didn't include — e.g. notes written
// elsewhere survive a bulk re-sync.
//
// Deploy notes:
//   - Runtime: Node.js 20.x (AWS SDK v3 is bundled in the runtime — no npm install)
//   - Env var: DYNAMODB_TABLE_HISTORY = "MatchHistory"
//   - Table keys: partition key `userId` (String), sort key `accountMatchId` (String)
//   - Execution role needs: dynamodb:UpdateItem on the MatchHistory table
//   - CORS is handled by the HTTP API's CORS config, not here.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const HISTORY_TABLE = process.env.DYNAMODB_TABLE_HISTORY;

const RESULTS = new Set(["WIN", "LOSS", "DRAW"]);
const MAX_MATCHES = 500; // guard against oversized payloads
const CONCURRENCY = 25; // parallel UpdateItem calls per wave
const MAX_NOTES = 2000; // keep items well under the 400KB limit
const MAX_TEXT = 200; // opponent / event name / legend id

function json(statusCode, body) {
	return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// Drop null / undefined / empty-string fields — DynamoDB must never receive them.
function clean(obj) {
	const out = {};
	for (const [k, v] of Object.entries(obj)) {
		if (v !== null && v !== undefined && v !== "") out[k] = v;
	}
	return out;
}

export const handler = async (event) => {
	// Identity comes from the verified JWT, never the body.
	const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
	if (!userId) return json(401, { error: "Unauthorized" });

	let body;
	try {
		body = JSON.parse(event.body || "{}");
	} catch {
		return json(400, { error: "Invalid JSON body." });
	}

	const eloPlayerId = typeof body.eloPlayerId === "number" ? String(body.eloPlayerId) : text(body.eloPlayerId, MAX_TEXT);
	if (!eloPlayerId || eloPlayerId.includes("#")) {
		return json(400, { error: "Body must include the `eloPlayerId` these matches belong to." });
	}

	const matches = body.matches;
	if (!Array.isArray(matches) || matches.length === 0) {
		return json(400, { error: "Body must include a non-empty `matches` array." });
	}
	if (matches.length > MAX_MATCHES) {
		return json(400, { error: `Too many matches (max ${MAX_MATCHES}).` });
	}

	// Validate + shape each match. Don't trust the client's shape.
	const items = [];
	for (const m of matches) {
		const matchId = m && (typeof m.matchId === "number" ? String(m.matchId) : text(m.matchId, MAX_TEXT));
		if (!matchId) {
			return json(400, { error: "Each match needs a `matchId`." });
		}
		const result = String(m.result || "").toUpperCase();
		if (!RESULTS.has(result)) {
			return json(400, { error: `Invalid result "${m.result}" (expected WIN, LOSS, or DRAW).` });
		}
		items.push({
			accountMatchId: `${eloPlayerId}#${matchId}`,
			fields: clean({
				eloPlayerId,
				matchId,
				result,
				opponent: text(m.opponent, MAX_TEXT),
				myChampion: text(m.myChampion, MAX_TEXT),
				opponentChampion: text(m.opponentChampion, MAX_TEXT),
				playedAt: text(m.playedAt, MAX_TEXT),
				eventName: text(m.eventName, MAX_TEXT),
				notes: text(m.notes, MAX_NOTES),
				updatedAt: new Date().toISOString(),
			}),
		});
	}

	// De-dupe by key — last one in the payload wins.
	const byKey = new Map();
	for (const it of items) byKey.set(it.accountMatchId, it);
	const unique = [...byKey.values()];

	try {
		for (let i = 0; i < unique.length; i += CONCURRENCY) {
			await Promise.all(unique.slice(i, i + CONCURRENCY).map(it => upsert(userId, it)));
		}
	} catch (err) {
		console.error("save history failed", err);
		return json(500, { error: "Failed to save match history." });
	}

	return json(200, { saved: unique.length });
};

// Strings only, trimmed and length-capped; anything else becomes undefined.
function text(v, max) {
	return typeof v === "string" ? v.trim().slice(0, max) : undefined;
}

// SET only the provided attributes; placeholders sidestep reserved words.
function upsert(userId, { accountMatchId, fields }) {
	const names = {};
	const values = {};
	const sets = Object.entries(fields).map(([k, v], i) => {
		names[`#f${i}`] = k;
		values[`:v${i}`] = v;
		return `#f${i} = :v${i}`;
	});
	return ddb.send(new UpdateCommand({
		TableName: HISTORY_TABLE,
		Key: { userId, accountMatchId },
		UpdateExpression: `SET ${sets.join(", ")}`,
		ExpressionAttributeNames: names,
		ExpressionAttributeValues: values,
	}));
}
