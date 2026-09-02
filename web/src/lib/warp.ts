/**
 * Contour warp — specs/005.
 *
 * A limb is a stack of near-circular cross-sections, so the silhouette IS the surface
 * model: half-width at a height is the cylinder radius. Radius is resolved PER ROW,
 * which is what lets artwork cross a joint where the limb narrows and widens again.
 * A single radius for the whole tattoo looks fine on a small piece and visibly wrong
 * on anything spanning.
 */

import { surfaceAt, type Surfaceable, type ViewBox } from "./geometry";

export type Placement = { cx: number; cy: number; widthCm: number; heightCm?: number };

/** Ink never fades to nothing: on white, a tattoo that vanishes at the edge reads as
 *  a rendering bug rather than a surface turning away. */
const MIN_INK = 0.45;

export type WarpInput = {
  ctx: CanvasRenderingContext2D;
  src: ImageData;
  placement: Placement;
  parts: Surfaceable[];
  vb: ViewBox;
  scale: number;      // figure px -> canvas px
  pxPerCm: number;
  contour: boolean;
};

export function render({
  ctx, src, placement, parts, vb, scale, pxPerCm, contour,
}: WarpInput) {
  const cv = ctx.canvas;
  ctx.clearRect(0, 0, cv.width, cv.height);

  const SW = src.width, SH = src.height;
  const wFig = placement.widthCm * pxPerCm;
  const hFig = placement.heightCm != null ? placement.heightCm * pxPerCm : wFig * (SH / SW);

  const cxC = (placement.cx - vb[0]) * scale;
  const cyC = (placement.cy - vb[1]) * scale;
  const Wt = wFig * scale;
  const Ht = hFig * scale;
  const top = cyC - Ht / 2;

  if (!contour) {
    const off = document.createElement("canvas");
    off.width = SW; off.height = SH;
    off.getContext("2d")!.putImageData(src, 0, 0);
    ctx.drawImage(off, cxC - Wt / 2, top, Wt, Ht);
    return;
  }

  const y0 = Math.max(0, Math.floor(top));
  const y1 = Math.min(cv.height, Math.ceil(top + Ht));
  if (y1 <= y0) return;

  const out = ctx.createImageData(cv.width, y1 - y0);
  const O = out.data, S = src.data;

  for (let y = y0; y < y1; y++) {
    const figY = y / scale + vb[1];
    // clamped: rows past the top or bottom of the part keep the end cross-section,
    // so artwork that overhangs is drawn whole instead of being cut off mid-image.
    const surf = surfaceAt(parts, placement.cx, figY, true);
    if (!surf) continue;

    const cx = (surf.cx - vb[0]) * scale;
    const R = surf.r * scale;
    if (R <= 1) continue;

    // arc-length offset of the tattoo's centre around the cylinder
    const st = R * Math.asin(Math.max(-1, Math.min(1, (cxC - cx) / R)));
    const sv = ((y - top) / Ht) * (SH - 1);
    const row = (y - y0) * cv.width * 4;

    for (let x = 0; x < cv.width; x++) {
      const n = (x - cx) / R;
      if (n < -1 || n > 1) continue;
      const s = R * Math.asin(n);
      const u = s - st + Wt / 2;
      if (u < 0 || u > Wt) continue;

      const su = (u / Wt) * (SW - 1);
      const o = row + x * 4;
      sample(S, SW, SH, su, sv, O, o);
      O[o + 3] *= MIN_INK + (1 - MIN_INK) * Math.cos(s / R);
    }
  }
  ctx.putImageData(out, 0, y0);
}

function sample(
  S: Uint8ClampedArray, SW: number, SH: number,
  x: number, y: number, O: Uint8ClampedArray, o: number,
) {
  x = Math.max(0, Math.min(SW - 1.001, x));
  y = Math.max(0, Math.min(SH - 1.001, y));
  const x0 = x | 0, y0 = y | 0;
  const fx = x - x0, fy = y - y0;
  const i00 = (y0 * SW + x0) * 4;
  const i10 = (y0 * SW + x0 + 1) * 4;
  const i01 = ((y0 + 1) * SW + x0) * 4;
  const i11 = ((y0 + 1) * SW + x0 + 1) * 4;
  for (let k = 0; k < 4; k++) {
    O[o + k] =
      (S[i00 + k] * (1 - fx) + S[i10 + k] * fx) * (1 - fy) +
      (S[i01 + k] * (1 - fx) + S[i11 + k] * fx) * fy;
  }
}
