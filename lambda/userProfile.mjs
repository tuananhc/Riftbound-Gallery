// GET /profile — return the caller's Users row.
// PUT /profile — manage the caller's linked EloShowdown / UVS accounts.
//
// Fronted by API Gateway (HTTP API) with a Cognito JWT authorizer. The userId is
// derived from the verified token, NEVER from the request body.
//
// A user can link several accounts. They live on the Users item as:
//   eloPlayers:        [{ id, display_name, primary_community, country }, ...]
//   activeEloPlayerId: id of the account whose history the profile page shows
//
// PUT body — one action per request:
//   { action: "add", player: {...} }  link an account (or refresh its details) and make it active
//   { action: "select", id }           make an already-linked account active
//   { action: "remove", id }           unlink an account; active falls back to the first remaining
// Every PUT responds with { eloPlayers, activeEloPlayerId }.
//
// Writes are read-modify-write guarded by `updatedAt`, so two tabs editing at
// once can't silently drop each other's accounts (the loser gets a 409).
// Items written by the old single-account version (`eloPlayer`) are migrated
// into `eloPlayers` on read and the old attribute is removed on the next write.
//
// Deploy notes:
//   - Runtime: Node.js 20.x (AWS SDK v3 is bundled in the runtime — no npm install)
//   - Env var: DYNAMODB_TABLE_USERS = "Users"
//   - Execution role needs: dynamodb:GetItem, dynamodb:UpdateItem on the Users table
//   - Routes: GET /profile and PUT /profile, both with the Cognito JWT authorizer
//   - CORS is handled by the HTTP API's CORS config, not here.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const USERS_TABLE = process.env.DYNAMODB_TABLE_USERS;
const MAX_TEXT = 200;
const MAX_ACCOUNTS = 10;

function json(statusCode, body) {
	return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// Strings only, trimmed and length-capped; anything else becomes undefined.
function text(v) {
	return typeof v === "string" && v.trim() ? v.trim().slice(0, MAX_TEXT) : undefined;
}

function toId(v) {
	return typeof v === "number" ? String(v) : text(v);
}

// Keep only the fields we render, dropping empty ones (no nulls in DynamoDB).
function shapePlayer(p) {
	const id = p && typeof p === "object" ? toId(p.id) : undefined;
	if (!id) return null;
	const out = { id };
	for (const k of ["display_name", "primary_community", "country"]) {
		const v = text(p[k]);
		if (v) out[k] = v;
	}
	return out;
}

// Linked accounts + active id, folding in the legacy single `eloPlayer`.
function accountsOf(item) {
	const players = Array.isArray(item?.eloPlayers) ? [...item.eloPlayers] : [];
	if (item?.eloPlayer?.id && !players.some(p => p.id === item.eloPlayer.id)) players.push(item.eloPlayer);
	const active = players.some(p => p.id === item?.activeEloPlayerId) ? item.activeEloPlayerId : players[0]?.id;
	return { eloPlayers: players, activeEloPlayerId: active };
}

export const handler = async (event) => {
	// Identity comes from the verified JWT, never the body.
	const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
	if (!userId) return json(401, { error: "Unauthorized" });

	const method = event.requestContext?.http?.method;

	try {
		const current = (await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } }))).Item;

		if (method === "GET") {
			const { eloPlayer, ...rest } = current ?? { userId };
			return json(200, { ...rest, ...accountsOf(current) });
		}

		if (method !== "PUT") return json(405, { error: "Method not allowed." });

		let body;
		try {
			body = JSON.parse(event.body || "{}");
		} catch {
			return json(400, { error: "Invalid JSON body." });
		}

		let { eloPlayers, activeEloPlayerId } = accountsOf(current);

		if (body.action === "add") {
			const player = shapePlayer(body.player);
			if (!player) return json(400, { error: "`player` needs an `id`." });
			const i = eloPlayers.findIndex(p => p.id === player.id);
			if (i >= 0) {
				eloPlayers[i] = player;
			} else {
				if (eloPlayers.length >= MAX_ACCOUNTS) return json(400, { error: `You can link at most ${MAX_ACCOUNTS} accounts.` });
				eloPlayers.push(player);
			}
			activeEloPlayerId = player.id;
		} else if (body.action === "select" || body.action === "remove") {
			const id = toId(body.id);
			if (!id || !eloPlayers.some(p => p.id === id)) return json(404, { error: "That account isn't linked." });
			if (body.action === "select") {
				activeEloPlayerId = id;
			} else {
				eloPlayers = eloPlayers.filter(p => p.id !== id);
				if (activeEloPlayerId === id) activeEloPlayerId = eloPlayers[0]?.id;
			}
		} else {
			return json(400, { error: "`action` must be add, select, or remove." });
		}

		// Empty list / no active account → REMOVE rather than store empty values.
		const sets = ["updatedAt = :now"];
		const removes = ["eloPlayer"];
		const values = { ":now": new Date().toISOString() };
		if (eloPlayers.length) { sets.push("eloPlayers = :players"); values[":players"] = eloPlayers; } else removes.push("eloPlayers");
		if (activeEloPlayerId) { sets.push("activeEloPlayerId = :active"); values[":active"] = activeEloPlayerId; } else removes.push("activeEloPlayerId");

		let condition = "attribute_not_exists(updatedAt)";
		if (current?.updatedAt) { condition = "updatedAt = :prev"; values[":prev"] = current.updatedAt; }

		try {
			await ddb.send(new UpdateCommand({
				TableName: USERS_TABLE,
				Key: { userId },
				UpdateExpression: `SET ${sets.join(", ")} REMOVE ${removes.join(", ")}`,
				ConditionExpression: condition,
				ExpressionAttributeValues: values,
			}));
		} catch (err) {
			if (err.name === "ConditionalCheckFailedException") {
				return json(409, { error: "Your profile changed in another tab — reload and try again." });
			}
			throw err;
		}

		return json(200, { eloPlayers, activeEloPlayerId: activeEloPlayerId ?? null });
	} catch (err) {
		console.error("profile request failed", err);
		return json(500, { error: "Profile request failed." });
	}
};
