"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FigureSvg } from "./FigureSvg";
import { prepareArtwork } from "@/lib/image";
import { formatSize, surfaceAt, type Part, type Surfaceable, type ViewBox } from "@/lib/geometry";
import { render, type Placement } from "@/lib/warp";

const MIN_CM = 1.5;
const MAX_CM = 40;
const HANDLE = 13;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Corner = "tl" | "tr" | "bl" | "br";
const OPPOSITE: Record<Corner, Corner> = { tl: "br", tr: "bl", bl: "tr", br: "tl" };

export function PlaceCanvas({
  part, image, onRemove, proceduralPxPerCm,
}: {
  part: Part;
  image: HTMLImageElement;
  onRemove: () => void;
  /** px/cm for the assembled-figure fallback (head, hips) — real art carries its own. */
  proceduralPxPerCm: number;
}) {
  /* A part with real art shows the actual reference drawing. Otherwise (head, hips —
   * their traces came back broken, see assets/README.md) it falls back to the
   * procedural one. Either way this card renders exactly one part, in that part's own
   * coordinate space — no union with anything else. */
  const real = part.real ?? null;
  const art = real ? real.art : part.art;
  const mirror = real?.mirror ?? false;
  const pxPerCm = real ? real.pxPerCm : proceduralPxPerCm;
  const vb: ViewBox = real ? real.viewBox : part.viewBox;
  const surfaces: Surfaceable[] = useMemo(
    () => (real ? [{ viewBox: real.viewBox, surface: { silhouette: real.silhouette } }]
                : [{ viewBox: part.viewBox, surface: part.surface }]),
    [real, part],
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

  // ---- view zoom/pan, independent of the tattoo's own placement ----
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  function zoomBy(f: number) {
    setZoom((z) => clamp(z * f, MIN_ZOOM, MAX_ZOOM));
  }
  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); }

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
  /* The canvas's own pixel buffer has to grow with the view zoom, not just the CSS
   * box — otherwise zooming in just stretches the same fixed-resolution bitmap larger
   * (the CSS `scale()` transform on .stage does that automatically), which is exactly
   * what made the tattoo go blurry while the vector figure stayed crisp. */
  const scale = box.w ? (box.w * dpr * zoom) / vb[2] : 0;
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
    c.width = Math.round(box.w * dpr * zoom);
    c.height = Math.round(box.h * dpr * zoom);
    draw();
  }, [box, dpr, zoom, draw]);

  /* getBoundingClientRect on the (visually zoomed) stage already reflects the CSS
   * transform, so figure-space math below stays correct at any zoom level for free —
   * and a given finger movement naturally maps to a smaller figure-space delta when
   * zoomed in, which is exactly the finer control zooming is for. */
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

  // ---- gesture routing on the stage surface ----
  // One finger acts on the tattoo (move); two fingers act on the view (pinch-zoom
  // and pan) — the same split most drawing apps use, and it keeps the two concerns
  // from fighting over the same gesture.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const pinchStart = useRef<{
    dist: number; zoom: number; pan: { x: number; y: number };
    mid: { x: number; y: number };
  } | null>(null);

  function surfaceDown(e: React.PointerEvent) {
    // State tracking must not depend on capture succeeding — a synthetic or
    // otherwise unusual pointer can make setPointerCapture throw, and losing the
    // pointer map entry when that happens breaks gesture tracking silently.
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2) {
      dragStart.current = null;
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y), zoom, pan: { ...pan },
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  }
  function surfaceMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const nz = clamp(pinchStart.current.zoom * (dist / pinchStart.current.dist), MIN_ZOOM, MAX_ZOOM);
      setZoom(nz);
      setPan({
        x: pinchStart.current.pan.x + (mid.x - pinchStart.current.mid.x),
        y: pinchStart.current.pan.y + (mid.y - pinchStart.current.mid.y),
      });
      return;
    }
    if (dragStart.current) {
      const r = host.current!.querySelector(".stage")!.getBoundingClientRect();
      const dx = ((e.clientX - dragStart.current.x) / r.width) * vb[2];
      const dy = ((e.clientY - dragStart.current.y) / r.height) * vb[3];
      dragStart.current = { x: e.clientX, y: e.clientY };
      setPlace((p) => ({
        ...p,
        cx: clamp(p.cx + dx, vb[0], vb[0] + vb[2]),
        cy: clamp(p.cy + dy, vb[1], vb[1] + vb[3]),
      }));
    }
  }
  function surfaceUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) dragStart.current = null;
  }

  // ---- Figma-style corner handles: aspect ratio always locked ----
  const hCm = place.widthCm * (src.height / src.width);
  const resizing = useRef<{
    corner: Corner; anchor: { x: number; y: number };
    startDist: number; startCx: number; startCy: number; startW: number;
  } | null>(null);

  function handleDown(corner: Corner, e: React.PointerEvent) {
    e.stopPropagation();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    const halfW = (place.widthCm * pxPerCm) / 2;
    const halfH = (hCm * pxPerCm) / 2;
    const sign = { tl: [-1, -1], tr: [1, -1], bl: [-1, 1], br: [1, 1] }[corner];
    const opp = { tl: [1, 1], tr: [-1, 1], bl: [1, -1], br: [-1, -1] }[OPPOSITE[corner]];
    const anchor = { x: place.cx - opp[0] * halfW, y: place.cy - opp[1] * halfH };
    const corner0 = { x: place.cx + sign[0] * halfW, y: place.cy + sign[1] * halfH };
    resizing.current = {
      corner, anchor, startDist: Math.hypot(corner0.x - anchor.x, corner0.y - anchor.y),
      startCx: place.cx, startCy: place.cy, startW: place.widthCm,
    };
  }
  function handleMove(e: React.PointerEvent) {
    const st = resizing.current;
    if (!st) return;
    const p = toFig(e.clientX, e.clientY);
    const dist = Math.hypot(p.x - st.anchor.x, p.y - st.anchor.y);
    const s = st.startDist > 0 ? dist / st.startDist : 1;
    const newW = clamp(st.startW * s, MIN_CM, MAX_CM);
    const cs = newW / st.startW;
    setPlace({
      cx: st.anchor.x + (st.startCx - st.anchor.x) * cs,
      cy: st.anchor.y + (st.startCy - st.anchor.y) * cs,
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
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[14px] font-extrabold tracking-[-0.02em]">{part.label}</span>
        <button
          onClick={onRemove}
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ background: "#f4f2fa" }}
          aria-label={`Remove ${part.label}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b6880"
               strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div ref={host} className="relative h-[34vh] min-h-[240px] overflow-hidden rounded-2xl" style={{ background: "#fbfaff" }}>
        <div
          className="stage absolute left-1/2 top-1/2 touch-none select-none"
          style={{
            width: box.w || 1, height: box.h || 1,
            transform: `translate(-50%,-50%) translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            transition: pinchStart.current ? "none" : "transform .12s ease-out",
          }}
          onPointerDown={surfaceDown}
          onPointerMove={surfaceMove}
          onPointerUp={surfaceUp}
          onPointerCancel={surfaceUp}
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
          {box.w > 0 && (
            <div
              className="pointer-events-none absolute"
              style={{ left: corners.tl.x, top: corners.tl.y, width: wPx, height: hPx, border: "1.5px solid var(--violet)" }}
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

        <div className="absolute bottom-2.5 right-2.5 flex flex-col overflow-hidden rounded-xl" style={{ boxShadow: "0 2px 10px rgba(20,18,31,.16)" }}>
          <ZoomBtn onClick={() => zoomBy(1.4)} label="Zoom in">+</ZoomBtn>
          <div style={{ height: 1, background: "#eee9f7" }} />
          <ZoomBtn onClick={() => zoomBy(1 / 1.4)} label="Zoom out">−</ZoomBtn>
          {zoom !== 1 && (
            <>
              <div style={{ height: 1, background: "#eee9f7" }} />
              <ZoomBtn onClick={resetView} label="Reset zoom" small>⟲</ZoomBtn>
            </>
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
        One finger to move the tattoo, drag a corner to resize. Two fingers to zoom
        and pan your view — it doesn&apos;t change the tattoo, just how closely you&apos;re looking.
      </p>
    </div>
  );
}

function ZoomBtn({
  onClick, label, small, children,
}: { onClick: () => void; label: string; small?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center bg-white font-bold text-[var(--ink)]"
      style={{ fontSize: small ? 15 : 19 }}
    >
      {children}
    </button>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
