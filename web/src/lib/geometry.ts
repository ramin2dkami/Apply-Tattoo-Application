/**
 * Geometry for placing a tattoo on the figure.
 *
 * Every number here traces back to assets/tools/build_figure.py: the figure is a
 * 180 cm body at a fixed pxPerCm, so sizes in centimetres are exact by construction
 * rather than estimated. The contour warp reads the same silhouette the drawing was
 * generated from — see specs/004 and specs/005.
 */

export type SilPoint = { y: number; left: number; right: number };

/** A part carries its PROCEDURAL geometry always (shared coordinate space, used
 *  when several parts are selected together) and, where we have one, a REAL
 *  overlay traced from the actual reference artwork (used when it's the only part
 *  selected, so the customer sees the real drawing instead of an assembled crop). */
export type RealArt = {
  art: string;
  view: "front" | "back";
  viewBox: [number, number, number, number];
  pxPerCm: number;
  silhouette: SilPoint[];
  mirror: boolean;
};

export type Part = {
  id: string;
  label: string;
  art: string;
  view: "front" | "back";
  lengthCm: number;
  viewBox: [number, number, number, number];
  rotation: { model: "cylinder" | "views"; degrees?: number; views?: string[] };
  surface: { model: string; silhouette: SilPoint[] };
  real?: RealArt;
};

/** The minimal shape edgesAt/surfaceAt/unionViewBox actually need — lets a single
 *  real part's local geometry stand in for a full Part without fabricating one. */
export type Surfaceable = {
  viewBox: [number, number, number, number];
  surface: { silhouette: SilPoint[] };
};

export type FigureData = {
  figure: {
    art: string; artBack: string; heightCm: number;
    canvas: { width: number; height: number }; pxPerCm: number;
  };
  parts: Part[];
};

export type ViewBox = [number, number, number, number];
export type Surface = { cx: number; r: number };

/** Left and right edge of a surface at height y, or null if y is off the part. */
export function edgesAt(sil: SilPoint[], y: number): [number, number] | null {
  if (!sil.length) return null;
  if (y < sil[0].y || y > sil[sil.length - 1].y) return null;
  for (let i = 0; i < sil.length - 1; i++) {
    const a = sil[i], b = sil[i + 1];
    if (y <= b.y) {
      const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
      return [a.left + (b.left - a.left) * t, a.right + (b.right - a.right) * t];
    }
  }
  const z = sil[sil.length - 1];
  return [z.left, z.right];
}

/**
 * The surface under a point. With several parts selected, more than one can cover a
 * given height (both arms, say), so pick the nearest horizontally. That is what makes
 * a selection spanning a joint behave as one continuous surface while two separate
 * limbs stay separate.
 */
export function surfaceAt(parts: Surfaceable[], x: number, y: number): Surface | null {
  let best: Surface | null = null;
  let bestDist = Infinity;
  for (const p of parts) {
    const e = edgesAt(p.surface.silhouette, y);
    if (!e) continue;
    const cx = (e[0] + e[1]) / 2;
    const r = (e[1] - e[0]) / 2;
    if (r <= 1) continue;
    const d = Math.abs(x - cx);
    if (d < bestDist) { bestDist = d; best = { cx, r }; }
  }
  return best;
}

export function unionViewBox(parts: Surfaceable[], pad = 26): ViewBox {
  const x0 = Math.min(...parts.map((p) => p.viewBox[0]));
  const y0 = Math.min(...parts.map((p) => p.viewBox[1]));
  const x1 = Math.max(...parts.map((p) => p.viewBox[0] + p.viewBox[2]));
  const y1 = Math.max(...parts.map((p) => p.viewBox[1] + p.viewBox[3]));
  return [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2];
}

export function silhouettePoints(sil: SilPoint[]): string {
  const down = sil.map((p) => `${p.left},${p.y}`);
  const up = [...sil].reverse().map((p) => `${p.right},${p.y}`);
  return [...down, ...up].join(" ");
}

export const CM_PER_IN = 2.54;

export function formatSize(wCm: number, hCm: number, unit: "cm" | "in"): string {
  if (unit === "cm") return `${wCm.toFixed(1)} × ${hCm.toFixed(1)} cm`;
  return `${(wCm / CM_PER_IN).toFixed(1)} × ${(hCm / CM_PER_IN).toFixed(1)} in`;
}
