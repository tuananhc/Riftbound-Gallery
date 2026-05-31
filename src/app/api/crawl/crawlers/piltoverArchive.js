import { chromium } from "playwright";

const BASE_URL = "https://piltoverarchive.com";
const SEARCH_DEBOUNCE_MS = 1200;

/**
 * @param {{ championName?: string }} filters
 * @returns {Promise<{ decks: object[], _meta: object }>}
 */
export default async function crawlPiltoverArchive(filters = {}) {
	const { championName } = filters;

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		userAgent:
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
			"(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	});
	const page = await context.newPage();

	// Capture every JSON response so we can surface the real API endpoint
	const intercepted = [];
	page.on("response", async (response) => {
		const url = response.url();
		const ct = response.headers()["content-type"] ?? "";
		if (!ct.includes("application/json")) return;
		try {
			const json = await response.json();
			intercepted.push({ url, status: response.status(), data: json });
		} catch {
			// binary or non-JSON despite header — skip
		}
	});

	try {
		await page.goto(`${BASE_URL}/decks`, { waitUntil: "domcontentloaded", timeout: 30_000 });

		// Type champion name into the search input
		if (championName) {
			const searchInput = page.locator("main input[type='text']").first();
			await searchInput.waitFor({ state: "visible", timeout: 10_000 });
			await searchInput.fill(championName);
			// Wait for debounced search to fire and results to settle
			await page.waitForTimeout(SEARCH_DEBOUNCE_MS);
		}

		// Wait for at least one deck card to appear in the listing
		await page.waitForSelector("main [class*='deck'], main [class*='card'], main article", {
			timeout: 15_000,
		});

		// Scrape the rendered deck rows
		const decks = await page.evaluate(() => {
			const results = [];

			// Try common deck listing patterns — broad enough to survive minor DOM changes
			const rows = document.querySelectorAll(
				"main article, main [class*='deck-card'], main [class*='deckCard'], main li[class*='deck']"
			);

			rows.forEach((el) => {
				const text = (sel) => el.querySelector(sel)?.textContent?.trim() ?? null;
				const attr = (sel, a) => el.querySelector(sel)?.getAttribute(a) ?? null;

				// Deck page link — extract the ID from the href
				const anchor = el.querySelector("a[href*='/decks/']");
				const href = anchor?.getAttribute("href") ?? null;
				const idMatch = href?.match(/\/decks\/(?:view\/)?([^/?#]+)/);

				results.push({
					id:          idMatch?.[1] ?? null,
					href:        href ? `https://piltoverarchive.com${href}` : null,
					name:        text("h2, h3, [class*='name'], [class*='title']"),
					champion:    text("[class*='champion'], [class*='legend'], [class*='hero']"),
					author:      text("[class*='author'], [class*='user'], [class*='creator']"),
					winRate:     text("[class*='win'], [class*='rate']"),
					deckCount:   text("[class*='count'], [class*='view'], [class*='play']"),
					tags:        [...el.querySelectorAll("[class*='tag'], [class*='badge']")]
						.map((t) => t.textContent.trim())
						.filter(Boolean),
					thumbnail:   attr("img", "src"),
					rawText:     el.textContent.replace(/\s+/g, " ").trim().slice(0, 300),
				});
			});

			return results;
		});

		return {
			decks,
			_meta: {
				interceptedRequests: intercepted.map((r) => ({
					url:    r.url,
					status: r.status,
					// Include the first 500 chars of the response so you can see the shape
					preview: JSON.stringify(r.data).slice(0, 500),
				})),
				deckCount: decks.length,
				filters,
			},
		};
	} finally {
		await browser.close();
	}
}
