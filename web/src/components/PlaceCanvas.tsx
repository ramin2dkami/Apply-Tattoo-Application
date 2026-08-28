"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FigureSvg } from "./FigureSvg";
import { prepareArtwork } from "@/lib/image";
import {
  formatSize, surfaceAt, unionViewBox,
  type FigureData, type Surfaceable, type ViewBox,
} from "@/lib/geometry";
import { render, type Placement } from "@/lib/warp";

const MIN_CM = 1.5;
const MAX_CM = 40;
const HANDLE = 13;

type Corner = "tl" | "tr" | "bl" | "br";
const OPPOSITE: Record<Corner, Corner> = { tl: "br", tr: "bl", bl: "tr", br: "tl" };

export function PlaceCanvas({
  data, selected, image,
}: {
  data: FigureData;
  selected: string[];
  image: HTMLImageElement;
}) {
  const chosen = useMemo(
    () => data.parts.filter((p) => selected.includes(p.id)),
    [data, selected],
  );

  /* A single part with real art is shown as-is — the actual reference drawing, not a
   * crop of the assembled body. Several parts (or a part we lack real art for, like
   * head/hips right now) fall back to the procedural figure, since spanning a joint
   * needs one shared coordinate space that only the assembled body provides. */
  const single = chosen.length === 1 ? chosen[0] : null;
  const real = single?.real ?? null;

  const art = real ? real.art : chosen.every((p) => p.view === "back") ? "back.svg" : "front.svg";
  const mirror = real?.mirror ?? false;
  const pxPerCm = real ? real.pxPerCm : data.figure.pxPerCm;
  const vb: ViewBox = useMemo(
    () => (real ? real.viewBox : unionViewBox(chosen)),
    [real, chosen],
  );
  const surfaces: Surfaceable[] = useMemo(
    () => (real ? [{ viewBox: real.viewBox, surface: { silhouette: real.silhouette } }] : chosen),
    [real, chosen],
  );

  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [avail, setAvail] = useState({ w: 0, h: 0 });
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [contour, setContour] = useState(true);

  const src = useMemo(() => prepareArtwork(image), [image]);

  const [place, setPlace] = useState<Placement>(() => {
    const cx = vb[0] + vb[2] / 2;
    const cy = vb[1] + vb[3] / 2;
    const surf = surfaceAt(surfaces, cx, cy);
    const acrossCm = surf ? (surf.r * 2) / pxPerCm : 12;
    return { cx, cy, widthCm: clamp(acrossCm * 0.62, MIN_CM, MAX_CM) };
  });
  const placedKey = useRef(selected.join(","));
  if (placedKey.current !== selected.join(",")) {
    placedKey.current = selected.join(",");
    const cx = vb[0] + vb[2] / 2;
    const cy = vb[1] + vb[3] / 2;
    const surf = surfaceAt(surfaces, cx, cy);
    const acrossCm = surf ? (surf.r * 2) / pxPerCm : 12;
    setPlace({ cx, cy, widthCm: clamp(acrossCm * 0.62, MIN_CM, MAX_CM) });
  }

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setAvail({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const box = useMemo(() => {
    if (!avail.w || !avail.h) return { w: 0, h: 0 };
    const f = Math.min(avail.w / vb[2], avail.h / vb[3]);
    return { w: vb[2] * f, h: vb[3] * f };
  }, [avail, vb]);

  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const scale = box.w ? (box.w * dpr) / vb[2] : 0;
  const cssScale = box.w ? box.w / vb[2] : 0;

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c || !scale) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    render({ ctx, src, placement: place, parts: surfaces, vb, scale, pxPerCm, contour });
  }, [src, place, surfaces, vb, scale, pxPerCm, contour]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !box.w) return;
    c.width = Math.round(box.w * dpr);
    c.height = Math.round(box.h * dpr);
    draw();
  }, [box, dpr, draw]);

  const toFig = useCallback(
    (clientX: number, clientY: number) => {
      const r = host.current!.querySelector(".stage")!.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * vb[2] + vb[0],
        y: ((clientY - r.top) / r.height) * vb[3] + vb[1],
      };
    },
    [vb],
  );

  // ---- move (drag body) ----
  const dragging = useRef<{ x: number; y: number } | null>(null);
  function bodyDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { x: e.clientX, y: e.clientY };
  }
  function bodyMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = ((e.clientX - dragging.current.x) / r.width) * vb[2];
    const dy = ((e.clientY - dragging.current.y) / r.height) * vb[3];
    dragging.current = { x: e.clientX, y: e.clientY };
    setPlace((p) => ({
      ...p,
      cx: clamp(p.cx + dx, vb[0], vb[0] + vb[2]),
      cy: clamp(p.cy + dy, vb[1], vb[1] + vb[3]),
    }));
  }
  function bodyUp() { dragging.current = null; }

  // ---- Figma-style corner handles: drag a corner, the opposite corner anchors,
  // the box scales uniformly (aspect ratio always locked — nobody wants a stretched
  // tattoo, and an artist can't quote from one). ----
  const hCm = place.widthCm * (src.height / src.width);
  const resizing = useRef<{
    corner: Corner; anchor: { x: number; y: number };
    startDist: number; startCx: number; startCy: number; startW: number;
  } | null>(null);

  function handleDown(corner: Corner, e: React.PointerEvent) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const halfW = (place.widthCm * pxPerCm) / 2;
    const halfH = (hCm * pxPerCm) / 2;
    const sign = { tl: [-1, -1], tr: [1, -1], bl: [-1, 1], br: [1, 1] }[corner];
    const opp = { tl: [1, 1], tr: [-1, 1], bl: [1, -1], br: [-1, -1] }[OPPOSITE[corner]];
    const anchor = { x: place.cx - opp[0] * halfW, y: place.cy - opp[1] * halfH };
    const corner0 = { x: place.cx + sign[0] * halfW, y: place.cy + sign[1] * halfH };
    const startDist = Math.hypot(corner0.x - anchor.x, corner0.y - anchor.y);
    resizing.current = {
      corner, anchor, startDist, startCx: place.cx, startCy: place.cy, startW: place.widthCm,
    };
  }
  function handleMove(e: React.PointerEvent) {
    const st = resizing.current;
    if (!st) return;
    const p = toFig(e.clientX, e.clientY);
    const dist = Math.hypot(p.x - st.anchor.x, p.y - st.anchor.y);
    const s = st.startDist > 0 ? dist / st.startDist : 1;
    const newW = clamp(st.startW * s, MIN_CM, MAX_CM);
    const clampedS = newW / st.startW;
    setPlace({
      cx: st.anchor.x + (st.startCx - st.anchor.x) * clampedS,
      cy: st.anchor.y + (st.startCy - st.anchor.y) * clampedS,
      widthCm: newW,
    });
  }
  function handleUp() { resizing.current = null; }

  const cxPx = box.w ? ((place.cx - vb[0]) / vb[2]) * box.w : 0;
  const cyPx = box.h ? ((place.cy - vb[1]) / vb[3]) * box.h : 0;
  const wPx = place.widthCm * pxPerCm * cssScale;
  const hPx = hCm * pxPerCm * cssScale;
  const corners: Record<Corner, { x: number; y: number }> = {
    tl: { x: cxPx - wPx / 2, y: cyPx - hPx / 2 },
    tr: { x: cxPx + wPx / 2, y: cyPx - hPx / 2 },
    bl: { x: cxPx - wPx / 2, y: cyPx + hPx / 2 },
    br: { x: cxPx + wPx / 2, y: cyPx + hPx / 2 },
  };

  return (
    <div className="card p-4">
      <div ref={host} className="flex h-[38vh] min-h-[280px] items-center justify-center">
        <div
          className="stage relative touch-none select-none"
          style={{ width: box.w || 1, height: box.h || 1 }}
        >
          <FigureSvg
            art={art} mirror={mirror} viewBox={vb}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
          <canvas
            ref={canvas}
            className="pointer-events-none absolute inset-0"
            style={{ width: "100%", height: "100%" }}
          />
          {/* drag-to-move surface, under the handles */}
          <div
            className="absolute inset-0 touch-none"
            onPointerDown={bodyDown}
            onPointerMove={bodyMove}
            onPointerUp={bodyUp}
            onPointerCancel={bodyUp}
          />
          {box.w > 0 && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: corners.tl.x, top: corners.tl.y, width: wPx, height: hPx,
                border: "1.5px solid var(--violet)",
              }}
            >
              {(Object.keys(corners) as Corner[]).map((c) => (
                <div
                  key={c}
                  className="pointer-events-auto absolute touch-none rounded-[3px] bg-white"
                  style={{
                    width: HANDLE, height: HANDLE,
                    left: c.includes("l") ? -HANDLE / 2 : undefined,
                    right: c.includes("r") ? -HANDLE / 2 : undefined,
                    top: c.includes("t") ? -HANDLE / 2 : undefined,
                    bottom: c.includes("b") ? -HANDLE / 2 : undefined,
                    border: "2px solid var(--violet)",
                    boxShadow: "0 1px 3px rgba(20,18,31,.25)",
                    cursor: c === "tl" || c === "br" ? "nwse-resize" : "nesw-resize",
                  }}
                  onPointerDown={(e) => handleDown(c, e)}
                  onPointerMove={handleMove}
                  onPointerUp={handleUp}
                  onPointerCancel={handleUp}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-[12.5px] font-semibold text-[var(--muted)]">Actual size</div>
          <div className="num mt-0.5" style={{ fontSize: 30 }}>
            {unit === "cm" ? place.widthCm.toFixed(1) : (place.widthCm / 2.54).toFixed(1)}
            <span className="ml-1 text-[16px] font-bold">{unit}</span>
          </div>
          <div className="mt-0.5 text-[12.5px] text-[var(--muted)]">
            {formatSize(place.widthCm, hCm, unit)}
          </div>
        </div>
        <div className="seg w-[104px]">
          {(["cm", "in"] as const).map((u) => (
            <button key={u} data-on={unit === u} onClick={() => setUnit(u)}>{u}</button>
          ))}
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t pt-3.5" style={{ borderColor: "var(--line)" }}>
        <div>
          <div className="text-[13.5px] font-bold tracking-[-0.02em]">Contour to the body</div>
          <div className="text-[12px] text-[var(--muted)]">Wrap it to the curve of the skin</div>
        </div>
        <button
          onClick={() => setContour((c) => !c)}
          className="relative h-[28px] w-[47px] shrink-0 rounded-full transition-colors"
          style={{ background: contour ? "var(--violet)" : "#ddd8ee" }}
          aria-pressed={contour}
        >
          <span
            className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all"
            style={{ left: contour ? 22 : 3, boxShadow: "0 1px 4px rgba(0,0,0,.25)" }}
          />
        </button>
      </div>

      <p className="mt-3 text-[12.5px] leading-snug text-[var(--muted)]">
        Drag the tattoo to move it, drag a corner to resize. The figure shows average
        proportions, so this is the size you want — not a measurement of your body.
      </p>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
