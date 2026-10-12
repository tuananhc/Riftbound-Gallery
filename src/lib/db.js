import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Vercel reserves the AWS_* environment names for its own Lambda runtime, so
// AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY set in project
// settings never reach the build — which fails prerendering with
// "Region is missing". Read the RIFTBOUND_AWS_* names first (set those in
// Vercel) and fall back to the plain AWS_* names for local .env.local and the
// AWS CLI's own environment.
const REGION = process.env.RIFTBOUND_AWS_REGION || process.env.AWS_REGION || "ap-southeast-2";
const ACCESS_KEY_ID = process.env.RIFTBOUND_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.RIFTBOUND_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

const client = new DynamoDBClient({
	region: REGION,
	// Without explicit keys the SDK falls back to the ambient credential chain
	// (IAM role, shared config), which is what we want on AWS itself.
	...(ACCESS_KEY_ID && SECRET_ACCESS_KEY
		? { credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY } }
		: {}),
});

export const dynamo = DynamoDBDocumentClient.from(client);
