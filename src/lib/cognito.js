// ─── Cognito User Pool ──────────────────────────────────────────────────────
// Client-safe: only reads NEXT_PUBLIC_ identifiers (no secrets). The pool is
// built lazily so the app still renders if the env vars are not yet configured —
// callers hit a thrown error only when they actually try to sign up / sign in.

import { CognitoUserPool } from "amazon-cognito-identity-js";

let pool;

export function getUserPool() {
	if (!pool) {
		const UserPoolId = process.env.NEXT_PUBLIC_COGNITO_POOL_ID;
		const ClientId   = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
		if (!UserPoolId || !ClientId) {
			throw new Error(
				"Cognito is not configured. Set NEXT_PUBLIC_COGNITO_POOL_ID and " +
				"NEXT_PUBLIC_COGNITO_CLIENT_ID in .env.local and restart npm run dev."
			);
		}
		pool = new CognitoUserPool({ UserPoolId, ClientId });
	}
	return pool;
}
