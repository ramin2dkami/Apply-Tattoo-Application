"use client";

import type { FigureData } from "@/lib/geometry";
import { useLanguage } from "@/lib/i18n";

const ORDER = ["torso", "back", "hips", "head", "leg-r", "leg-l", "arm-r", "arm-l"];

export function PartsPicker({
  data, selected, onToggle,
}: {
  data: FigureData;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const { t } = useLanguage();
  const parts = [...data.parts].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  return (
    <div className="grid grid-cols-2 gap-[6px]">
      {parts.map((p) => {
        const on = selected.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => onToggle(p.id)}
            className="flex h-[38px] items-center justify-start rounded-[12px] border px-[8px] py-[10px] text-left transition-colors"
            style={{
              background: on ? "rgba(245,196,70,0.12)" : "rgba(0,0,0,0.15)",
              borderColor: on ? "#f5c446" : "rgba(255,255,255,0.08)",
            }}
          >
            <span
              className="text-[12px] leading-4"
              style={{
                fontFamily: "var(--font-gabarito)",
                color: on ? "#f5c446" : "rgba(255,255,255,0.55)",
              }}
            >
              {t(`part.${p.id}`, p.label)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
