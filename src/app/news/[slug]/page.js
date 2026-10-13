import Link from "next/link";
import { getAllPosts, getPostBySlug } from "../../../lib/posts";
import { ALL_COLORS } from "../../../lib/cards/data";
import { COLORS, FONT_MONO, alpha } from "../../../lib/data";

const CATEGORY_CONFIG = {
	"Set Release":  { color: "#b08968", bg: COLORS.bgCard, icon: "🃏" },
	"Meta Report":  { color: COLORS.accent, bg: COLORS.bgCard, icon: "📊" },
	"Announcement": { color: "#ffe57a", bg: COLORS.bgCard, icon: "📣" },
	"Dev Diary":    { color: COLORS.win, bg: COLORS.bgCard, icon: "📝" },
	"Tournament":   { color: "#a09bbf", bg: COLORS.bgCard, icon: "🏆" },
};

export async function generateStaticParams() {
	const posts = getAllPosts();
	return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata(props) {
	const params = await props.params;
	const post = await getPostBySlug(params.slug);
	return { title: `${post.title} — Rift Dispatch` };
}

export default async function PostPage(props) {
	const params = await props.params;
	const post = await getPostBySlug(params.slug);
	const cat  = CATEGORY_CONFIG[post.category] || { color: COLORS.textMuted, bg: COLORS.border, icon: "📄" };

	return (
		<>
			<style>{`
				.prose { font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 17px; line-height: 1.8; color: var(--text); }
				.prose h2 { font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 20px; font-weight: 700; color: var(--accent); letter-spacing: 0.08em; margin: 36px 0 14px; }
				.prose h3 { font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 16px; font-weight: 600; color: var(--accent); letter-spacing: 0.06em; margin: 28px 0 10px; }
				.prose p  { margin-bottom: 18px; }
				.prose ul, .prose ol { margin: 0 0 18px 24px; }
				.prose li { margin-bottom: 6px; }
				.prose strong { color: var(--text); font-weight: 600; }
				.prose em { color: var(--text-muted); }
				.prose blockquote { border-left: 3px solid var(--border); margin: 24px 0; padding: 12px 20px; background: var(--bg-card); border-radius: 0 8px 8px 0; font-style: italic; color: var(--text-muted); }
				.prose a { color: var(--accent); text-decoration: underline; }
				.prose hr { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
				.prose code { background: var(--border); border-radius: 0; padding: 2px 6px; font-size: 13px; color: var(--accent); }
				.back-link { color: var(--text-dim); transition: color 0.2s; }
				.back-link:hover { color: var(--text-muted); }
			`}</style>

			<div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>

				{/* Back */}
				<Link href="/news" className="back-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: FONT_MONO, letterSpacing: "0.1em", marginBottom: 32, textDecoration: "none" }}>
					← RIFT DISPATCH
				</Link>

				{/* Category */}
				<div style={{ marginBottom: 16 }}>
					<span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: cat.bg, border: `1px solid ${alpha(cat.color, 27)}`, borderRadius: 0, padding: "3px 14px", fontSize: 10, color: cat.color, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>
						{cat.icon} {(post.category || "NEWS").toUpperCase()}
					</span>
				</div>

				{/* Title */}
				<h1 style={{ fontSize: 30, fontWeight: 900, color: ALL_COLORS.text, fontFamily: FONT_MONO, letterSpacing: "0.06em", lineHeight: 1.3, marginBottom: 16 }}>
					{post.title}
				</h1>

				{/* Meta */}
				<div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 36, paddingBottom: 24, borderBottom: `1px solid ${ALL_COLORS.border}` }}>
					<span style={{ fontSize: 12, color: ALL_COLORS.textDim, fontFamily: FONT_MONO, letterSpacing: "0.08em" }}>
						{new Date(post.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()}
					</span>
					{post.author && (
						<>
							<span style={{ color: ALL_COLORS.textDim }}>·</span>
							<span style={{ fontSize: 12, color: ALL_COLORS.textMuted, fontFamily: FONT_MONO }}>BY {post.author.toUpperCase()}</span>
						</>
					)}
				</div>

				{/* Content */}
				<article className="prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

				{/* Footer */}
				<div style={{ marginTop: 56, paddingTop: 24, borderTop: `1px solid ${ALL_COLORS.border}` }}>
					<Link href="/news" style={{ fontSize: 12, color: ALL_COLORS.accentDim, fontFamily: FONT_MONO, letterSpacing: "0.1em", textDecoration: "none" }}>
						← BACK TO RIFT DISPATCH
					</Link>
				</div>
			</div>
		</>
	);
}
