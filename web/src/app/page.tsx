"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCard, type UploadCardHandle } from "@/components/UploadCard";
import { PartsPicker } from "@/components/PartsPicker";
import { PlaceCanvas } from "@/components/PlaceCanvas";
import { Toast } from "@/components/Toast";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { FigureData } from "@/lib/geometry";
import { withBasePath } from "@/lib/basePath";
import { useLanguage } from "@/lib/i18n";

type Step = "upload" | "workspace";

export default function Home() {
  const { t } = useLanguage();
  const [data, setData] = useState<FigureData | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("upload");
  const [editOpen, setEditOpen] = useState(true);
  const [activeGroup, setActiveGroup] = useState(0);
  const [toast, setToast] = useState(false);
  const replaceRef = useRef<UploadCardHandle>(null);

  function handleImage(img: HTMLImageElement) {
    setImage(img);
    setStep("workspace");
    setEditOpen(true);
    setToast(true);
    setTimeout(() => setToast(false), 2600);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My tattoo placement", url: location.href });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(location.href);
  }

  useEffect(() => {
    fetch(withBasePath("/figure/parts.json")).then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  // 100dvh is unreliable inside in-app browsers (WhatsApp, Instagram, etc.) — their
  // WKWebView often reports a taller CSS viewport than what's actually visible above
  // their own chrome, leaving dead space at the bottom. window.innerHeight tracks the
  // real visible area, so mirror it into a custom property and prefer that.
  useEffect(() => {
    function setAppHeight() {
      document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
    }
    setAppHeight();
    window.addEventListener("resize", setAppHeight);
    window.addEventListener("orientationchange", setAppHeight);
    return () => {
      window.removeEventListener("resize", setAppHeight);
      window.removeEventListener("orientationchange", setAppHeight);
    };
  }, []);

  const addedParts = (data?.parts ?? [])
    .filter((p) => added.includes(p.id));
  const front = addedParts.filter((p) => p.view === "front");
  const back = addedParts.filter((p) => p.view === "back");
  const groups = [front, back].filter((g) => g.length > 0);
  const hasSelection = added.length > 0;
  const hasPlacement = !!image && groups.length > 0;

  useEffect(() => {
    if (activeGroup >= groups.length) setActiveGroup(0);
  }, [groups.length, activeGroup]);

  // Nothing left to place (e.g. the last part was removed from the canvas) — the
  // edit sheet is the only place that makes sense, so force it back open.
  useEffect(() => {
    if (step === "workspace" && addedParts.length === 0) setEditOpen(true);
  }, [step, addedParts.length]);

  if (!data) {
    return (
      <div
        className="flex items-center justify-center bg-[#0b0c0d] text-white/50"
        style={{ height: "var(--app-height, 100dvh)" }}
      >
        Loading…
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div
        className="flex w-full flex-col overflow-hidden bg-[#0b0c0d]"
        style={{ height: "var(--app-height, 100dvh)" }}
      >
        <Toast message={t("toast.imageUploaded")} show={toast} />

        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#111315]"
          style={{ marginTop: "max(20px, env(safe-area-inset-top))" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={withBasePath("/landing/hero.png")}
            alt="Person reviewing tattoo ideas on their phone"
            className="w-full min-h-0 flex-1 object-cover"
          />
          <div
            className="absolute right-4 z-10"
            style={{ top: "max(16px, calc(env(safe-area-inset-top) + 16px))" }}
          >
            <LanguageSwitcher />
          </div>
          <div className="flex w-full flex-col items-center px-7 pb-7 pt-6">
            <div className="w-full max-w-[260px]">
              <h1
                className="text-center text-[24px] leading-8 text-white"
                style={{ fontFamily: "var(--font-gabarito)", letterSpacing: "-0.96px" }}
              >
                {t("upload.title")}
              </h1>
              <p className="mt-2 text-center text-[14px] leading-[22.75px] text-white/50">
                {t("upload.subtitle")}
              </p>
              <div className="mt-6 w-full">
                <UploadCard variant="dark" onImage={(img) => handleImage(img)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- workspace: canvas + bottom bar always occupy the same fixed layout — the
  // edit sheet is an overlay on top of them, so opening/closing it never reflows
  // (and never resizes) the illustration underneath. ----
  return (
    <div
      className="relative flex w-full flex-col overflow-hidden bg-[#0b0c0d]"
      style={{ height: "var(--app-height, 100dvh)" }}
    >
      <Toast message={t("toast.imageUploaded")} show={toast} />

      <div
        className="relative min-h-0 flex-1 overflow-hidden px-4 pb-4"
        style={{ marginTop: "max(20px, env(safe-area-inset-top))" }}
      >
        {hasPlacement ? (
          <PlaceCanvas
            key={groups[activeGroup].map((p) => p.id).join("+")}
            parts={groups[activeGroup]}
            image={image!}
            proceduralPxPerCm={data.figure.pxPerCm}
            figureArt={data.figure.art}
            figureArtBack={data.figure.artBack}
            onRemove={(id) => setAdded((s) => s.filter((x) => x !== id))}
          />
        ) : (
          <div
            className="flex h-full flex-col items-center overflow-hidden rounded-[32px] border p-7"
            style={{
              background: "#111315",
              borderColor: "rgba(255,255,255,0.1)",
              boxShadow: "0px 30px 70px 0px rgba(0,0,0,0.34)",
              justifyContent: editOpen ? "flex-start" : "center",
              paddingTop: editOpen ? "max(20px, env(safe-area-inset-top))" : "28px",
            }}
          >
            <div className="flex w-full max-w-[250px] flex-col items-center">
              <p
                className="text-center text-[9px] uppercase text-[#f5c446]"
                style={{ fontFamily: "var(--font-dm-mono)", letterSpacing: "1.8px" }}
              >
                {t("workspace.readyLabel")}
              </p>
              <p
                className="mt-3 text-center text-[14px] leading-[22.75px] text-white/55"
                style={{ fontFamily: "var(--font-gabarito)" }}
              >
                {t("workspace.readyHint")}
              </p>
            </div>
          </div>
        )}

        {groups.length > 1 && (
          <div
            className="absolute right-7 top-7 z-10 flex rounded-full border p-[3px]"
            style={{ background: "rgba(0,0,0,0.35)", borderColor: "rgba(255,255,255,0.15)" }}
          >
            {groups.map((g, i) => (
              <button
                key={g[0].view}
                onClick={() => setActiveGroup(i)}
                className="rounded-full px-3 py-1 text-[11px] uppercase transition-colors"
                style={{
                  fontFamily: "var(--font-dm-mono)",
                  letterSpacing: "1px",
                  background: activeGroup === i ? "#f5c446" : "transparent",
                  color: activeGroup === i ? "#16120a" : "rgba(255,255,255,0.5)",
                }}
              >
                {g[0].view === "front" ? t("nav.front") : t("nav.back")}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="shrink-0 border-t px-4 py-3"
        style={{
          background: "rgba(11,12,13,0.95)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(255,255,255,0.1)",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="h-[41px] flex-[182] rounded-[12px] border text-[10px] uppercase"
            style={{
              borderColor: "rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.75)",
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 500,
              letterSpacing: "1.6px",
            }}
          >
            {t("nav.edit")}
          </button>
          <button
            onClick={handleShare}
            className="h-[41px] flex-[180] rounded-[12px] text-[10px] uppercase"
            style={{
              background: "#f5c446",
              color: "#16120a",
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 500,
              letterSpacing: "1.6px",
            }}
          >
            {t("nav.share")}
          </button>
        </div>
      </div>

      {editOpen && (
        <>
          <div
            className="absolute inset-0 z-20"
            onClick={() => hasSelection && setEditOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 z-30 max-h-[85%] overflow-y-auto rounded-t-[32px] border-t px-5 pt-5"
            style={{
              background: "#141617",
              borderColor: "rgba(255,255,255,0.1)",
              boxShadow: "0px -25px 70px 0px rgba(0,0,0,0.45)",
              paddingBottom: "max(20px, env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex justify-center">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            <h2
              className="pt-5 text-[18px] leading-7 text-[#f4f1e9]"
              style={{ fontFamily: "var(--font-gabarito)", letterSpacing: "0.45px" }}
            >
              {t("sheet.title")}
            </h2>

            <div className="pt-5">
              <p
                className="text-[10px] uppercase text-white/45"
                style={{ fontFamily: "var(--font-dm-mono)", letterSpacing: "1.5px" }}
              >
                {t("sheet.bodyRegion")}
              </p>
              <div className="pt-2">
                <PartsPicker
                  data={data}
                  selected={added}
                  onToggle={(id) => setAdded((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
                />
              </div>
            </div>

            <div className="py-5">
              <p
                className="text-[10px] uppercase text-white/45"
                style={{ fontFamily: "var(--font-dm-mono)", letterSpacing: "1.5px" }}
              >
                {t("sheet.tattooArtwork")}
              </p>
              <div
                className="mt-2 flex items-center gap-3 rounded-[12px] border p-[10px]"
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
                  className="shrink-0 rounded-[8px] border px-3 py-2 text-[9px] uppercase text-white/70"
                  style={{ borderColor: "rgba(255,255,255,0.15)", fontFamily: "var(--font-dm-mono)", letterSpacing: "1.08px" }}
                >
                  {t("sheet.replace")}
                </button>
                <UploadCard ref={replaceRef} variant="hidden" onImage={(img) => setImage(img)} />
              </div>
            </div>

            <button
              disabled={!hasSelection}
              onClick={() => setEditOpen(false)}
              className="h-[39px] w-full rounded-[12px] text-[10px] uppercase transition-opacity"
              style={{
                fontFamily: "var(--font-dm-mono)",
                fontWeight: 500,
                letterSpacing: "1.6px",
                background: hasSelection ? "#f5c446" : "#5e5736",
                color: hasSelection ? "#16120a" : "#24210f",
              }}
            >
              {t("sheet.save")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
