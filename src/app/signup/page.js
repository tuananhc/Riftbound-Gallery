import SignupForm from "../../components/auth/SignupForm";

// Server component — no data fetching needed. All interactivity (form state,
// Cognito calls) lives in the client SignupForm.
export default function SignupPage() {
	return <SignupForm />;
}
