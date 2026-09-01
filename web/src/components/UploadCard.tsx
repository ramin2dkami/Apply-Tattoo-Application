"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";

export type UploadCardHandle = { openPicker: () => void };

export const UploadCard = forwardRef<UploadCardHandle, {
  onImage: (img: HTMLImageElement, name: string) => void;
  variant?: "card" | "dark" | "hidden";
}>(function UploadCard({ onImage, variant = "card" }, ref) {
  const { t } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  useImperativeHandle(ref, () => ({ openPicker: () => input.current?.click() }));

  function take(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("upload.errorNotImage"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { setError(null); onImage(img, file.name); };
    img.onerror = () => setError(t("upload.errorUnreadable"));
    img.src = url;
  }

  const dropzoneProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); },
  };

  if (variant === "hidden") {
    return (
      <input
        ref={input} type="file" accept="image/*" className="hidden"
        onChange={(e) => take(e.target.files?.[0])}
      />
    );
  }

  if (variant === "dark") {
    return (
      <div className="w-full" {...dropzoneProps}>
        <button
          onClick={() => input.current?.click()}
          className="flex h-10 w-full items-center justify-center rounded-[12px] transition-opacity active:opacity-90"
          style={{ background: over ? "#ffd469" : "#f5c446" }}
        >
          <span
            className="text-[10px] uppercase text-[#16120a]"
            style={{ fontFamily: "var(--font-dm-mono)", fontWeight: 500, letterSpacing: "1.6px" }}
          >
            {t("upload.selectImage")}
          </span>
        </button>
        <p
          className="mt-2 text-center text-[10px] leading-4 text-white/30"
          style={{ fontFamily: "var(--font-dm-mono)" }}
        >
          {t("upload.fileHint")}
        </p>
        <input
          ref={input} type="file" accept="image/*" className="hidden"
          onChange={(e) => take(e.target.files?.[0])}
        />
        {error && <p className="mt-2 text-center text-[12px] leading-4 font-semibold text-[#ff8a7a]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card p-4" {...dropzoneProps}>
      <button
        onClick={() => input.current?.click()}
        className="flex w-full items-center gap-4 rounded-[16px] px-4 py-4 text-left transition-colors"
        style={{
          border: `2px dashed ${over ? "var(--violet)" : "#ddd8ee"}`,
          background: over ? "var(--violet-lt)" : "#fbfaff",
        }}
      >
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px]"
          style={{ background: "var(--violet)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff"
               strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17V5M6 11l6-6 6 6" />
            <path d="M4 19h16" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-bold tracking-[-0.02em]">{t("upload.cardTitle")}</div>
          <div className="text-[12px] leading-4 text-[var(--muted)]">
            {t("upload.cardHint")}
          </div>
        </div>
      </button>
      <input
        ref={input} type="file" accept="image/*" className="hidden"
        onChange={(e) => take(e.target.files?.[0])}
      />
      {error && <p className="mt-2 px-1 text-[13px] leading-4 font-semibold text-[#c0392b]">{error}</p>}
    </div>
  );
});
