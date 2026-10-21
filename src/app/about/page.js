import { COLORS, LAYOUT, SITE_NAME } from "../../lib/data";

export const metadata = {
	title: "About & Credits",
	description: `Why this site is called ${SITE_NAME}, and the Riot Games and EloShowdown work it is built on.`,
};

export default function AboutPage() {
	return (
		<div style={{ maxWidth: 860, margin: "0 auto", padding: LAYOUT.contentPad }}>
			<div style={{ marginBottom: 36 }}>
				<h1 style={{ fontSize: "clamp(20px, 5.5vw, 28px)", fontWeight: 900, color: COLORS.accent, letterSpacing: "0.12em", marginBottom: 6 }}>
					ABOUT & CREDITS
				</h1>
				<p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6 }}>
					{SITE_NAME} is a fan-made Riftbound companion for tracking our matches, Elo and decks.
				</p>
			</div>

			<Section label="WHY “BILGEWATER TRACKER”?">
				<P>
					This site started as a way for our group to track our progress — every match,
					every legend pick, and where each of us sits on the Elo ladder from season to season.
				</P>
				<P>
					Bilgewater Tracker is a Riftbound unit from Bilgewater, the port city of pirates and
					bounty hunters. She&apos;s the one reading the bounty board, keeping tabs on who&apos;s
					worth chasing — which is exactly what this site does for us.
				</P>
				<blockquote style={{ borderLeft: `2px solid ${COLORS.accent}`, padding: "4px 0 4px 14px", color: COLORS.textStrong, fontSize: 14, fontStyle: "italic", lineHeight: 1.6 }}>
					“Who&apos;s on top of the bounty board today?”
					<span style={{ display: "block", marginTop: 4, fontSize: 11, fontStyle: "normal", color: COLORS.textDim, letterSpacing: "0.06em" }}>
						— Bilgewater Tracker flavour text, art by Six More Vodka
					</span>
				</blockquote>
				<P>That&apos;s the question we open the site to answer.</P>
			</Section>

			<Section label="RIOT GAMES">
				<P>
					Riftbound is a trading card game by <A href="https://www.riotgames.com">Riot Games</A>,
					published by <A href="https://www.uvsgames.com">UVS Games</A>. Every card name, card text,
					card image and illustration, rune and card-type icon, and champion icon on this site belongs to
					Riot Games and its artists. Card data and images come from the
					official <A href="https://riftbound.leagueoflegends.com/en-us/card-gallery/">Riftbound Card Gallery</A>,
					and tournament events from the public UVS event locator.
				</P>
				<P>
					{SITE_NAME}{" "}was created under Riot Games&apos; &ldquo;Legal Jibber Jabber&rdquo; policy using
					assets owned by Riot Games. Riot Games does not endorse or sponsor this project.
				</P>
				<p style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7, padding: "12px 14px", background: COLORS.bgAlt, border: `1px solid ${COLORS.border}` }}>
					{SITE_NAME}{" "}isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of
					Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot
					Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
				</p>
			</Section>

			<Section label="ELOSHOWDOWN">
				<P>
					Match history, Elo history, seasons and player search are provided
					by <A href="https://eloshowdown.com/riftbound/">EloShowdown</A> through their public API.
					When you link an EloShowdown account on your profile, this site reads your matches from
					EloShowdown and saves a copy so you can add your legend picks to them.
				</P>
				<P>
					{SITE_NAME}{" "}isn&apos;t affiliated with EloShowdown — all the rating work is theirs. Thank you
					for making the data open. If a match or rating looks wrong, EloShowdown is the source of truth.
				</P>
			</Section>
		</div>
	);
}

function Section({ label, children }) {
	return (
		<section style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: "clamp(16px, 4vw, 24px)", marginBottom: 16 }}>
			<h2 style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, letterSpacing: "0.2em", marginBottom: 16 }}>
				{label}
			</h2>
			<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
		</section>
	);
}

function P({ children }) {
	return <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.7 }}>{children}</p>;
}

function A({ href, children }) {
	return (
		<a href={href} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accent, textDecoration: "underline", textUnderlineOffset: 3 }}>
			{children}
		</a>
	);
}
