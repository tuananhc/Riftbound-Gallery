// GET /history?eloPlayerId=<id>[&cursor=<token>] — one linked account's saved
// match history, a page at a time.
//
// Fronted by API Gateway (HTTP API) with a Cognito JWT authorizer. The userId is
// derived from the verified token, NEVER from the request, so a caller can only
// ever read their own items: the Query is on PK userId = <sub> and
// begins_with(accountMatchId, "<eloPlayerId>#") — see saveMatchHistory.mjs for
// the item schema.
//
// Reads are bounded with Query Limit + LastEvaluatedKey pagination (items are
// never TTL'd, so a history only grows). The response is
//   { matches: [...], nextCursor: string | null }
// where nextCursor is an opaque token to pass back for the next page.
//
// Deployed by infra/backend.yml (runtime, env vars, IAM role, routes) on every
// push to master — don't change the function's settings in the console.
//   - Function riftbound-get-match-history, route GET /history.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const HISTORY_TABLE = process.env.DYNAMODB_TABLE_HISTORY;

const PAGE_SIZE = 200;
const MAX_ID = 200;

// Attributes returned to the client — the keys and owner stay server-side.
const FIELDS = [
	"matchId", "result", "score", "opponent", "opponentId", "myChampion", "opponentChampion", "playedAt",
	"eventName", "notes", "eloBefore", "eloChange", "eloAfter", "season", "updatedAt",
];

function json(statusCode, body) {
	return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const handler = async (event) => {
	// Identity comes from the verified JWT, never the request.
	const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
	if (!userId) return json(401, { error: "Unauthorized" });

	const params = event.queryStringParameters ?? {};
	const eloPlayerId = typeof params.eloPlayerId === "string" ? params.eloPlayerId.trim().slice(0, MAX_ID) : "";
	if (!eloPlayerId || eloPlayerId.includes("#")) {
		return json(400, { error: "Query must include the `eloPlayerId` to load." });
	}
	const prefix = `${eloPlayerId}#`;

	// The cursor is the previous page's LastEvaluatedKey. It must point inside
	// this caller's partition and this account's range, or it's rejected.
	let startKey;
	if (params.cursor) {
		try {
			startKey = JSON.parse(Buffer.from(params.cursor, "base64url").toString("utf8"));
		} catch {
			return json(400, { error: "Invalid cursor." });
		}
		if (startKey?.userId !== userId || typeof startKey.accountMatchId !== "string" || !startKey.accountMatchId.startsWith(prefix)) {
			return json(400, { error: "Invalid cursor." });
		}
	}

	let page;
	try {
		page = await ddb.send(new QueryCommand({
			TableName: HISTORY_TABLE,
			KeyConditionExpression: "userId = :u AND begins_with(accountMatchId, :p)",
			ExpressionAttributeValues: { ":u": userId, ":p": prefix },
			Limit: PAGE_SIZE,
			ExclusiveStartKey: startKey,
		}));
	} catch (err) {
		console.error("load history failed", err);
		return json(500, { error: "Failed to load match history." });
	}

	const matches = (page.Items ?? []).map(item =>
		Object.fromEntries(FIELDS.filter(f => item[f] !== undefined).map(f => [f, item[f]]))
	);
	const nextCursor = page.LastEvaluatedKey
		? Buffer.from(JSON.stringify(page.LastEvaluatedKey)).toString("base64url")
		: null;

	return json(200, { matches, nextCursor });
};
