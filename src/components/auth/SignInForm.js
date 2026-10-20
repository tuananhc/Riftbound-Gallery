"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CognitoUser, AuthenticationDetails } from "amazon-cognito-identity-js";
import { getUserPool } from "../../lib/cognito";
import { COLORS } from "../../lib/data";
import { AuthShell, ErrorBox, Field, Input, PasswordInput, SubmitButton } from "./formPrimitives";

export default function SignInForm() {
	const router = useRouter();

	const [email,    setEmail]    = useState("");
	const [password, setPassword] = useState("");
	const [loading,  setLoading]  = useState(false);
	const [error,    setError]    = useState(null);

	function handleSignIn(e) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		let userPool;
		try {
			userPool = getUserPool();
		} catch (err) {
			setError(err.message);
			setLoading(false);
			return;
		}

		// Email is an alias on the pool, so we authenticate with it directly.
		const authDetails = new AuthenticationDetails({ Username: email, Password: password });
		const user = new CognitoUser({ Username: email, Pool: userPool });

		user.authenticateUser(authDetails, {
			onSuccess: () => {
				// Tokens are cached in localStorage by the SDK. Send the user to
				// their profile — useAuth will read the session from here.
				router.push("/");
			},
			onFailure: (err) => {
				setLoading(false);
				if (err.code === "UserNotConfirmedException") {
					setError("Your email isn't verified yet. Check your inbox for the code, or sign up again to resend it.");
				} else if (err.code === "NotAuthorizedException") {
					setError("Incorrect email or password.");
				} else {
					setError(err.message || "Sign in failed. Please try again.");
				}
			},
			newPasswordRequired: () => {
				setLoading(false);
				setError("This account requires a new password. Please contact support.");
			},
		});
	}

	return (
		<AuthShell title="SIGN IN" sub="Welcome back. Your match history is waiting."
			footer={<><span style={{ color: COLORS.textMuted }}>No account?</span><a href="/signup" style={{ color: COLORS.accent, fontWeight: 700 }}>Create one →</a></>}>
			{error && <ErrorBox>{error}</ErrorBox>}
			<form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
					<Field label="EMAIL">
						<Input type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" required />
					</Field>
					<Field label="PASSWORD">
						<PasswordInput value={password} onChange={setPassword} invalid={Boolean(error)} placeholder="••••••••" autoComplete="current-password" required />
					</Field>
				</div>
				<SubmitButton loading={loading} disabled={!email || !password}>
					{loading ? "SIGNING IN…" : "SIGN IN"}
				</SubmitButton>
			</form>
		</AuthShell>
	);
}
