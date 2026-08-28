"use client";

import { useEffect, useState } from "react";
import type { ViewBox } from "@/lib/geometry";

const cache = new Map<string, string>();

/** The figure is generated art (assets/tools/build_figure.py). We inline it rather
 *  than using <img> so regions can be overlaid and any viewBox window used as a zoom. */
export function useFigure(view: "front" | "back") {
  const [inner, setInner] = useState<string | null>(cache.get(view) ?? null);
  useEffect(() => {
    const hit = cache.get(view);
    if (hit) { setInner(hit); return; }
    let alive = true;
    fetch(`/figure/${view}.svg`)
      .then((r) => r.text())
      .then((t) => {
        const body = t.slice(t.indexOf(">") + 1, t.lastIndexOf("</svg>"));
        cache.set(view, body);
        if (alive) setInner(body);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [view]);
  return inner;
}

export function FigureSvg({
  view = "front", viewBox, className, style, children,
}: {
  view?: "front" | "back";
  viewBox: ViewBox;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const inner = useFigure(view);
  return (
    <svg
      viewBox={viewBox.join(" ")}
      className={className}
      style={style}
      preserveAspectRatio="xMidYMid meet"
    >
      {inner && <g dangerouslySetInnerHTML={{ __html: inner }} />}
      {children}
    </svg>
  );
}
