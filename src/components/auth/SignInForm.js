"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CognitoUser, AuthenticationDetails } from "amazon-cognito-identity-js";
import { getUserPool } from "../../lib/cognito";
import { COLORS } from "../../lib/data";
import { FONT, Field, Input, SubmitButton } from "./formPrimitives";

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
				router.push("/user");
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
		<div style={{ maxWidth: 440, margin: "0 auto", padding: "60px 24px" }}>
			<div style={{
				background: "linear-gradient(135deg, #0f1120 0%, #12101e 50%, #0f1120 100%)",
				border: `1px solid ${COLORS.border}`, borderRadius: 16,
				padding: "36px 34px", position: "relative", overflow: "hidden",
			}}>
				{/* bg decoration */}
				<div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #2a104044 0%, transparent 70%)", pointerEvents: "none" }} />

				{/* ── Header ── */}
				<div style={{ marginBottom: 28, position: "relative" }}>
					<h1 style={{ fontSize: 24, fontWeight: 900, color: COLORS.gold, letterSpacing: "0.08em", fontFamily: FONT }}>
						Sign In
					</h1>
					<div style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: "italic", marginTop: 6, fontFamily: FONT }}>
						Welcome back to the Rift.
					</div>
				</div>

				{/* ── Error ── */}
				{error && (
					<div style={{ marginBottom: 18, padding: "10px 14px", background: "#2a0d0d", border: "1px solid #ef535044", borderRadius: 8, fontSize: 12, color: "#ef8a8a", fontFamily: FONT }}>
						{error}
					</div>
				)}

				{/* ── Form ── */}
				<form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
					<Field label="EMAIL">
						<Input type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" required />
					</Field>
					<Field label="PASSWORD">
						<Input type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" required />
					</Field>
					<SubmitButton loading={loading} disabled={!email || !password}>
						{loading ? "SIGNING IN…" : "SIGN IN"}
					</SubmitButton>
				</form>

				{/* ── Footer ── */}
				<div style={{ marginTop: 22, textAlign: "center", fontSize: 12, color: COLORS.textDim, fontFamily: FONT }}>
					New to Riftbound?{" "}
					<a href="/signup" style={{ color: COLORS.gold }}>Create an account</a>
				</div>
			</div>
		</div>
	);
}
