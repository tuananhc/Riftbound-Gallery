// Cognito Post-Confirmation trigger.
//
// Fires once, automatically, when a user verifies their email at sign-up.
// Mirrors the immutable Cognito `sub` into the Users table as the profile row,
// so every confirmed user has a DynamoDB record keyed by their sub.
//
// Deploy notes:
//   - Runtime: Node.js 20.x (AWS SDK v3 is bundled in the runtime — no npm install)
//   - Env var: DYNAMODB_TABLE_USERS = "Users"
//   - Execution role needs: dynamodb:PutItem on the Users table
//   - Attach in Cognito → User Pool → User pool properties → Add trigger →
//     "Post confirmation" → this function

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const USERS_TABLE = process.env.DYNAMODB_TABLE_USERS;

export const handler = async (event) => {
	// Only act on sign-up confirmations — this trigger also fires for
	// forgot-password confirmations, which must not create a profile.
	if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") {
		return event;
	}

	const attrs = event.request.userAttributes || {};
	const sub = attrs.sub;
	if (!sub) return event; // nothing to key on — bail without failing the flow

	// Build the profile item, then strip null / undefined / empty fields —
	// DynamoDB must never receive null or empty-string values (CLAUDE.md rule).
	const item = {
		userId:    sub,                                   // partition key = Cognito sub
		email:     attrs.email,
		displayName: attrs.email ? attrs.email.split("@")[0] : undefined,
		createdAt: new Date().toISOString(),
	};
	for (const key of Object.keys(item)) {
		const v = item[key];
		if (v === null || v === undefined || v === "") delete item[key];
	}

	try {
		await ddb.send(new PutCommand({
			TableName: USERS_TABLE,
			Item: item,
			// Idempotent: the trigger can fire more than once — never clobber an
			// existing profile (which may already hold edits, stats, etc.).
			ConditionExpression: "attribute_not_exists(userId)",
		}));
	} catch (err) {
		// Profile already exists → condition fails → not an error, swallow it.
		if (err.name !== "ConditionalCheckFailedException") {
			// A real failure. Rethrow so it surfaces in logs. See the note below
			// about whether this should block the user's confirmation.
			throw err;
		}
	}

	// Cognito requires the event returned unchanged, or the sign-up fails.
	return event;
};
