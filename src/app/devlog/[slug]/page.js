import Link from "next/link";
import { getAllDevLogs, getDevLogBySlug } from "../../../lib/posts";
import { COLORS, FONT_MONO, LAYOUT } from "../../../lib/data";

export async function generateStaticParams() {
	const logs = await getAllDevLogs();
	return logs.map(log => ({ slug: log.slug }));
}

export async function generateMetadata(props) {
	const params = await props.params;
	const log = await getDevLogBySlug(params.slug);
	return { title: `${log.title || log.slug} — Dev Log` };
}

export default async function DevLogPostPage(props) {
	const params = await props.params;
	const log = await getDevLogBySlug(params.slug);

	return (
		<div style={{ maxWidth: 860, margin: "0 auto", padding: LAYOUT.contentPad }}>
			<style suppressHydrationWarning>{`
				.prose h1 { font-size: clamp(22px, 6vw, 26px); font-weight: 900; color: ${COLORS.accent}; letter-spacing: 0.1em; margin: 0 0 8px; }
				.prose h2 { font-size: 18px; font-weight: 700; color: var(--accent); letter-spacing: 0.06em; margin: 28px 0 10px; }
				.prose h3 { font-size: 14px; font-weight: 600; color: var(--accent); letter-spacing: 0.05em; margin: 20px 0 8px; }
				.prose p { font-size: 14px; color: var(--text-strong); line-height: 1.75; margin-bottom: 14px; }
				.prose strong { color: ${COLORS.text}; font-weight: 600; }
				.prose ul, .prose ol { margin: 0 0 14px 22px; }
				.prose li { font-size: 14px; color: var(--text-strong); line-height: 1.7; margin-bottom: 4px; }
				.prose hr { border: none; border-top: 1px solid ${COLORS.border}; margin: 24px 0; }
				.prose code { background: var(--border); border-radius: 0; padding: 2px 6px; font-size: 12px; color: var(--accent); font-family: ${FONT_MONO}; }
				.prose table { display: block; max-width: 100%; overflow-x: auto; border: 1px solid ${COLORS.border}; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
				.prose th { text-align: left; padding: 8px 12px; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.accent}; letter-spacing: 0.05em; }
				.prose td { padding: 8px 12px; border-bottom: 1px solid ${COLORS.border}; color: var(--text-strong); }
				.back-link { color: var(--text-dim); transition: color 0.2s; }
				.back-link:hover { color: var(--text-muted); }
			`}</style>

			<Link href="/devlog" className="back-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: "0.1em", marginBottom: 32, textDecoration: "none" }}>
				← DEV LOG
			</Link>

			{log.date && (
				<div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: "0.08em", marginBottom: 24 }}>
					{new Date(log.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()}
				</div>
			)}

			<article className="prose" dangerouslySetInnerHTML={{ __html: log.contentHtml }} />

			<div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${COLORS.border}` }}>
				<Link href="/devlog" className="back-link" style={{ fontSize: 12, letterSpacing: "0.1em", textDecoration: "none" }}>
					← BACK TO DEV LOG
				</Link>
			</div>
		</div>
	);
}
