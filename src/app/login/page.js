import SignInForm from "../../components/auth/SignInForm";

// Server component — no data fetching. All interactivity (form state, Cognito
// auth) lives in the client SignInForm.
export default function LoginPage() {
	return <SignInForm />;
}
