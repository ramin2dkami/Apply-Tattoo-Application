"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FigureSvg } from "./FigureSvg";
import { prepareArtwork } from "@/lib/image";
import { surfaceAt, unionViewBox, type Part, type Surfaceable, type ViewBox } from "@/lib/geometry";
import { render, type Placement } from "@/lib/warp";
import { useLanguage } from "@/lib/i18n";

const MIN_CM = 1.5;
const MAX_CM = 40;
const HANDLE = 16;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Corner = "tl" | "tr" | "bl" | "br";
const OPPOSITE: Record<Corner, Corner> = { tl: "br", tr: "bl", bl: "tr", br: "tl" };

export function PlaceCanvas({
  parts, image, onRemove, proceduralPxPerCm, figureArt, figureArtBack,
}: {
  parts: Part[];
  image: HTMLImageElement;
  onRemove: (id: string) => void;
  /** px/cm for the assembled-figure fallback (head, hips, or any multi-part group) —
   *  real art carries its own. */
  proceduralPxPerCm: number;
  /** Assembled whole-figure art, used as the backdrop for a multi-part group. */
  figureArt: string;
  figureArtBack: string;
}) {
  /* A single part with real art shows the actual reference drawing, in that part's
   * own coordinate space — the highest-fidelity case. Two or more parts (or a single
   * part with no real art, e.g. head/hips whose traces came back broken, see
   * assets/README.md) fall back to the procedural figure crop: every part's
   * procedural geometry lives in the same shared coordinate space as the assembled
   * front/back figure (see FigureSvg.tsx), so their union is a real window into that
   * figure, not a fabricated composite. */
  const single = parts.length === 1 ? parts[0] : null;
  const real = single?.real ?? null;
  const art = real ? real.art : single ? single.art : parts[0].view === "front" ? figureArt : figureArtBack;
  const mirror = real?.mirror ?? false;
  const pxPerCm = real ? real.pxPerCm : proceduralPxPerCm;
  const vb: ViewBox = real ? real.viewBox : single ? single.viewBox : unionViewBox(parts);
  const surfaces: Surfaceable[] = useMemo(
    () => (real
      ? [{ viewBox: real.viewBox, surface: { silhouette: real.silhouette } }]
      : parts.map((p) => ({ viewBox: p.viewBox, surface: p.surface }))),
    [real, parts],
  );
  const { t } = useLanguage();
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [avail, setAvail] = useState({ w: 0, h: 0 });
  const [unit] = useState<"cm" | "in">("cm");
  const [contour, setContour] = useState(true);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [heightCm, setHeightCm] = useState<number | null>(null);

  const src = useMemo(() => prepareArtwork(image), [image]);

  const [place, setPlace] = useState<Placement>(() => {
    const cx = vb[0] + vb[2] / 2;
    const cy = vb[1] + vb[3] / 2;
    const surf = surfaceAt(surfaces, cx, cy);
    const acrossCm = surf ? (surf.r * 2) / pxPerCm : 12;
    return { cx, cy, widthCm: clamp(acrossCm * 0.62, MIN_CM, MAX_CM) };
  });

  // Aspect ratio is locked to the source image by default; heightCm holds an
  // explicit override once the user unlocks it and drags a corner non-uniformly.
  const hCm = heightCm ?? place.widthCm * (src.height / src.width);

  // ---- view zoom/pan, independent of the tattoo's own placement ----
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  function zoomBy(f: number) {
    setZoom((z) => clamp(z * f, MIN_ZOOM, MAX_ZOOM));
  }
  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); }

  // Trackpad pinch (and ctrl+scroll) arrives as a wheel event with ctrlKey set —
  // that's the same signal Chrome/Firefox/Safari all synthesize for a trackpad pinch
  // gesture, so this is the standard way to support it without native gesture events.
  // React's delegated wheel listener is passive, so preventDefault() there is a no-op;
  // a real DOM listener with { passive: false } is required to stop the page zooming.
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  useEffect(() => {
    const stageEl = host.current?.querySelector(".stage") as HTMLElement | null;
    if (!stageEl) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const r = host.current!.getBoundingClientRect();
      const hx = r.left + r.width / 2;
      const hy = r.top + r.height / 2;
      const z0 = zoomRef.current;
      const z1 = clamp(z0 * Math.exp(-e.deltaY * 0.01), MIN_ZOOM, MAX_ZOOM);
      if (z1 === z0) return;
      const p0 = panRef.current;
      // Keep the point under the cursor fixed while the zoom changes, the same way
      // the two-finger pinch handler keeps content anchored to the touch midpoint.
      setPan({
        x: (e.clientX - hx) * (1 - z1 / z0) + p0.x * (z1 / z0),
        y: (e.clientY - hy) * (1 - z1 / z0) + p0.y * (z1 / z0),
      });
      setZoom(z1);
    }
    stageEl.addEventListener("wheel", onWheel, { passive: false });
    return () => stageEl.removeEventListener("wheel", onWheel);
  }, []);

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
    render({ ctx, src, placement: { ...place, heightCm: hCm }, parts: surfaces, vb, scale, pxPerCm, contour });
  }, [src, place, hCm, surfaces, vb, scale, pxPerCm, contour]);

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
  // A single-finger drag either moves the tattoo (press starts on it) or pans the
  // view (press starts anywhere else on the body) — set once per drag, at pointerdown.
  const dragMode = useRef<"tattoo" | "pan" | null>(null);
  const tattooBox = useRef<HTMLDivElement>(null);
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
      const r = tattooBox.current?.getBoundingClientRect();
      const inside = !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      dragMode.current = inside ? "tattoo" : "pan";
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
    if (dragStart.current && dragMode.current === "pan") {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      dragStart.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
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
    if (pointers.current.size === 0) { dragStart.current = null; dragMode.current = null; }
  }

  // ---- Figma-style corner handles ----
  const resizing = useRef<{
    corner: Corner; anchor: { x: number; y: number }; sign: number[];
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
      corner, anchor, sign, startDist: Math.hypot(corner0.x - anchor.x, corner0.y - anchor.y),
      startCx: place.cx, startCy: place.cy, startW: place.widthCm,
    };
  }
  function handleMove(e: React.PointerEvent) {
    const st = resizing.current;
    if (!st) return;
    const p = toFig(e.clientX, e.clientY);
    if (aspectLocked) {
      const dist = Math.hypot(p.x - st.anchor.x, p.y - st.anchor.y);
      const s = st.startDist > 0 ? dist / st.startDist : 1;
      const newW = clamp(st.startW * s, MIN_CM, MAX_CM);
      const cs = newW / st.startW;
      setPlace({
        cx: st.anchor.x + (st.startCx - st.anchor.x) * cs,
        cy: st.anchor.y + (st.startCy - st.anchor.y) * cs,
        widthCm: newW,
      });
    } else {
      const newW = clamp(Math.abs(p.x - st.anchor.x) / pxPerCm, MIN_CM, MAX_CM);
      const newH = clamp(Math.abs(p.y - st.anchor.y) / pxPerCm, MIN_CM, MAX_CM);
      setPlace({
        cx: st.anchor.x + st.sign[0] * (newW * pxPerCm) / 2,
        cy: st.anchor.y + st.sign[1] * (newH * pxPerCm) / 2,
        widthCm: newW,
      });
      setHeightCm(newH);
    }
  }
  function handleUp() { resizing.current = null; }

  function toggleAspectLock() {
    setAspectLocked((locked) => {
      if (!locked) setHeightCm(null); // relock: snap back to the image's own aspect ratio
      return !locked;
    });
  }

  function sliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = Number(e.target.value);
    const newW = clamp(unit === "cm" ? raw : raw * 2.54, MIN_CM, MAX_CM);
    setPlace((p) => ({ ...p, widthCm: newW }));
  }

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

  const toUnit = (cm: number) => (unit === "cm" ? cm : cm / 2.54);
  const minU = toUnit(MIN_CM);
  const maxU = toUnit(MAX_CM);
  const pct = ((toUnit(place.widthCm) - minU) / (maxU - minU)) * 100;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div
        className="relative min-h-0 flex-[1_1_auto] overflow-hidden rounded-[32px] border"
        style={{
          background: "#111315", borderColor: "rgba(255,255,255,0.1)", boxShadow: "0px 30px 70px 0px rgba(0,0,0,0.34)",
          "--body-fill": "#17191b", "--body-line": "rgba(255,255,255,0.22)",
        } as React.CSSProperties}
      >
        <div ref={host} className="absolute inset-0">
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
                ref={tattooBox}
                className="pointer-events-none absolute"
                style={{ left: corners.tl.x, top: corners.tl.y, width: wPx, height: hPx, border: "1.5px solid #f5c446" }}
              >
                {(Object.keys(corners) as Corner[]).map((c) => (
                  <div
                    key={c}
                    className="pointer-events-auto absolute touch-none rounded-[4px]"
                    style={{
                      width: HANDLE, height: HANDLE,
                      left: c.includes("l") ? -HANDLE / 2 : undefined,
                      right: c.includes("r") ? -HANDLE / 2 : undefined,
                      top: c.includes("t") ? -HANDLE / 2 : undefined,
                      bottom: c.includes("b") ? -HANDLE / 2 : undefined,
                      background: "#f5c446",
                      border: "2px solid #16120a",
                      boxShadow: "0 1px 3px rgba(0,0,0,.4)",
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

        {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
          <div className="absolute bottom-2 left-2 z-10 overflow-hidden rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <ZoomBtn onClick={resetView} label={t("canvas.returnDefaultView")}>⟲</ZoomBtn>
          </div>
        )}

        <div className="absolute bottom-2 right-2 z-10 flex flex-col overflow-hidden rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <ZoomBtn onClick={() => zoomBy(1.4)} label={t("canvas.zoomIn")}>+</ZoomBtn>
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)" }} />
          <ZoomBtn onClick={() => zoomBy(1 / 1.4)} label={t("canvas.zoomOut")}>−</ZoomBtn>
        </div>
      </div>

      <div
        className="shrink-0 rounded-[16px] border p-4"
        style={{ background: "#141617", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="text-[13px] leading-5 font-bold text-white" style={{ fontFamily: "var(--font-gabarito)" }}>
          {t("canvas.artSize")}
        </div>

        <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2">
          <div
            className="flex flex-col justify-center rounded-[12px] border px-3 py-2"
            style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(245,196,70,0.35)" }}
          >
            <span className="text-[8px] uppercase text-white/40" style={{ fontFamily: "var(--font-dm-mono)", letterSpacing: "0.96px" }}>
              {t("canvas.width")}
            </span>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[16px] leading-6 text-[#f5c446]" style={{ fontFamily: "var(--font-dm-mono)" }}>
                {toUnit(place.widthCm).toFixed(1)}
              </span>
              <span className="text-[10px] text-[#f5c446]" style={{ fontFamily: "var(--font-dm-mono)" }}>{unit}</span>
            </div>
          </div>
          <div
            className="flex flex-col justify-center rounded-[12px] border px-3 py-2"
            style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.15)" }}
          >
            <span className="text-[8px] uppercase text-white/40" style={{ fontFamily: "var(--font-dm-mono)", letterSpacing: "0.96px" }}>
              {t("canvas.height")}
            </span>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[16px] leading-6 text-[#f5c446]" style={{ fontFamily: "var(--font-dm-mono)" }}>
                {toUnit(hCm).toFixed(1)}
              </span>
              <span className="text-[10px] text-[#f5c446]" style={{ fontFamily: "var(--font-dm-mono)" }}>{unit}</span>
            </div>
          </div>
          <button
            onClick={toggleAspectLock}
            className="flex flex-col items-center justify-center rounded-[12px] border px-2"
            style={{
              background: aspectLocked ? "rgba(245,196,70,0.1)" : "rgba(255,255,255,0.05)",
              borderColor: aspectLocked ? "rgba(245,196,70,0.5)" : "rgba(255,255,255,0.2)",
            }}
            aria-pressed={aspectLocked}
            aria-label={aspectLocked ? t("canvas.aspectLocked") : t("canvas.aspectUnlocked")}
            title={aspectLocked ? t("canvas.aspectLocked") : t("canvas.aspectUnlocked")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={aspectLocked ? "#f5c446" : "rgba(255,255,255,0.6)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              {aspectLocked ? (
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              ) : (
                <path d="M8 11V7a4 4 0 0 1 7.5-2" />
              )}
            </svg>
          </button>
        </div>

        <div className="mt-4">
          <input
            type="range"
            className="range-gold w-full"
            min={minU}
            max={maxU}
            step={0.1}
            value={toUnit(place.widthCm)}
            onChange={sliderChange}
            style={{ "--pct": `${pct}%` } as React.CSSProperties}
          />
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="text-[13px] leading-5 text-white/85" style={{ fontFamily: "var(--font-gabarito)" }}>{t("canvas.contourToBody")}</div>
          <button
            onClick={() => setContour((c) => !c)}
            className="relative h-6 w-12 shrink-0 rounded-full transition-colors"
            style={{ background: contour ? "#f5c446" : "rgba(255,255,255,0.15)" }}
            aria-pressed={contour}
          >
            <span
              className="absolute top-1 h-4 w-4 rounded-full"
              style={{ left: contour ? 28 : 4, background: contour ? "#16120a" : "#fff", transition: "left .15s ease" }}
            />
          </button>
        </div>
      </div>
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
      className="flex h-10 w-10 items-center justify-center font-bold text-white/80"
      style={{ fontSize: small ? 15 : 19, background: "rgba(0,0,0,0.5)" }}
    >
      {children}
    </button>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
