"use client";

import { FigureSvg } from "./FigureSvg";
import { silhouettePoints, type FigureData, type Part } from "@/lib/geometry";

const ORDER = ["torso", "back", "hips", "head", "leg-r", "leg-l", "arm-r", "arm-l"];

export function PartsPicker({
  data, selected, onToggle, onDone,
}: {
  data: FigureData;
  selected: string[];
  onToggle: (id: string) => void;
  onDone: () => void;
}) {
  const parts = [...data.parts].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  return (
    <div className="flex flex-col">
      <p className="mb-3 text-[14px] text-[var(--muted)]">
        Tap the figure or a name. Pick more than one if it spans a joint.
      </p>

      <div className="flex justify-center py-1">
        <FigureSvg
          viewBox={[0, 0, data.figure.canvas.width, data.figure.canvas.height]}
          style={{ width: 152, height: 266 }}
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

      <div className="mt-2 grid grid-cols-2 gap-2">
        {parts.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left transition-colors"
              style={{ background: on ? "var(--violet)" : "#f4f2fa" }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: on ? "rgba(255,255,255,.25)" : "#fff",
                  border: on ? "none" : "1.5px solid #ddd8ee",
                }}
              >
                {on && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff"
                       strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span
                className="text-[14px] font-bold tracking-[-0.01em]"
                style={{ color: on ? "#fff" : "var(--ink)" }}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>

      <button className="btn btn-primary mt-5" onClick={onDone}>
        {selected.length === 0
          ? "Done"
          : `Done — ${selected.length} ${selected.length > 1 ? "parts" : "part"} added`}
      </button>
    </div>
  );
}
