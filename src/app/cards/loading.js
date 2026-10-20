import { COLORS, LAYOUT, SHOW } from "../../lib/data";

const CARD_COUNT = 20;

function Bone({ width = "100%", height, borderRadius = 6, style = {} }) {
	return (
		<div className="bone" style={{
			width, height, borderRadius,
			background: COLORS.border,
			flexShrink: 0,
			...style,
		}} />
	);
}

function CardSkeleton() {
	return (
		<div style={{ aspectRatio: "744 / 1039", borderRadius: 0, overflow: "hidden", background: COLORS.bgCard, position: "relative" }}>
			<div className="bone" style={{ position: "absolute", inset: 0, borderRadius: 0 }} />
		</div>
	);
}

function SidebarSkeleton() {
	return (
		<div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${COLORS.border}`, padding: "20px 16px", display: SHOW.desktopFlex, flexDirection: "column", gap: 24 }}>
			{/* Search */}
			<Bone height={42} borderRadius={8} />

			{/* Color filters */}
			<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
				<Bone width={60} height={9} />
				<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
					{[...Array(6)].map((_, i) => (
						<Bone key={i} width={28} height={28} borderRadius="50%" />
					))}
				</div>
			</div>

			{/* Tag filters */}
			<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
				<Bone width={50} height={9} />
				<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
					{[...Array(5)].map((_, i) => (
						<Bone key={i} height={30} borderRadius={6} />
					))}
				</div>
			</div>

			{/* Cost range */}
			<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
				<Bone width={80} height={9} />
				<Bone height={4} borderRadius={2} />
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<Bone width={30} height={9} />
					<Bone width={30} height={9} />
				</div>
			</div>
		</div>
	);
}

export default function Loading() {
	return (
		<>
			<style suppressHydrationWarning>{`
				@keyframes shimmer {
					0%   { opacity: 0.5; }
					50%  { opacity: 1; }
					100% { opacity: 0.5; }
				}
				.bone {
					animation: shimmer 1.6s ease-in-out infinite;
				}
			`}</style>

			{/* Phone: the pinned search header's shape */}
			<div style={{ display: SHOW.mobileFlex, flexDirection: "column", gap: 8, padding: "10px 12px 8px", borderBottom: `1px solid ${COLORS.border}` }}>
				<div style={{ display: "flex", gap: 8 }}>
					<Bone height={48} borderRadius={0} />
					<Bone width={48} height={48} borderRadius={0} />
				</div>
				<div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
					<Bone width={120} height={10} />
					<Bone width={70} height={10} />
				</div>
			</div>

			<div style={{ display: "flex", minHeight: `calc(100vh - ${LAYOUT.navHeight})` }}>
				<SidebarSkeleton />

				<section style={{ flex: 1, minWidth: 0, padding: LAYOUT.cardsPad }}>
					{/* Toolbar row */}
					<div style={{ display: SHOW.desktopFlex, justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
						<Bone width={120} height={10} />
						<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
							<Bone width={110} height={30} borderRadius={6} />
							<Bone width={40} height={10} />
							<Bone width={90} height={30} borderRadius={6} />
						</div>
					</div>

					{/* Card grid */}
					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(200px, calc(50% - 5px)), 1fr))", columnGap: LAYOUT.gridColGap, rowGap: LAYOUT.gridRowGap }}>
						{[...Array(CARD_COUNT)].map((_, i) => (
							<CardSkeleton key={i} />
						))}
					</div>
				</section>
			</div>
		</>
	);
}
