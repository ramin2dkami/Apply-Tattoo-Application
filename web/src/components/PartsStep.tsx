"use client";

import { FigureSvg } from "./FigureSvg";
import { silhouettePoints, type FigureData, type Part } from "@/lib/geometry";

// Big areas first so the narrow limbs sit on top and stay tappable.
const ORDER = ["torso", "hips", "head", "leg-r", "leg-l", "arm-r", "arm-l"];

export function PartsStep({
  data, selected, onToggle, onBack, onNext,
}: {
  data: FigureData;
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const parts = [...data.parts].sort(
    (a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id),
  );
  const chosen = data.parts.filter((p) => selected.includes(p.id));

  return (
    <div className="flex h-dvh flex-col overflow-hidden px-5 pb-5 pt-11">
      <button onClick={onBack} className="mb-2 self-start text-[15px] font-semibold text-[var(--muted)]">
        ← Back
      </button>
      <h1 className="h1">Where do you want it?</h1>
      <p className="mt-2 text-[15px] text-[var(--muted)]">
        Pick one, or several if it spans a joint.
      </p>

      <div className="flex min-h-0 flex-1 items-center justify-center py-2">
        <FigureSvg
          viewBox={[0, 0, data.figure.canvas.width, data.figure.canvas.height]}
          style={{ width: "auto", height: "100%", maxWidth: "100%" }}
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

      <div className="card mt-2 p-4">
        <div className="flex flex-wrap gap-2">
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
        <p className="mt-3 text-[13px] text-[var(--muted)]">
          {chosen.length === 0
            ? "Tap the body or a name above."
            : chosen.map((p) => p.label).join(" + ")}
        </p>
        <button className="btn btn-primary mt-3" disabled={!chosen.length} onClick={onNext}>
          {chosen.length > 1 ? `Place across ${chosen.length} parts` : "Place my tattoo"}
        </button>
      </div>
    </div>
  );
}
