import { redirect } from "next/navigation";

// The profile now lives at the root — keep old /user links working.
export default function UserPage() {
	redirect("/");
}
