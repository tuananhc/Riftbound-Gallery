"use client";
import { useState } from "react";
import { CognitoUser, CognitoUserAttribute } from "amazon-cognito-identity-js";
import { getUserPool } from "../../lib/cognito";
import { COLORS } from "../../lib/data";
import { FONT, Field, Input, SubmitButton } from "./formPrimitives";

// Cognito's default password policy — surfaced to the user as a hint.
const PASSWORD_HINT = "At least 8 characters, with upper & lower case, a number, and a symbol.";

export default function SignupForm() {
	// phase: "signup" → collect credentials · "confirm" → enter emailed code · "done"
	const [phase, setPhase] = useState("signup");

	const [email,    setEmail]    = useState("");
	const [password, setPassword] = useState("");
	const [confirm,  setConfirm]  = useState("");
	const [code,     setCode]     = useState("");

	// The pool uses email as an *alias*, so the username itself cannot be email-
	// format. We register with a generated username and attach email as an
	// attribute; the user still signs in with their email (the alias). Kept in
	// state so the confirm / resend steps can reference the same username.
	const [username, setUsername] = useState("");

	const [loading, setLoading] = useState(false);
	const [error,   setError]   = useState(null);
	const [notice,  setNotice]  = useState(null);

	// ── Sign up ──────────────────────────────────────────────────────────────
	function handleSignup(e) {
		e.preventDefault();
		setError(null);

		if (password.length < 8) {
			setError("Password is too short. " + PASSWORD_HINT);
			return;
		}
		if (password !== confirm) {
			setError("Passwords do not match.");
			return;
		}

		setLoading(true);
		let userPool;
		try {
			userPool = getUserPool();
		} catch (err) {
			setError(err.message);
			setLoading(false);
			return;
		}

		const attributes = [new CognitoUserAttribute({ Name: "email", Value: email })];
		const newUsername = crypto.randomUUID();
		setUsername(newUsername);
		userPool.signUp(newUsername, password, attributes, null, (err) => {
			setLoading(false);
			if (err) {
				setError(err.message || "Sign up failed. Please try again.");
				return;
			}
			setNotice(`We emailed a verification code to ${email}.`);
			setPhase("confirm");
		});
	}

	// ── Confirm email code ───────────────────────────────────────────────────
	function handleConfirm(e) {
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

		const user = new CognitoUser({ Username: username, Pool: userPool });
		user.confirmRegistration(code.trim(), true, (err) => {
			setLoading(false);
			if (err) {
				setError(err.message || "Could not verify that code. Please try again.");
				return;
			}
			setPhase("done");
		});
	}

	// ── Resend code ──────────────────────────────────────────────────────────
	function handleResend() {
		setError(null);
		setNotice(null);
		let userPool;
		try {
			userPool = getUserPool();
		} catch (err) {
			setError(err.message);
			return;
		}
		const user = new CognitoUser({ Username: username, Pool: userPool });
		user.resendConfirmationCode((err) => {
			if (err) {
				setError(err.message || "Could not resend the code.");
				return;
			}
			setNotice(`A new code is on its way to ${email}.`);
		});
	}

	return (
		<div style={{ maxWidth: 440, margin: "0 auto", padding: "60px 24px" }}>
			<div style={{
				background: "linear-gradient(135deg, #1a1a1a 0%, #1a1a1a 50%, #1a1a1a 100%)",
				border: `1px solid ${COLORS.border}`, borderRadius: 0,
				padding: "36px 34px", position: "relative", overflow: "hidden",
			}}>
				{/* bg decoration */}
				<div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #2a2a2a44 0%, transparent 70%)", pointerEvents: "none" }} />

				{/* ── Header ── */}
				<div style={{ marginBottom: 28, position: "relative" }}>
					<h1 style={{ fontSize: 24, fontWeight: 900, color: COLORS.accent, letterSpacing: "0.08em", fontFamily: FONT }}>
						{phase === "done" ? "You're in" : "Create Account"}
					</h1>
					<div style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: "italic", marginTop: 6, fontFamily: FONT }}>
						{phase === "signup" && "Join the Rift and start building decks."}
						{phase === "confirm" && "Enter the code we sent to your email."}
						{phase === "done"    && "Your account is verified and ready."}
					</div>
				</div>

				{/* ── Messages ── */}
				{error && (
					<div style={{ marginBottom: 18, padding: "10px 14px", background: "#202020", border: "1px solid #cc606044", borderRadius: 0, fontSize: 12, color: "#cc6060", fontFamily: FONT }}>
						{error}
					</div>
				)}
				{notice && !error && (
					<div style={{ marginBottom: 18, padding: "10px 14px", background: "#1a1a1a", border: "1px solid #8fa3bf44", borderRadius: 0, fontSize: 12, color: "#8fa3bf", fontFamily: FONT }}>
						{notice}
					</div>
				)}

				{/* ── Signup form ── */}
				{phase === "signup" && (
					<form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
						<Field label="EMAIL">
							<Input type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" required />
						</Field>
						<Field label="PASSWORD" hint={PASSWORD_HINT}>
							<Input type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="new-password" required />
						</Field>
						<Field label="CONFIRM PASSWORD">
							<Input type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" autoComplete="new-password" required />
						</Field>
						<SubmitButton loading={loading} disabled={!email || !password || !confirm}>
							{loading ? "CREATING…" : "CREATE ACCOUNT"}
						</SubmitButton>
					</form>
				)}

				{/* ── Confirm form ── */}
				{phase === "confirm" && (
					<form onSubmit={handleConfirm} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
						<Field label="VERIFICATION CODE">
							<Input type="text" value={code} onChange={setCode} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" required />
						</Field>
						<SubmitButton loading={loading} disabled={!code.trim()}>
							{loading ? "VERIFYING…" : "VERIFY EMAIL"}
						</SubmitButton>
						<button type="button" onClick={handleResend}
							style={{ background: "transparent", border: "none", color: COLORS.textMuted, fontSize: 11, letterSpacing: "0.08em", fontFamily: FONT, cursor: "pointer", padding: 4, alignSelf: "center" }}>
							Didn&apos;t get it? Resend code
						</button>
					</form>
				)}

				{/* ── Done ── */}
				{phase === "done" && (
					<a href="/login" style={{ display: "block" }}>
						<div style={{
							background: "#242424", border: "1px solid #5d6e86", borderRadius: 0,
							padding: "12px 20px", color: "#8fa3bf", textAlign: "center",
							fontFamily: FONT, fontSize: 11, letterSpacing: "0.12em", cursor: "pointer",
						}}>
							CONTINUE TO SIGN IN
						</div>
					</a>
				)}

				{/* ── Footer ── */}
				{phase === "signup" && (
					<div style={{ marginTop: 22, textAlign: "center", fontSize: 12, color: COLORS.textDim, fontFamily: FONT }}>
						Already have an account?{" "}
						<a href="/login" style={{ color: COLORS.accent }}>Sign in</a>
					</div>
				)}
			</div>
		</div>
	);
}
