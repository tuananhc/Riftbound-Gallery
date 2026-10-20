"use client";
import { useState } from "react";
import Image from "next/image";
import { COLORS, FONT_MONO } from "../../lib/data";

// Square champion icon from S3, falling back to the card art (cropped to the
// top), then the champion's initial when there's no image at all.
export default function LegendIcon({ legend, size, borderColor }) {
	const [failed, setFailed] = useState(false);
	const src = !failed && legend?.icon ? legend.icon : legend?.image;
	return (
		<div style={{
			position: "relative", width: size, height: size, flexShrink: 0, overflow: "hidden",
			background: COLORS.bgHover, border: `1px solid ${borderColor ?? COLORS.border}`,
			display: "flex", alignItems: "center", justifyContent: "center",
			fontSize: 10, fontWeight: 700, color: COLORS.textMuted, fontFamily: FONT_MONO,
		}}>
			{src
				? <Image src={src} alt="" fill sizes={`${size}px`} style={{ objectFit: "cover", objectPosition: failed ? "top" : "center" }}
					onError={() => setFailed(true)} />
				: legend?.tags_text?.slice(0, 2) ?? "?"}
		</div>
	);
}
