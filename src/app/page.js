import { getLegends } from "../lib/cards/cards";
import UserProfile from "../components/user/UserProfile";

export const revalidate = 3600;

export default async function HomePage() {
	const legends = await getLegends();
	return <UserProfile legends={legends} />;
}
