"use client";

import type { RefObject } from "react";
import { BodyPicker } from "./BodyPicker";
import { PartsPicker } from "./PartsPicker";
import { UploadCard, type UploadCardHandle } from "./UploadCard";
import type { BodyType, FigureData } from "@/lib/geometry";
import { useLanguage } from "@/lib/i18n";

/** The body type / body region / tattoo artwork controls, shared between the mobile
 *  bottom sheet and the desktop side panel (specs/010) — same controls, same state,
 *  two different containers around them. */
export function EditPanel({
  data, body, onBodyChange, added, onToggle, image, replaceRef, onImageReplace,
}: {
  data: FigureData;
  body: BodyType;
  onBodyChange: (body: BodyType) => void;
  added: string[];
  onToggle: (id: string) => void;
  image: HTMLImageElement | null;
  replaceRef: RefObject<UploadCardHandle | null>;
  onImageReplace: (img: HTMLImageElement) => void;
}) {
  const { t } = useLanguage();

  return (
    <>
      <div>
        <p
          className="text-[10px] uppercase text-white/45"
          style={{ fontFamily: "var(--font-dm-mono)", letterSpacing: "1.5px" }}
        >
          {t("sheet.body")}
        </p>
        <div className="pt-2">
          <BodyPicker value={body} onChange={onBodyChange} />
        </div>
      </div>

      <div className="pt-6">
        <p
          className="text-[10px] uppercase text-white/45"
          style={{ fontFamily: "var(--font-dm-mono)", letterSpacing: "1.5px" }}
        >
          {t("sheet.bodyRegion")}
        </p>
        <div className="pt-2">
          <PartsPicker data={data} selected={added} onToggle={onToggle} />
        </div>
      </div>

      <div className="pt-6">
        <p
          className="text-[10px] uppercase text-white/45"
          style={{ fontFamily: "var(--font-dm-mono)", letterSpacing: "1.5px" }}
        >
          {t("sheet.tattooArtwork")}
        </p>
        <div
          className="mt-2 flex items-center gap-3 rounded-[12px] border p-2"
          style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.1)" }}
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-black/30">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.src} alt="" className="h-full w-full object-contain" />
            )}
          </div>
          <p
            className="flex-1 truncate text-[14px] text-white/80"
            style={{ fontFamily: "var(--font-gabarito)" }}
          >
            {t("sheet.selectedImage")}
          </p>
          <button
            onClick={() => replaceRef.current?.openPicker()}
            className="shrink-0 rounded-[8px] border px-3 py-2 text-[10px] uppercase text-white/70"
            style={{ borderColor: "rgba(255,255,255,0.15)", fontFamily: "var(--font-dm-mono)", letterSpacing: "1.08px" }}
          >
            {t("sheet.replace")}
          </button>
          <UploadCard ref={replaceRef} variant="hidden" onImage={onImageReplace} />
        </div>
      </div>
    </>
  );
}
