import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the floating "N" dev-mode badge Next.js overlays in the corner during
  // `next dev`. It never ships in production builds; this just removes it locally too.
  devIndicators: false,
};

export default nextConfig;
