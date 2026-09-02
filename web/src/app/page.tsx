"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCard, type UploadCardHandle } from "@/components/UploadCard";
import { EditPanel } from "@/components/EditPanel";
import { PlaceCanvas } from "@/components/PlaceCanvas";
import { Toast } from "@/components/Toast";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { BodyType, FigureData } from "@/lib/geometry";
import { withBasePath } from "@/lib/basePath";
import { useLanguage } from "@/lib/i18n";

type Step = "upload" | "workspace";

// One file per body; part ids match across the two (specs/009).
const FIGURE_SRC: Record<BodyType, string> = {
  male: "/figure/parts.json",
  female: "/figure/female/parts.json",
};

export default function Home() {
  const { t } = useLanguage();
  const [data, setData] = useState<FigureData | null>(null);
  const [body, setBody] = useState<BodyType>("male");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("upload");
  const [editOpen, setEditOpen] = useState(true);
  const [activeGroup, setActiveGroup] = useState(0);
  const [toast, setToast] = useState(false);
  const replaceRef = useRef<UploadCardHandle>(null);
  const figures = useRef<Partial<Record<BodyType, FigureData>>>({});

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

  // Switching body swaps the whole geometry file. The previous figure stays on screen
  // until the new one lands (and cached bodies swap instantly), so the sheet never
  // flashes the full-screen loading state out from under the customer.
  useEffect(() => {
    const hit = figures.current[body];
    if (hit) { setData(hit); return; }
    let alive = true;
    fetch(withBasePath(FIGURE_SRC[body]))
      .then((r) => r.json())
      .then((d: FigureData) => {
        figures.current[body] = d;
        if (alive) setData(d);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [body]);

  // Full-screen views use .app-shell (globals.css) for their height — see the
  // comment on APP_HEIGHT_SCRIPT in layout.tsx for why measuring the viewport in an
  // in-app browser needs both a live measurement and a 100% floor.

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
        className="app-shell flex items-center justify-center bg-[#0b0c0d] text-white/50"
      >
        Loading…
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div
        className="app-shell flex w-full flex-col overflow-hidden bg-[#0b0c0d] lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:overflow-auto lg:px-16 lg:py-16"
      >
        <Toast message={t("toast.imageUploaded")} show={toast} />

        {/* Full-bleed to the very top on phone: no safe-area margin here, so there is
            no dead strip above the artwork. At lg the hero becomes one half of a
            centered, composed screen instead of stretching edge to edge. */}
        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#111315] lg:max-w-[480px] lg:flex-none lg:rounded-[32px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={withBasePath("/landing/hero.png")}
            alt="Person reviewing tattoo ideas on their phone"
            className="h-full w-full object-cover lg:h-[560px] lg:w-[480px]"
            style={{ objectPosition: "50% 32%" }}
          />
          {/* Fade the hero into the copy block instead of ending on a hard seam.
              Only needed on phone, where the copy sits directly below it. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 lg:hidden"
            style={{ background: "linear-gradient(to bottom, rgba(11,12,13,0), #0b0c0d)" }}
          />
        </div>

        {/* min-height keeps the copy and the button whole on a short viewport (an
            in-app browser, or Safari with both toolbars showing) — the hero gives up
            the space instead. At lg the block sits beside the hero, vertically
            centered, so the min-height floor no longer applies. */}
        <div
          className="flex w-full shrink-0 flex-col items-center px-6 pt-6 lg:w-auto lg:px-0 lg:pt-0"
          style={{
            minHeight: 264,
            paddingBottom: "max(24px, calc(env(safe-area-inset-bottom) + 16px))",
          }}
        >
          <div className="w-full max-w-[264px] lg:max-w-[340px]">
            <h1
              className="text-center text-[24px] leading-8 text-white lg:text-left lg:text-[34px] lg:leading-[1.15]"
              style={{ fontFamily: "var(--font-gabarito)", letterSpacing: "-0.96px" }}
            >
              {t("upload.title")}
            </h1>
            <p className="mt-2 text-center text-[14px] leading-6 text-white/50 lg:text-left lg:text-[16px]">
              {t("upload.subtitle")}
            </p>
            <div className="mt-6 w-full">
              <UploadCard variant="dark" onImage={(img) => handleImage(img)} />
            </div>
            {/* The language control lives here, on the solid block, rather than
                floating over the illustration — over the artwork it was hard to
                pick out, and in an in-app browser it sits right under the URL bar. */}
            <div className="mt-4 flex justify-center lg:justify-start">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- workspace: canvas + bottom bar always occupy the same fixed layout — the
  // edit sheet is an overlay on top of them, so opening/closing it never reflows
  // (and never resizes) the illustration underneath. At lg, a persistent side panel
  // (EditPanel, shared with the mobile sheet — specs/010) replaces the overlay and
  // the canvas column gets its own max width instead of stretching full-bleed. ----
  return (
    <div
      className="app-shell relative flex w-full flex-col overflow-hidden bg-[#0b0c0d] lg:flex-row lg:gap-6 lg:p-6"
    >
      <Toast message={t("toast.imageUploaded")} show={toast} />

      {/* Desktop side panel: same EditPanel as the mobile sheet, always visible, no
          backdrop or open/close state — the canvas already reflects every change. */}
      <aside
        className="hidden lg:flex lg:w-[320px] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:rounded-[24px] lg:border lg:px-6 lg:py-6"
        style={{ background: "#141617", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <h2
          className="text-[18px] leading-7 text-[#f4f1e9]"
          style={{ fontFamily: "var(--font-gabarito)", letterSpacing: "0.45px" }}
        >
          {t("sheet.title")}
        </h2>
        <div className="pt-6">
          <EditPanel
            data={data}
            body={body}
            onBodyChange={setBody}
            added={added}
            onToggle={(id) => setAdded((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
            image={image}
            replaceRef={replaceRef}
            onImageReplace={(img) => setImage(img)}
          />
        </div>
      </aside>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="hidden shrink-0 items-center justify-end gap-3 pb-4 lg:flex">
          <LanguageSwitcher />
          <button
            onClick={handleShare}
            className="h-9 min-w-[112px] rounded-[10px] px-6 text-[10px] uppercase"
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

        <div
          className="relative min-h-0 flex-1 overflow-hidden px-4 pb-4 lg:w-full lg:px-0 lg:pb-0"
          style={{ marginTop: "max(16px, env(safe-area-inset-top))" }}
        >
        {hasPlacement ? (
          <PlaceCanvas
            /* Keyed on the figure the canvas is actually showing, not the one the
               customer just asked for: `body` flips a render before its geometry has
               loaded, and remounting on it would seed the placement from the OLD
               figure's coordinate space and then never re-seed. */
            key={`${data.figure.body ?? "male"}:${groups[activeGroup].map((p) => p.id).join("+")}`}
            parts={groups[activeGroup]}
            image={image!}
            proceduralPxPerCm={data.figure.pxPerCm}
            figureArt={data.figure.art}
            figureArtBack={data.figure.artBack}
            onRemove={(id) => setAdded((s) => s.filter((x) => x !== id))}
          />
        ) : (
          <div
            className={`flex h-full flex-col items-center overflow-hidden rounded-[32px] border p-6 lg:justify-center ${editOpen ? "justify-start" : "justify-center"}`}
            style={{
              background: "#111315",
              borderColor: "rgba(255,255,255,0.1)",
              boxShadow: "0px 30px 70px 0px rgba(0,0,0,0.34)",
              paddingTop: editOpen ? "max(24px, env(safe-area-inset-top))" : "24px",
            }}
          >
            <div className="flex w-full max-w-[256px] flex-col items-center">
              <p
                className="text-center text-[10px] uppercase text-[#f5c446]"
                style={{ fontFamily: "var(--font-dm-mono)", letterSpacing: "1.8px" }}
              >
                {t("workspace.readyLabel")}
              </p>
              <p
                className="mt-2 text-center text-[14px] leading-6 text-white/55"
                style={{ fontFamily: "var(--font-gabarito)" }}
              >
                {t("workspace.readyHint")}
              </p>
            </div>
          </div>
        )}

        {groups.length > 1 && (
          <div
            className="absolute right-6 top-6 z-10 flex rounded-full border p-1"
            style={{ background: "rgba(0,0,0,0.35)", borderColor: "rgba(255,255,255,0.15)" }}
          >
            {groups.map((g, i) => (
              <button
                key={g[0].view}
                onClick={() => setActiveGroup(i)}
                className="rounded-full px-3 py-1 text-[11px] uppercase leading-5 transition-colors"
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
        className="shrink-0 border-t px-4 pt-2 lg:hidden"
        style={{
          background: "rgba(11,12,13,0.95)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(255,255,255,0.1)",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="h-10 flex-1 rounded-[12px] border text-[10px] uppercase"
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
            className="h-10 flex-1 rounded-[12px] text-[10px] uppercase"
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
      </div>

      {editOpen && (
        <div className="lg:hidden">
          <div
            className="absolute inset-0 z-20"
            onClick={() => hasSelection && setEditOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 z-30 max-h-[85%] overflow-y-auto rounded-t-[24px] border-t px-6 pt-4"
            style={{
              background: "#141617",
              borderColor: "rgba(255,255,255,0.1)",
              boxShadow: "0px -25px 70px 0px rgba(0,0,0,0.45)",
              paddingBottom: "max(24px, env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex justify-center">
              <div className="h-1 w-8 rounded-full bg-white/20" />
            </div>

            <h2
              className="pt-6 text-[18px] leading-7 text-[#f4f1e9]"
              style={{ fontFamily: "var(--font-gabarito)", letterSpacing: "0.45px" }}
            >
              {t("sheet.title")}
            </h2>

            <div className="pt-6 pb-6">
              <EditPanel
                data={data}
                body={body}
                onBodyChange={setBody}
                added={added}
                onToggle={(id) => setAdded((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
                image={image}
                replaceRef={replaceRef}
                onImageReplace={(img) => setImage(img)}
              />
            </div>

            <button
              disabled={!hasSelection}
              onClick={() => setEditOpen(false)}
              className="h-10 w-full rounded-[12px] text-[10px] uppercase transition-opacity"
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
        </div>
      )}
    </div>
  );
}
