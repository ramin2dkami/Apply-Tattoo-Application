"use client";

import type { FigureData } from "@/lib/geometry";

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
      <p className="mb-4 text-[13px] text-[var(--muted)]">
        Pick one, or more than one if it spans a joint.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {parts.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className="flex items-center gap-2 rounded-xl px-4 py-4 text-left transition-colors"
              style={{ background: on ? "var(--violet)" : "#f4f2fa" }}
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: on ? "rgba(255,255,255,.25)" : "#fff",
                  border: on ? "none" : "1.5px solid #ddd8ee",
                }}
              >
                {on && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff"
                       strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
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
