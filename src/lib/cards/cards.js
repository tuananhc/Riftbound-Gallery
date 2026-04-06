import { dynamo } from "../db";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

export async function getAllCards() {
	const items   = [];
	let lastKey   = undefined;

	do {
		const response = await dynamo.send(new ScanCommand({
			TableName: process.env.DYNAMODB_TABLE_CARDS,
			ExclusiveStartKey: lastKey,
		}));

		items.push(...response.Items);
		lastKey = response.LastEvaluatedKey;

	} while (lastKey);

	console.log(`Fetched ${items.length} cards from DynamoDB`);

	return items.sort((a, b) => a.name.localeCompare(b.name));
}
