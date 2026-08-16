// POST /history — bulk upsert the caller's match history.
//
// Fronted by API Gateway (HTTP API) with a Cognito JWT authorizer. The userId is
// derived from the verified token, NEVER from the request body. Each match is
// keyed by userId (PK) + matchId (SK), so re-saving is an idempotent overwrite.
//
// Deploy notes:
//   - Runtime: Node.js 20.x (AWS SDK v3 is bundled in the runtime — no npm install)
//   - Env var: DYNAMODB_TABLE_HISTORY = "MatchHistory"
//   - Execution role needs: dynamodb:BatchWriteItem on the MatchHistory table
//   - CORS is handled by the HTTP API's CORS config, not here.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const HISTORY_TABLE = process.env.DYNAMODB_TABLE_HISTORY;

const RESULTS = new Set(["WIN", "LOSS", "DRAW"]);
const MAX_MATCHES = 500; // guard against oversized payloads
const BATCH_SIZE = 25;   // DynamoDB BatchWrite hard limit

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
		if (!m || typeof m.matchId !== "string" || !m.matchId) {
			return json(400, { error: "Each match needs a string `matchId`." });
		}
		const result = String(m.result || "").toUpperCase();
		if (!RESULTS.has(result)) {
			return json(400, { error: `Invalid result "${m.result}" (expected WIN, LOSS, or DRAW).` });
		}
		items.push(clean({
			userId,                 // partition key — from the token
			matchId: m.matchId,     // sort key
			result,
			playedAt: m.playedAt,
			opponent: m.opponent,
			eloChange: typeof m.eloChange === "number" ? m.eloChange : undefined,
			eloAfter: typeof m.eloAfter === "number" ? m.eloAfter : undefined,
			season: m.season,
			myChampion: m.myChampion,
			opponentChampion: m.opponentChampion,
			updatedAt: new Date().toISOString(),
		}));
	}

	// De-dupe by matchId — BatchWrite rejects duplicate keys within one request.
	const byKey = new Map();
	for (const it of items) byKey.set(it.matchId, it);
	const unique = [...byKey.values()];

	// Write in chunks of 25, retrying any UnprocessedItems with backoff.
	try {
		for (let i = 0; i < unique.length; i += BATCH_SIZE) {
			let requests = unique.slice(i, i + BATCH_SIZE).map(Item => ({ PutRequest: { Item } }));
			let attempt = 0;
			while (requests.length && attempt < 5) {
				const res = await ddb.send(new BatchWriteCommand({ RequestItems: { [HISTORY_TABLE]: requests } }));
				requests = res.UnprocessedItems?.[HISTORY_TABLE] || [];
				if (requests.length) await new Promise(r => setTimeout(r, 100 * 2 ** attempt));
				attempt++;
			}
			if (requests.length) return json(502, { error: "Some matches could not be written. Please retry." });
		}
	} catch (err) {
		console.error("save history failed", err);
		return json(500, { error: "Failed to save match history." });
	}

	return json(200, { saved: unique.length });
};
