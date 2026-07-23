"use client";
// Reads the Cognito session cached in localStorage and exposes it to client
// components. No context/provider — each caller reads the session independently
// (a cheap localStorage lookup), keeping with the project's "no context without
// clear justification" rule. The SDK auto-refreshes expired tokens in getSession.

import { useState, useEffect, useCallback } from "react";
import { getUserPool } from "../lib/cognito";

export function useAuth() {
	// status: "loading" (checking) · "authed" · "guest"
	const [status, setStatus] = useState("loading");
	const [user,   setUser]   = useState(null); // { email, sub }
	const [token,  setToken]  = useState(null); // ID token JWT for API calls

	const load = useCallback(() => {
		let pool;
		try {
			pool = getUserPool();
		} catch {
			// Cognito not configured — treat as signed out.
			setStatus("guest");
			return;
		}

		const current = pool.getCurrentUser();
		if (!current) {
			setUser(null);
			setToken(null);
			setStatus("guest");
			return;
		}

		current.getSession((err, session) => {
			if (err || !session || !session.isValid()) {
				setUser(null);
				setToken(null);
				setStatus("guest");
				return;
			}
			const idToken = session.getIdToken();
			const claims  = idToken.decodePayload();
			setUser({ email: claims.email, sub: claims.sub });
			setToken(idToken.getJwtToken());
			setStatus("authed");
		});
	}, []);

	// One-time session read on mount: hydrate auth state from localStorage.
	// Can't use a useState initializer here — localStorage doesn't exist during
	// SSR, which would cause a hydration mismatch. The synchronous setState is
	// intentional (a single hydration), not a reactive cascade.
	// eslint-disable-next-line react-hooks/set-state-in-effect
	useEffect(() => { load(); }, [load]);

	const signOut = useCallback(() => {
		try {
			getUserPool().getCurrentUser()?.signOut();
		} catch {
			// nothing to clear
		}
		setUser(null);
		setToken(null);
		setStatus("guest");
	}, []);

	return { status, user, token, signOut, refresh: load };
}
