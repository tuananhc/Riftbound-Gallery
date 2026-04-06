import Link from "next/link";
import { getAllPosts, getPostBySlug } from "../../../lib/posts";
import { COLORS } from "../../../lib/cards/data";

const CATEGORY_CONFIG = {
  "Set Release":  { color: "#ff6b3d", bg: "#2a1008", icon: "🃏" },
  "Meta Report":  { color: "#4db8ff", bg: "#081a2a", icon: "📊" },
  "Announcement": { color: "#ffe57a", bg: "#2a2208", icon: "📣" },
  "Dev Diary":    { color: "#81c784", bg: "#0a1f0a", icon: "📝" },
  "Tournament":   { color: "#ce93d8", bg: "#1a0a2a", icon: "🏆" },
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
  const cat  = CATEGORY_CONFIG[post.category] || { color: "#888", bg: "#1a1c28", icon: "📄" };

  return (
    <>
      <style>{`
        .prose { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 17px; line-height: 1.8; color: #c8c0b0; }
        .prose h2 { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 20px; font-weight: 700; color: #e8d090; letter-spacing: 0.08em; margin: 36px 0 14px; }
        .prose h3 { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 16px; font-weight: 600; color: #c8b870; letter-spacing: 0.06em; margin: 28px 0 10px; }
        .prose p  { margin-bottom: 18px; }
        .prose ul, .prose ol { margin: 0 0 18px 24px; }
        .prose li { margin-bottom: 6px; }
        .prose strong { color: #e8d8b0; font-weight: 600; }
        .prose em { color: #a8a090; }
        .prose blockquote { border-left: 3px solid #3a3050; margin: 24px 0; padding: 12px 20px; background: #0d0f17; border-radius: 0 8px 8px 0; font-style: italic; color: #8a8080; }
        .prose a { color: #6090e0; text-decoration: underline; }
        .prose hr { border: none; border-top: 1px solid #1a1c28; margin: 32px 0; }
        .prose code { background: #1a1c28; border-radius: 4px; padding: 2px 6px; font-size: 13px; color: #80deea; }
        .back-link { color: #3a3a5a; transition: color 0.2s; }
        .back-link:hover { color: #6a6a8a; }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>

        {/* Back */}
        <Link href="/news" className="back-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em", marginBottom: 32, textDecoration: "none" }}>
          ← RIFT DISPATCH
        </Link>

        {/* Category */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: cat.bg, border: `1px solid ${cat.color}44`, borderRadius: 20, padding: "3px 14px", fontSize: 10, color: cat.color, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em" }}>
            {cat.icon} {(post.category || "NEWS").toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 30, fontWeight: 900, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.06em", lineHeight: 1.3, marginBottom: 16 }}>
          {post.title}
        </h1>

        {/* Meta */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 36, paddingBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ fontSize: 12, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em" }}>
            {new Date(post.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()}
          </span>
          {post.author && (
            <>
              <span style={{ color: COLORS.textDim }}>·</span>
              <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>BY {post.author.toUpperCase()}</span>
            </>
          )}
        </div>

        {/* Content */}
        <article className="prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

        {/* Footer */}
        <div style={{ marginTop: 56, paddingTop: 24, borderTop: `1px solid ${COLORS.border}` }}>
          <Link href="/news" style={{ fontSize: 12, color: COLORS.goldDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em", textDecoration: "none" }}>
            ← BACK TO RIFT DISPATCH
          </Link>
        </div>
      </div>
    </>
  );
}
