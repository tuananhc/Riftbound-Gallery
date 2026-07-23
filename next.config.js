/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/elo/:path*",
        destination: "https://eloshowdown.com/api/v1/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
			{ hostname: "cmsassets.rgpub.io" },
			{ hostname: "assetcdn.rgpub.io" },
			{ hostname: "riftbound.s3.us-east-1.amazonaws.com" },
			{ hostname: "cdn.piltoverarchive.com" },
			{ hostname: "eloshowdown.com" },
		], // riftbound card images + crawled deck thumbnails
  },
};
module.exports = nextConfig;
