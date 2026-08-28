"use client";

import { useRef, useState } from "react";

export function UploadStep({
  image, onImage, onNext,
}: {
  image: HTMLImageElement | null;
  onImage: (img: HTMLImageElement, name: string) => void;
  onNext: () => void;
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
    <div className="flex min-h-dvh flex-col px-5 pb-8 pt-14">
      <h1 className="h1 max-w-[19rem]">Show your artist exactly what you want</h1>
      <p className="mt-3 max-w-[20rem] text-[15px] leading-snug text-[var(--muted)]">
        Upload your design, put it where you want it, and get the real size — so
        they can quote you without twenty messages.
      </p>

      <div
        className="card mt-7 p-5"
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
      >
        <button
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center justify-center rounded-[20px] px-4 py-9 transition-colors"
          style={{
            border: `2px dashed ${over ? "var(--violet)" : "#ddd8ee"}`,
            background: over ? "var(--violet-lt)" : "#fbfaff",
          }}
        >
          {image ? (
            <>
              <div
                className="mb-3 flex h-32 w-32 items-center justify-center rounded-2xl"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,#f0eef8 25%,transparent 25%,transparent 75%,#f0eef8 75%)," +
                    "linear-gradient(45deg,#f0eef8 25%,transparent 25%,transparent 75%,#f0eef8 75%)",
                  backgroundSize: "14px 14px",
                  backgroundPosition: "0 0, 7px 7px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt="" className="max-h-32 max-w-32 object-contain" />
              </div>
              <span className="text-[14px] font-semibold">{name}</span>
              <span className="mt-1 text-[13px] text-[var(--muted)]">Tap to choose a different one</span>
            </>
          ) : (
            <>
              <div
                className="mb-3 flex h-14 w-14 items-center justify-center rounded-[18px]"
                style={{ background: "var(--violet)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff"
                     strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 17V5M6 11l6-6 6 6" />
                  <path d="M4 19h16" />
                </svg>
              </div>
              <span className="text-[16px] font-bold tracking-[-0.02em]">Upload your tattoo</span>
              <span className="mt-1 text-center text-[13px] leading-snug text-[var(--muted)]">
                PNG with a transparent background works best
              </span>
            </>
          )}
        </button>

        <input
          ref={input} type="file" accept="image/*" className="hidden"
          onChange={(e) => take(e.target.files?.[0])}
        />
        {error && <p className="mt-3 text-[13px] font-semibold text-[#c0392b]">{error}</p>}
      </div>

      <div className="flex-1" />
      <button className="btn btn-primary mt-8" disabled={!image} onClick={onNext}>
        Continue
      </button>
    </div>
  );
}
