import Link from "next/link";
import { getAllPosts } from "../../lib/posts";
import { COLORS, LAYOUT, alpha } from "../../lib/data";

const CATEGORY_CONFIG = {
	"Set Release":    { color: "#b08968", bg: COLORS.bgCard, icon: "🃏" },
	"Meta Report":    { color: COLORS.accent, bg: COLORS.bgCard, icon: "📊" },
	"Announcement":   { color: "#ffe57a", bg: COLORS.bgCard, icon: "📣" },
	"Dev Diary":      { color: COLORS.win, bg: COLORS.bgCard, icon: "📝" },
	"Tournament":     { color: "#a09bbf", bg: COLORS.bgCard, icon: "🏆" },
};

export default function NewsPage() {
	const posts = getAllPosts();
	const featured = posts[0];
	const rest = posts.slice(1);

	return (
		<>
			<style>{`
				.post-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 0; overflow: hidden; transition: all 0.25s; text-decoration: none; display: block; }
				.post-card:hover { border-color: var(--border-hover); transform: translateY(-3px); box-shadow: 0 8px 30px var(--shadow); }
				.category-badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 0; padding: 3px 12px; font-size: 10px; letter-spacing: 0.1em; }
				.featured-card { transition: all 0.25s; }
				.featured-card:hover { border-color: var(--border-hover) !important; transform: translateY(-2px); }
			`}</style>

			<div style={{ maxWidth: 1000, margin: "0 auto", padding: LAYOUT.contentPad }}>

				{/* Page title */}
				<div style={{ marginBottom: 36 }}>
					<h1 style={{ fontSize: "clamp(20px, 5.5vw, 28px)", fontWeight: 900, color: COLORS.accent, letterSpacing: "0.12em", marginBottom: 6 }}>
						RIFT DISPATCH
					</h1>
					<p style={{ fontSize: 15, color: COLORS.textMuted, fontStyle: "italic" }}>
						News, updates, and lore from the Riftbound universe.
					</p>
				</div>

				{/* Featured post */}
				{featured && (
					<Link href={`/news/${featured.slug}`} style={{ textDecoration: "none", display: "block", marginBottom: 36 }}>
						<div className="featured-card" style={{
							background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card) 60%, var(--bg-card) 100%)",
							border: `1px solid var(--border)`,
							borderRadius: 0, overflow: "hidden",
							position: "relative",
						}}>
							{/* Featured badge */}
							<div style={{
								position: "absolute", top: 20, left: 20,
								background: "color-mix(in srgb, var(--accent) 13%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 27%, transparent)",
								borderRadius: 0, padding: "3px 14px",
								fontSize: 10, color: COLORS.accent, letterSpacing: "0.15em",
							}}>★ FEATURED</div>

							<div style={{ padding: "52px clamp(16px, 4.5vw, 36px) clamp(16px, 4.5vw, 36px)" }}>
								{featured.category && (() => {
									const cat = CATEGORY_CONFIG[featured.category] || { color: COLORS.textMuted, bg: COLORS.border, icon: "📄" };
									return (
										<span className="category-badge" style={{ background: cat.bg, border: `1px solid ${alpha(cat.color, 27)}`, color: cat.color, marginBottom: 16 }}>
											{cat.icon} {featured.category.toUpperCase()}
										</span>
									);
								})()}
								<h2 style={{ fontSize: "clamp(19px, 5vw, 26px)", fontWeight: 900, color: COLORS.text, letterSpacing: "0.06em", lineHeight: 1.3, marginBottom: 12, marginTop: 12 }}>
									{featured.title}
								</h2>
								<p style={{ fontSize: "clamp(12px, 3.4vw, 15px)", color: COLORS.textMuted, lineHeight: 1.7, marginBottom: 20 }}>
									{featured.excerpt}
								</p>
								<div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 12px" }}>
									<span style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: "0.08em" }}>
										{new Date(featured.date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }).toUpperCase()}
									</span>
									{featured.author && (
										<>
											<span style={{ color: COLORS.textDim }}>·</span>
											<span style={{ fontSize: 11, color: COLORS.textDim }}>{featured.author.toUpperCase()}</span>
										</>
									)}
									<span style={{ marginLeft: "auto", fontSize: 12, color: COLORS.accent, letterSpacing: "0.1em" }}>
										READ MORE →
									</span>
								</div>
							</div>
						</div>
					</Link>
				)}

				{/* Grid */}
				{rest.length > 0 && (
					<>
						<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.2em", marginBottom: 16 }}>
							LATEST DISPATCHES
						</div>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: "clamp(10px, 3vw, 16px)" }}>
							{rest.map(post => {
								const cat = CATEGORY_CONFIG[post.category] || { color: COLORS.textMuted, bg: COLORS.border, icon: "📄" };
								return (
									<Link key={post.slug} href={`/news/${post.slug}`} className="post-card">
										<div style={{ padding: "clamp(14px, 3.5vw, 22px) clamp(14px, 3.5vw, 20px)" }}>
											<span className="category-badge" style={{ background: cat.bg, border: `1px solid ${alpha(cat.color, 27)}`, color: cat.color, marginBottom: 14 }}>
												{cat.icon} {(post.category || "NEWS").toUpperCase()}
											</span>
											<h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, letterSpacing: "0.04em", lineHeight: 1.4, marginBottom: 10, marginTop: 10 }}>
												{post.title}
											</h3>
											<p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 16,
																	display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
												{post.excerpt}
											</p>
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
												<span style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em" }}>
													{new Date(post.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }).toUpperCase()}
												</span>
												<span style={{ fontSize: 11, color: COLORS.textDim }}>→</span>
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					</>
				)}

				{posts.length === 0 && (
					<div style={{ textAlign: "center", padding: 80, color: COLORS.textDim, fontSize: 12, letterSpacing: "0.12em" }}>
						<div style={{ fontSize: 36, marginBottom: 12 }}>📜</div>
						NO DISPATCHES YET
					</div>
				)}
			</div>
		</>
	);
}
