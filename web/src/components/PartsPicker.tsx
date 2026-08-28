"use client";

import { FigureSvg } from "./FigureSvg";
import { silhouettePoints, type FigureData, type Part } from "@/lib/geometry";

const ORDER = ["torso", "back", "hips", "head", "leg-r", "leg-l", "arm-r", "arm-l"];

export function PartsPicker({
  data, selected, disabled, onToggle,
}: {
  data: FigureData;
  selected: string[];
  disabled: boolean;
  onToggle: (id: string) => void;
}) {
  const parts = [...data.parts].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const chosen = data.parts.filter((p) => selected.includes(p.id));

  return (
    <div
      className="card p-4 transition-opacity duration-200"
      style={{ opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? "none" : "auto" }}
      aria-disabled={disabled}
    >
      <div className="flex gap-4">
        <FigureSvg
          viewBox={[0, 0, data.figure.canvas.width, data.figure.canvas.height]}
          style={{ width: 96, height: 168, flexShrink: 0 }}
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

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            {parts.map((p) => (
              <button
                key={p.id}
                onClick={() => onToggle(p.id)}
                className={`chip ${selected.includes(p.id) ? "chip-on" : ""}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[12.5px] text-[var(--muted)]">
            {chosen.length === 0
              ? "Tap the figure or a name."
              : chosen.map((p) => p.label).join(" + ")}
          </p>
        </div>
      </div>
    </div>
  );
}
