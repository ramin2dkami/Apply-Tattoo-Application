"use client";

import { useRef, useState } from "react";

export function UploadCard({
  image, onImage,
}: {
  image: HTMLImageElement | null;
  onImage: (img: HTMLImageElement, name: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  function take(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like an image. Try a PNG or JPG.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { setError(null); setName(file.name); onImage(img, file.name); };
    img.onerror = () => setError("Couldn't read that file. Try another one.");
    img.src = url;
  }

  return (
    <div
      className="card p-4"
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
    >
      <button
        onClick={() => input.current?.click()}
        className="flex w-full items-center gap-4 rounded-[18px] px-4 py-4 text-left transition-colors"
        style={{
          border: `2px dashed ${over ? "var(--violet)" : "#ddd8ee"}`,
          background: over ? "var(--violet-lt)" : "#fbfaff",
        }}
      >
        {image ? (
          <>
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundImage:
                  "linear-gradient(45deg,#f0eef8 25%,transparent 25%,transparent 75%,#f0eef8 75%)," +
                  "linear-gradient(45deg,#f0eef8 25%,transparent 25%,transparent 75%,#f0eef8 75%)",
                backgroundSize: "12px 12px",
                backgroundPosition: "0 0, 6px 6px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt="" className="max-h-16 max-w-16 object-contain" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-bold tracking-[-0.01em]">{name}</div>
              <div className="text-[12.5px] text-[var(--muted)]">Tap to choose a different one</div>
            </div>
          </>
        ) : (
          <>
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
              style={{ background: "var(--violet)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff"
                   strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 17V5M6 11l6-6 6 6" />
                <path d="M4 19h16" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-[-0.02em]">Upload your tattoo</div>
              <div className="text-[12.5px] leading-snug text-[var(--muted)]">
                PNG with a transparent background works best
              </div>
            </div>
          </>
        )}
      </button>
      <input
        ref={input} type="file" accept="image/*" className="hidden"
        onChange={(e) => take(e.target.files?.[0])}
      />
      {error && <p className="mt-2 px-1 text-[13px] font-semibold text-[#c0392b]">{error}</p>}
    </div>
  );
}
