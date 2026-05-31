// Run with: node scripts/test-crawler.mjs
import crawlPiltoverArchive from "../src/lib/crawlers/piltover-archive.js";

const result = await crawlPiltoverArchive({ championName: "Jinx" });

console.log("\n=== DECKS FOUND ===");
console.dir(result.decks, { depth: 4 });

console.log("\n=== INTERCEPTED API REQUESTS ===");
result._meta.interceptedRequests.forEach((r) => {
	console.log(`${r.status} ${r.url}`);
	console.log("   preview:", r.preview);
});

console.log(`\nTotal decks scraped: ${result._meta.deckCount}`);
