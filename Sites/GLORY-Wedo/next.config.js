const { setupDevPlatform } = require("@cloudflare/next-on-pages/next-dev");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // 若要嵌入 NOBLE HOUSE GLORY 官網（對齊建議書 iframe 情境）
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [{ key: "X-Frame-Options", value: "ALLOWALL" }],
      },
    ];
  },
};

if (process.env.NODE_ENV === "development") {
  setupDevPlatform();
}

module.exports = nextConfig;
