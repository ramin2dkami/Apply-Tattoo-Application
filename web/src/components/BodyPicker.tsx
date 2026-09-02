"use client";

import type { BodyType } from "@/lib/geometry";
import { useLanguage } from "@/lib/i18n";

const BODIES: BodyType[] = ["male", "female"];

/** Which figure the tattoo is being placed on. Two buttons, same visual language as
 *  PartsPicker — the choice sits directly above the region buttons because it changes
 *  what those regions mean (specs/009). */
export function BodyPicker({
  value, onChange,
}: {
  value: BodyType;
  onChange: (body: BodyType) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 gap-2">
      {BODIES.map((b) => {
        const on = value === b;
        return (
          <button
            key={b}
            onClick={() => onChange(b)}
            aria-pressed={on}
            className="flex h-10 items-center justify-start rounded-[12px] border px-3 text-left transition-colors"
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
              {t(`body.${b}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
