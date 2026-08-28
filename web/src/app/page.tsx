"use client";

import { useEffect, useState } from "react";
import { UploadCard } from "@/components/UploadCard";
import { PartsPicker } from "@/components/PartsPicker";
import { PlaceCanvas } from "@/components/PlaceCanvas";
import { BottomSheet } from "@/components/BottomSheet";
import type { FigureData } from "@/lib/geometry";

export default function Home() {
  const [data, setData] = useState<FigureData | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetch("/figure/parts.json").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) {
    return <div className="flex min-h-dvh items-center justify-center text-[var(--muted)]">Loading…</div>;
  }

  const addedParts = data.parts.filter((p) => added.includes(p.id));

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pb-10 pt-12">
      <div>
        <h1 className="h1">Show your artist exactly what you want</h1>
        <p className="mt-2 text-[15px] leading-snug text-[var(--muted)]">
          Upload your design, put it where you want it, and get the real size — so
          they can quote you without twenty messages.
        </p>
      </div>

      <UploadCard image={image} onImage={(img) => setImage(img)} />

      {image && (
        <>
          {addedParts.map((p) => (
            <PlaceCanvas
              key={p.id}
              part={p}
              image={image}
              proceduralPxPerCm={data.figure.pxPerCm}
              onRemove={() => setAdded((s) => s.filter((x) => x !== p.id))}
            />
          ))}

          <button
            onClick={() => setSheetOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-[18px] border-2 border-dashed py-4 text-[15px] font-bold tracking-[-0.01em] text-[var(--violet)] transition-colors active:bg-[var(--violet-lt)]"
            style={{ borderColor: "#c9bdf2" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            {addedParts.length === 0 ? "Add a body part" : "Add another body part"}
          </button>
        </>
      )}

      <BottomSheet open={sheetOpen} title="Where do you want it?" onClose={() => setSheetOpen(false)}>
        <PartsPicker
          data={data}
          selected={added}
          onToggle={(id) => setAdded((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
          onDone={() => setSheetOpen(false)}
        />
      </BottomSheet>
    </div>
  );
}
