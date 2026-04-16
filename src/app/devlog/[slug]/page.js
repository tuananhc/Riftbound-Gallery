import Link from "next/link";
import { getAllDevLogs, getDevLogBySlug } from "../../../lib/posts";
import { COLORS } from "../../../lib/data";

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
		<div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
			<style suppressHydrationWarning>{`
				.prose h1 { font-size: 26px; font-weight: 900; color: ${COLORS.gold}; letter-spacing: 0.1em; margin: 0 0 8px; font-family: 'Segoe UI', system-ui, sans-serif; }
				.prose h2 { font-size: 18px; font-weight: 700; color: #e8d090; letter-spacing: 0.06em; margin: 28px 0 10px; font-family: 'Segoe UI', system-ui, sans-serif; }
				.prose h3 { font-size: 14px; font-weight: 600; color: #c8b870; letter-spacing: 0.05em; margin: 20px 0 8px; font-family: 'Segoe UI', system-ui, sans-serif; }
				.prose p { font-size: 14px; color: #ffffff; line-height: 1.75; margin-bottom: 14px; font-family: 'Segoe UI', system-ui, sans-serif; }
				.prose strong { color: ${COLORS.text}; font-weight: 600; }
				.prose ul, .prose ol { margin: 0 0 14px 22px; }
				.prose li { font-size: 14px; color: #ffffff; line-height: 1.7; margin-bottom: 4px; font-family: 'Segoe UI', system-ui, sans-serif; }
				.prose hr { border: none; border-top: 1px solid ${COLORS.border}; margin: 24px 0; }
				.prose code { background: #1a1c28; border-radius: 4px; padding: 2px 6px; font-size: 12px; color: #80deea; }
				.prose table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
				.prose th { text-align: left; padding: 8px 12px; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.gold}; font-family: 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.05em; }
				.prose td { padding: 8px 12px; border-bottom: 1px solid ${COLORS.border}; color: #ffffff; font-family: 'Segoe UI', system-ui, sans-serif; }
				.back-link { color: #3a3a5a; transition: color 0.2s; }
				.back-link:hover { color: #6a6a8a; }
			`}</style>

			<Link href="/devlog" className="back-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em", marginBottom: 32, textDecoration: "none" }}>
				← DEV LOG
			</Link>

			{log.date && (
				<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em", marginBottom: 24 }}>
					{new Date(log.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()}
				</div>
			)}

			<article className="prose" dangerouslySetInnerHTML={{ __html: log.contentHtml }} />

			<div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${COLORS.border}` }}>
				<Link href="/devlog" className="back-link" style={{ fontSize: 12, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.1em", textDecoration: "none" }}>
					← BACK TO DEV LOG
				</Link>
			</div>
		</div>
	);
}
