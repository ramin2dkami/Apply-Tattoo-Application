"use client";

import { useEffect, useState } from "react";
import { UploadCard } from "@/components/UploadCard";
import { PartsPicker } from "@/components/PartsPicker";
import { PlaceCanvas } from "@/components/PlaceCanvas";
import type { FigureData } from "@/lib/geometry";

export default function Home() {
  const [data, setData] = useState<FigureData | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch("/figure/parts.json").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) {
    return <div className="flex min-h-dvh items-center justify-center text-[var(--muted)]">Loading…</div>;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pb-10 pt-12">
      <div>
        <h1 className="h1">Show your artist exactly what you want</h1>
        <p className="mt-2 text-[15px] leading-snug text-[var(--muted)]">
          Upload your design, put it where you want it, and get the real size — so
          they can quote you without twenty messages.
        </p>
      </div>

      <Step n={1} title="Upload your design" done={!!image}>
        <UploadCard image={image} onImage={(img) => setImage(img)} />
      </Step>

      <Step n={2} title="Where do you want it?" done={selected.length > 0}>
        <PartsPicker
          data={data}
          selected={selected}
          disabled={!image}
          onToggle={(id) =>
            setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
          }
        />
      </Step>

      {image && selected.length > 0 && (
        <Step n={3} title="Place and size it" done={false}>
          <PlaceCanvas data={data} selected={selected} image={image} />
        </Step>
      )}
    </div>
  );
}

function Step({
  n, title, done, children,
}: {
  n: number; title: string; done: boolean; children: React.ReactNode;
}) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
          style={{
            background: done ? "var(--violet)" : "#e7e4f0",
            color: done ? "#fff" : "var(--muted)",
          }}
        >
          {done ? "✓" : n}
        </span>
        <h2 className="text-[15px] font-bold tracking-[-0.02em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
