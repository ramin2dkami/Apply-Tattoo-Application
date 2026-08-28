"use client";

import { FigureSvg } from "./FigureSvg";
import { silhouettePoints, type FigureData, type Part } from "@/lib/geometry";

const ORDER = ["torso", "back", "hips", "head", "leg-r", "leg-l", "arm-r", "arm-l"];

export function PartsPicker({
  data, selected, onToggle,
}: {
  data: FigureData;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const parts = [...data.parts].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  return (
    <div className="flex flex-col">
      <p className="mb-2 text-[13px] text-[var(--muted)]">
        Tap the figure or a name — more than one if it spans a joint.
      </p>

      <div className="flex justify-center">
        <FigureSvg
          viewBox={[0, 0, data.figure.canvas.width, data.figure.canvas.height]}
          style={{ width: 108, height: 189 }}
        >
          {parts.map((p: Part) => {
            const on = selected.includes(p.id);
            return (
              <polygon
                key={p.id}
                points={silhouettePoints(p.surface.silhouette)}
                className={`hit ${on ? "hit-on" : "hit-idle"}`}
                onClick={() => onToggle(p.id)}
              />
            );
          })}
        </FigureSvg>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {parts.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors"
              style={{ background: on ? "var(--violet)" : "#f4f2fa" }}
            >
              <span
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                style={{
                  background: on ? "rgba(255,255,255,.25)" : "#fff",
                  border: on ? "none" : "1.5px solid #ddd8ee",
                }}
              >
                {on && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff"
                       strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span
                className="text-[13.5px] font-bold tracking-[-0.01em]"
                style={{ color: on ? "#fff" : "var(--ink)" }}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
