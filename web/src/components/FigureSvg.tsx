"use client";

import { useEffect, useState } from "react";
import type { ViewBox } from "@/lib/geometry";

const cache = new Map<string, string>();

/** Generated art (assets/tools/build_figure.py). Inlined rather than <img> so regions
 *  can be overlaid and any viewBox window used as a zoom. Every part is drawn in the
 *  same coordinate space as the assembled figure, so an isolated arm and the whole
 *  body share one set of numbers — a part file is a drop-in swap. */
export function useFigure(art: string) {
  const [inner, setInner] = useState<string | null>(cache.get(art) ?? null);
  useEffect(() => {
    const hit = cache.get(art);
    if (hit) { setInner(hit); return; }
    let alive = true;
    fetch(`/figure/${art}`)
      .then((r) => r.text())
      .then((t) => {
        const body = t.slice(t.indexOf(">") + 1, t.lastIndexOf("</svg>"));
        cache.set(art, body);
        if (alive) setInner(body);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [art]);
  return inner;
}

export function FigureSvg({
  art = "front.svg", viewBox, mirror, className, style, children,
}: {
  art?: string;
  viewBox: ViewBox;
  /** Flips the drawing left-right. Used for a mirrored limb (we only have real
   *  artwork for one side): the silhouette data is already mirrored to match, so the
   *  visual flip has to line up with it exactly, not just look roughly right. */
  mirror?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const inner = useFigure(art);
  return (
    <svg
      viewBox={viewBox.join(" ")}
      className={className}
      style={{ ...style, transform: mirror ? "scaleX(-1)" : undefined }}
      preserveAspectRatio="xMidYMid meet"
    >
      {inner && <g dangerouslySetInnerHTML={{ __html: inner }} />}
      {children}
    </svg>
  );
}
