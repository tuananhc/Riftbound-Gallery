import Link from "next/link";
import { getAllPosts } from "../../lib/posts";
import { COLORS, FONT_MONO } from "../../lib/data";

const CATEGORY_CONFIG = {
	"Set Release":    { color: "#b08968", bg: "#1a1a1a", icon: "🃏" },
	"Meta Report":    { color: "#8fa3bf", bg: "#1a1a1a", icon: "📊" },
	"Announcement":   { color: "#ffe57a", bg: "#1a1a1a", icon: "📣" },
	"Dev Diary":      { color: "#5fbf5f", bg: "#1a1a1a", icon: "📝" },
	"Tournament":     { color: "#a09bbf", bg: "#1a1a1a", icon: "🏆" },
};

export default function NewsPage() {
	const posts = getAllPosts();
	const featured = posts[0];
	const rest = posts.slice(1);

	return (
		<>
			<style>{`
				.post-card { background: #1a1a1a; border: 1px solid #333333; border-radius: 0; overflow: hidden; transition: all 0.25s; text-decoration: none; display: block; }
				.post-card:hover { border-color: #4a4a4a; transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.4); }
				.category-badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 0; padding: 3px 12px; font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10px; letter-spacing: 0.1em; }
				.featured-card { transition: all 0.25s; }
				.featured-card:hover { border-color: #4a4a4a !important; transform: translateY(-2px); }
			`}</style>

			<div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>

				{/* Page title */}
				<div style={{ marginBottom: 36 }}>
					<h1 style={{ fontSize: 28, fontWeight: 900, color: COLORS.accent, letterSpacing: "0.12em", fontFamily: FONT_MONO, marginBottom: 6 }}>
						RIFT DISPATCH
					</h1>
					<p style={{ fontSize: 15, color: COLORS.textMuted, fontFamily: FONT_MONO, fontStyle: "italic" }}>
						News, updates, and lore from the Riftbound universe.
					</p>
				</div>

				{/* Featured post */}
				{featured && (
					<Link href={`/news/${featured.slug}`} style={{ textDecoration: "none", display: "block", marginBottom: 36 }}>
						<div className="featured-card" style={{
							background: "linear-gradient(135deg, #1a1a1a 0%, #1a1a1a 60%, #1a1a1a 100%)",
							border: `1px solid #2a2a3a`,
							borderRadius: 0, overflow: "hidden",
							position: "relative",
						}}>
							{/* Featured badge */}
							<div style={{
								position: "absolute", top: 20, left: 20,
								background: "#8fa3bf22", border: "1px solid #8fa3bf44",
								borderRadius: 0, padding: "3px 14px",
								fontSize: 10, color: COLORS.accent, fontFamily: FONT_MONO, letterSpacing: "0.15em",
							}}>★ FEATURED</div>

							<div style={{ padding: "52px 36px 36px" }}>
								{featured.category && (() => {
									const cat = CATEGORY_CONFIG[featured.category] || { color: "#8a8a8d", bg: "#333333", icon: "📄" };
									return (
										<span className="category-badge" style={{ background: cat.bg, border: `1px solid ${cat.color}44`, color: cat.color, marginBottom: 16 }}>
											{cat.icon} {featured.category.toUpperCase()}
										</span>
									);
								})()}
								<h2 style={{ fontSize: 26, fontWeight: 900, color: COLORS.text, fontFamily: FONT_MONO, letterSpacing: "0.06em", lineHeight: 1.3, marginBottom: 12, marginTop: 12 }}>
									{featured.title}
								</h2>
								<p style={{ fontSize: 15, color: COLORS.textMuted, fontFamily: FONT_MONO, lineHeight: 1.7, marginBottom: 20 }}>
									{featured.excerpt}
								</p>
								<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
									<span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.08em" }}>
										{new Date(featured.date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }).toUpperCase()}
									</span>
									{featured.author && (
										<>
											<span style={{ color: COLORS.textDim }}>·</span>
											<span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONT_MONO }}>{featured.author.toUpperCase()}</span>
										</>
									)}
									<span style={{ marginLeft: "auto", fontSize: 12, color: COLORS.accent, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>
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
						<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.2em", fontFamily: FONT_MONO, marginBottom: 16 }}>
							LATEST DISPATCHES
						</div>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
							{rest.map(post => {
								const cat = CATEGORY_CONFIG[post.category] || { color: "#8a8a8d", bg: "#333333", icon: "📄" };
								return (
									<Link key={post.slug} href={`/news/${post.slug}`} className="post-card">
										<div style={{ padding: "22px 20px" }}>
											<span className="category-badge" style={{ background: cat.bg, border: `1px solid ${cat.color}44`, color: cat.color, marginBottom: 14 }}>
												{cat.icon} {(post.category || "NEWS").toUpperCase()}
											</span>
											<h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, fontFamily: FONT_MONO, letterSpacing: "0.04em", lineHeight: 1.4, marginBottom: 10, marginTop: 10 }}>
												{post.title}
											</h3>
											<p style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: FONT_MONO, lineHeight: 1.6, marginBottom: 16,
																	display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
												{post.excerpt}
											</p>
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
												<span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.06em" }}>
													{new Date(post.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }).toUpperCase()}
												</span>
												<span style={{ fontSize: 11, color: "#5f5f62", fontFamily: FONT_MONO }}>→</span>
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					</>
				)}

				{posts.length === 0 && (
					<div style={{ textAlign: "center", padding: 80, color: COLORS.textDim, fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.12em" }}>
						<div style={{ fontSize: 36, marginBottom: 12 }}>📜</div>
						NO DISPATCHES YET
					</div>
				)}
			</div>
		</>
	);
}
