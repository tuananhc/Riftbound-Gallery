import { NextResponse } from "next/server";

// Crawler imports — add each one as it's implemented
// import crawlPiltoverArchive from "../../../lib/crawlers/piltover-archive";
// import crawlRiftdecks       from "../../../lib/crawlers/riftdecks";
// import crawlTheVault        from "../../../lib/crawlers/the-vault";
// import crawlMetawatch       from "../../../lib/crawlers/metawatch";

const CRAWLERS = {
	// "piltover-archive": crawlPiltoverArchive,
	// "riftdecks":        crawlRiftdecks,
	// "the-vault":        crawlTheVault,
	// "metawatch":        crawlMetawatch,
};

export async function POST(request) {
	const { sources, filters } = await request.json();

	if (!Array.isArray(sources) || sources.length === 0) {
		return NextResponse.json({ error: "No sources provided." }, { status: 400 });
	}

	const validSources = sources.filter(id => id in CRAWLERS);
	if (validSources.length === 0) {
		return NextResponse.json({ error: "No crawlers implemented for the requested sources." }, { status: 501 });
	}

	const stream = new ReadableStream({
		async start(controller) {
			const encode = (data) => new TextEncoder().encode(JSON.stringify(data) + "\n");

			await Promise.allSettled(
				validSources.map(async (sourceId) => {
					try {
						const decks = await CRAWLERS[sourceId](filters);
						controller.enqueue(encode({ sourceId, decks }));
					} catch (err) {
						controller.enqueue(encode({ sourceId, error: err.message }));
					}
				})
			);

			controller.close();
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "application/x-ndjson",
			"Cache-Control": "no-store",
		},
	});
}
