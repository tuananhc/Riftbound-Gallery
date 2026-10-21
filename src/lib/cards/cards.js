import "server-only";

import { dynamo } from "../db";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { legendOptions } from "./data";

// Card data only changes when the crawler re-uploads, so each query's result is
// kept in server memory for an hour. The pages' `revalidate` doesn't apply under
// `next dev`, and Next's data cache refuses entries over 2MB (the full card list
// is ~2.7MB), so without this every load re-downloads the table.
const CACHE_MS = 60 * 60 * 1000;

function cached(load) {
	let entry = null;
	return () => {
		if (!entry || Date.now() - entry.at > CACHE_MS) {
			const promise = load();
			entry = { at: Date.now(), promise };
			// A failed scan isn't kept — the next call tries again.
			promise.catch(() => { if (entry?.promise === promise) entry = null; });
		}
		return entry.promise;
	};
}

// Every page of a Scan of the Cards table.
async function scanCards(params = {}) {
	const items = [];
	let lastKey = undefined;

	do {
		const response = await dynamo.send(new ScanCommand({
			TableName: process.env.DYNAMODB_TABLE_CARDS,
			ExclusiveStartKey: lastKey,
			...params,
		}));

		items.push(...response.Items);
		lastKey = response.LastEvaluatedKey;

	} while (lastKey);

	return items;
}

export const getAllCards = cached(async () => {
	const items = await scanCards();
	return items.sort((a, b) => a.name.localeCompare(b.name));
});

// Legends only — used by the profile page's champion pickers, which must not
// depend on the Cards page having been visited first. DynamoDB filters and
// trims the rows, so this downloads ~30KB instead of the whole table.
export const getLegends = cached(async () => legendOptions(await scanCards({
	FilterExpression: "contains(card_type_text, :legend)",
	// The fields legendOptions reads; `name` is a DynamoDB reserved word.
	ProjectionExpression: "id, #name, image, tags_text, domain_text, card_type_text",
	ExpressionAttributeNames: { "#name": "name" },
	ExpressionAttributeValues: { ":legend": "Legend" },
})));
