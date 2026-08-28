"use client";

import { useRef, useState } from "react";

export function BottomSheet({
  open, title, onClose, children, footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Pinned below the scrollable content, never inside it — so the primary action
   *  (e.g. "Done") stays reachable even if the content is taller than the sheet on
   *  a small phone, instead of getting pushed below the fold. */
  footer?: React.ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const dragging = useRef<number | null>(null);

  if (!open) return null;

  function down(e: React.PointerEvent) {
    dragging.current = e.clientY;
  }
  function move(e: React.PointerEvent) {
    if (dragging.current == null) return;
    setDragY(Math.max(0, e.clientY - dragging.current));
  }
  function up() {
    if (dragY > 90) onClose();
    setDragY(0);
    dragging.current = null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 animate-in fade-in duration-200"
        style={{ background: "rgba(20,18,31,.42)" }}
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col rounded-t-[28px] bg-white animate-in slide-in-from-bottom duration-250"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging.current == null ? "transform .18s ease" : "none",
          boxShadow: "0 -8px 40px rgba(20,18,31,.22)",
        }}
      >
        {/* All spacing below is on an 8pt grid (Tailwind 2/4/6/8 = 8/16/24/32px). */}
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center pb-2 pt-4 active:cursor-grabbing"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <div className="h-1 w-8 rounded-full" style={{ background: "#e2ddf0" }} />
        </div>
        <div className="flex shrink-0 items-center justify-between px-6 pb-4">
          <h2 className="text-[17px] font-extrabold tracking-[-0.02em]">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "#f4f2fa" }}
            aria-label="Close"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b6880"
                 strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-6"
          style={{ paddingBottom: footer ? 24 : "max(24px, env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
        {footer && (
          <div
            className="shrink-0 border-t px-6 pt-4"
            style={{ borderColor: "var(--line)", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
