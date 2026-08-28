/**
 * Turn an uploaded image into the pixels we actually measure and draw.
 *
 * Critically, this trims transparent padding first. Most tattoo PNGs arrive with
 * generous empty margins, and sizing the file's bounding box instead of the visible
 * artwork reports a number that is simply wrong — a 5 cm tattoo in a PNG that is half
 * empty would be quoted as 9 cm. specs/004 calls this out; it is the headline number
 * of the whole product, so it has to describe the ink.
 */

const ALPHA_FLOOR = 8;

export function prepareArtwork(img: HTMLImageElement, cap = 600): ImageData {
  const s = Math.min(1, cap / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * s));
  const h = Math.max(1, Math.round(img.height * s));

  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);

  const full = ctx.getImageData(0, 0, w, h);
  const box = inkBounds(full);
  if (!box) return full;                      // fully transparent: nothing to trim
  return ctx.getImageData(box.x, box.y, box.w, box.h);
}

export function inkBounds(
  d: ImageData,
): { x: number; y: number; w: number; h: number } | null {
  const { width, height, data } = d;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_FLOOR) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
