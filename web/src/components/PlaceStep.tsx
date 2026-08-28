"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FigureSvg } from "./FigureSvg";
import { formatSize, surfaceAt, unionViewBox, type FigureData } from "@/lib/geometry";
import { render, type Placement } from "@/lib/warp";
import { prepareArtwork } from "@/lib/image";

const MIN_CM = 1.5;
const MAX_CM = 40;

export function PlaceStep({
  data, selected, image, onBack,
}: {
  data: FigureData;
  selected: string[];
  image: HTMLImageElement;
  onBack: () => void;
}) {
  const parts = useMemo(
    () => data.parts.filter((p) => selected.includes(p.id)),
    [data, selected],
  );
  const vb = useMemo(() => unionViewBox(parts), [parts]);
  const pxPerCm = data.figure.pxPerCm;

  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [avail, setAvail] = useState({ w: 0, h: 0 });

  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [contour, setContour] = useState(true);
  const [place, setPlace] = useState<Placement>(() => {
    const cx = vb[0] + vb[2] / 2;
    const cy = vb[1] + vb[3] / 2;
    // Start at a bit over half the limb's width. A default that wraps most of the way
    // round reads as a bug on first sight, even though the warp is doing it correctly.
    const surf = surfaceAt(parts, cx, cy);
    const acrossCm = surf ? (surf.r * 2) / pxPerCm : 12;
    return { cx, cy, widthCm: clamp(acrossCm * 0.62, MIN_CM, MAX_CM) };
  });

  // Trimmed to the visible ink, so every centimetre we report describes the artwork
  // rather than the PNG's empty margins. See lib/image.ts.
  const src = useMemo(() => prepareArtwork(image), [image]);

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

  /* Size the stage to the viewBox's own aspect. If we let the SVG letterbox itself
   * with preserveAspectRatio, its internal scale stops matching the canvas overlay's
   * and the tattoo lands somewhere else entirely. One scale, shared by both. */
  const box = useMemo(() => {
    if (!avail.w || !avail.h) return { w: 0, h: 0 };
    const f = Math.min(avail.w / vb[2], avail.h / vb[3]);
    return { w: vb[2] * f, h: vb[3] * f };
  }, [avail, vb]);

  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const scale = box.w ? (box.w * dpr) / vb[2] : 0;

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c || !scale) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    render({ ctx, src, placement: place, parts, vb, scale, pxPerCm, contour });
  }, [src, place, parts, vb, scale, pxPerCm, contour]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !box.w) return;
    c.width = Math.round(box.w * dpr);
    c.height = Math.round(box.h * dpr);
    draw();
  }, [box, dpr, draw]);

  // ---- drag to move, pinch to resize ----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cm: number } | null>(null);

  const toFig = useCallback(
    (e: React.PointerEvent) => {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * vb[2] + vb[0],
        y: ((e.clientY - r.top) / r.height) * vb[3] + vb[1],
      };
    },
    [vb],
  );

  function down(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), cm: place.widthCm };
    }
  }

  function move(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const next = clamp(pinch.current.cm * (d / pinch.current.dist), MIN_CM, MAX_CM);
      setPlace((p) => ({ ...p, widthCm: next }));
      return;
    }

    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = ((e.clientX - prev.x) / r.width) * vb[2];
    const dy = ((e.clientY - prev.y) / r.height) * vb[3];
    setPlace((p) => ({
      ...p,
      cx: clamp(p.cx + dx, vb[0], vb[0] + vb[2]),
      cy: clamp(p.cy + dy, vb[1], vb[1] + vb[3]),
    }));
  }

  function up(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  const hCm = place.widthCm * (src.height / src.width);
  const pct = ((place.widthCm - MIN_CM) / (MAX_CM - MIN_CM)) * 100;

  return (
    <div className="flex h-dvh flex-col overflow-hidden px-5 pb-5 pt-11">
      <button onClick={onBack} className="mb-1 self-start text-[15px] font-semibold text-[var(--muted)]">
        ← Back
      </button>

      <div ref={host} className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="relative touch-none select-none"
          style={{ width: box.w || 1, height: box.h || 1 }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <FigureSvg viewBox={vb} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <canvas
            ref={canvas}
            className="pointer-events-none absolute inset-0"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      <div className="card mt-3 p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[13px] font-semibold text-[var(--muted)]">Actual size</div>
            <div className="num mt-1">
              {unit === "cm" ? place.widthCm.toFixed(1) : (place.widthCm / 2.54).toFixed(1)}
              <span className="ml-1 text-[18px] font-bold">{unit}</span>
            </div>
            <div className="mt-1 text-[13px] text-[var(--muted)]">
              {formatSize(place.widthCm, hCm, unit)}
            </div>
          </div>
          <div className="seg w-[116px]">
            {(["cm", "in"] as const).map((u) => (
              <button key={u} data-on={unit === u} onClick={() => setUnit(u)}>{u}</button>
            ))}
          </div>
        </div>

        <input
          type="range" min={MIN_CM} max={MAX_CM} step={0.1}
          value={place.widthCm}
          onChange={(e) => setPlace((p) => ({ ...p, widthCm: +e.target.value }))}
          className="mt-4 w-full"
          style={{ ["--pct" as string]: `${pct}%` }}
        />

        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold tracking-[-0.02em]">Contour to the body</div>
            <div className="text-[12.5px] text-[var(--muted)]">Wrap it to the curve of the skin</div>
          </div>
          <button
            onClick={() => setContour((c) => !c)}
            className="relative h-[31px] w-[52px] rounded-full transition-colors"
            style={{ background: contour ? "var(--violet)" : "#ddd8ee" }}
            aria-pressed={contour}
          >
            <span
              className="absolute top-[3px] h-[25px] w-[25px] rounded-full bg-white transition-all"
              style={{ left: contour ? 24 : 3, boxShadow: "0 1px 4px rgba(0,0,0,.25)" }}
            />
          </button>
        </div>

        <p className="mt-4 border-t pt-3 text-[13px] leading-snug text-[var(--muted)]"
           style={{ borderColor: "var(--line)" }}>
          <span className="font-semibold text-[var(--ink)]">
            {parts.map((p) => p.label).join(" + ")}
          </span>{" "}
          · drag to move, pinch to resize. The figure shows average proportions, so this
          is the size you want — not a measurement of your body.
        </p>
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
