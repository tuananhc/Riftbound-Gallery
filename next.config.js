/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
			{ hostname: "cmsassets.rgpub.io" },
			{ hostname: "assetcdn.rgpub.io" },
			{ hostname: "riftbound.s3.us-east-1.amazonaws.com" },
			{ hostname: "cdn.piltoverarchive.com" },
		], // riftbound card images + crawled deck thumbnails
  },
};
module.exports = nextConfig;
