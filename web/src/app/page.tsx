"use client";

import { useEffect, useState } from "react";
import { UploadStep } from "@/components/UploadStep";
import { PartsStep } from "@/components/PartsStep";
import { PlaceStep } from "@/components/PlaceStep";
import type { FigureData } from "@/lib/geometry";

type Step = "upload" | "parts" | "place";

export default function Home() {
  const [data, setData] = useState<FigureData | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch("/figure/regions.json").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) {
    return <div className="flex min-h-dvh items-center justify-center text-[var(--muted)]">Loading…</div>;
  }

  if (step === "upload" || !image) {
    return (
      <UploadStep
        image={image}
        onImage={(img) => setImage(img)}
        onNext={() => setStep("parts")}
      />
    );
  }

  if (step === "parts") {
    return (
      <PartsStep
        data={data}
        selected={selected}
        onToggle={(id) =>
          setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
        }
        onBack={() => setStep("upload")}
        onNext={() => setStep("place")}
      />
    );
  }

  return (
    <PlaceStep
      data={data}
      selected={selected}
      image={image}
      onBack={() => setStep("parts")}
    />
  );
}
