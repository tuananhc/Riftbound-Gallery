import Link from "next/link";
import { getAllDevLogs } from "../../lib/posts";
import { COLORS } from "../../lib/data";

export default async function DevLogPage() {
	const logs = await getAllDevLogs();

	return (
		<div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
			<style suppressHydrationWarning>{`.devlog-card { transition: border-color 0.2s; } .devlog-card:hover { border-color: ${COLORS.borderHover} !important; }`}</style>
			<div style={{ marginBottom: 36 }}>
				<h1 style={{ fontSize: 28, fontWeight: 900, color: COLORS.gold, letterSpacing: "0.12em", fontFamily: "'Segoe UI', system-ui, sans-serif", marginBottom: 6 }}>
					DEV LOG
				</h1>
				<p style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
					Architecture decisions, changes, and notes from development.
				</p>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				{logs.map(log => (
					<Link key={log.slug} href={`/devlog/${log.slug}`} style={{ textDecoration: "none" }}>
						<div className="devlog-card" style={{ background: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "18px 24px" }}>
							<div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif", marginBottom: 4 }}>
								{log.title || log.slug}
							</div>
							{log.date && (
								<div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: "0.08em" }}>
									{new Date(log.date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }).toUpperCase()}
								</div>
							)}
						</div>
					</Link>
				))}
			</div>

			{logs.length === 0 && (
				<div style={{ textAlign: "center", padding: 80, color: COLORS.textDim, fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 12, letterSpacing: "0.12em" }}>
					<div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
					NO LOGS YET
				</div>
			)}
		</div>
	);
}
