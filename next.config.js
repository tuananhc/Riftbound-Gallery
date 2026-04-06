/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
			{ hostname: "cmsassets.rgpub.io" },
			{ hostname: "assetcdn.rgpub.io" },
		], // riftbound card images
  },
};
module.exports = nextConfig;
