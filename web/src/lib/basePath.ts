// Mirrors next.config.ts's basePath so plain <img src> and fetch() calls to
// files under public/ resolve correctly when the app is served from a
// subpath (GitHub Pages project sites). next/link and next/navigation already
// handle this automatically; this helper is only for the handful of places
// that build a static asset path by hand.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  return `${basePath}${path}`;
}
