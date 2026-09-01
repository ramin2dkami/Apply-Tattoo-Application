import type { NextConfig } from "next";

// Set by the GitHub Pages workflow to "/Apply-Tattoo-Application" so assets and
// routes resolve under the project-page subpath. Empty (root) everywhere else,
// e.g. Vercel or local dev.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Hides the floating "N" dev-mode badge Next.js overlays in the corner during
  // `next dev`. It never ships in production builds; this just removes it locally too.
  devIndicators: false,
  output: "export",
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
