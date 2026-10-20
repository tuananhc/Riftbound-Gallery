"use client";
import { useState } from "react";
import { CognitoUser, CognitoUserAttribute } from "amazon-cognito-identity-js";
import { getUserPool } from "../../lib/cognito";
import { COLORS } from "../../lib/data";
import { AuthShell, ErrorBox, FONT, Field, Input, NoticeBox, PasswordInput, SubmitButton } from "./formPrimitives";

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

	const title = phase === "done" ? "YOU'RE IN" : phase === "confirm" ? "VERIFY EMAIL" : "CREATE ACCOUNT";
	const sub = phase === "signup" ? "Track your matches, Elo and matchups across seasons."
		: phase === "confirm" ? "Enter the code we sent to your email."
		: "Your account is verified and ready.";
	return (
		<AuthShell title={title} sub={sub}
			footer={phase === "signup" && <><span style={{ color: COLORS.textMuted }}>Have an account?</span><a href="/login" style={{ color: COLORS.accent, fontWeight: 700 }}>Sign in →</a></>}>
			{error && <ErrorBox>{error}</ErrorBox>}
			{notice && !error && <NoticeBox>{notice}</NoticeBox>}

			{phase === "signup" && (
				<form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
					<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
						<Field label="EMAIL">
							<Input type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" required />
						</Field>
						<Field label="PASSWORD" hint={PASSWORD_HINT}>
							<PasswordInput value={password} onChange={setPassword} placeholder="••••••••" autoComplete="new-password" required />
						</Field>
						<Field label="CONFIRM PASSWORD">
							<PasswordInput value={confirm} onChange={setConfirm} placeholder="••••••••" autoComplete="new-password" required />
						</Field>
					</div>
					<SubmitButton loading={loading} disabled={!email || !password || !confirm}>
						{loading ? "CREATING…" : "CREATE ACCOUNT"}
					</SubmitButton>
				</form>
			)}

			{phase === "confirm" && (
				<form onSubmit={handleConfirm} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
					<Field label="VERIFICATION CODE">
						<Input type="text" value={code} onChange={setCode} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" required />
					</Field>
					<SubmitButton loading={loading} disabled={!code.trim()}>
						{loading ? "VERIFYING…" : "VERIFY EMAIL"}
					</SubmitButton>
					<button type="button" onClick={handleResend} style={{
						height: 44, background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer",
						fontFamily: FONT, fontSize: 11, letterSpacing: "0.08em",
					}}>Didn&apos;t get it? Resend code</button>
				</form>
			)}

			{phase === "done" && (
				<a href="/login" style={{
					height: 52, display: "flex", alignItems: "center", justifyContent: "center",
					background: COLORS.accent, color: COLORS.bg, fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: "0.14em",
				}}>CONTINUE TO SIGN IN</a>
			)}
		</AuthShell>
	);
}
