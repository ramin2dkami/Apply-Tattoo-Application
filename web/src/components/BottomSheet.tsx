"use client";

import { useRef, useState } from "react";

export function BottomSheet({
  open, title, onClose, children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center pb-2 pt-3 active:cursor-grabbing"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <div className="h-[5px] w-9 rounded-full" style={{ background: "#e2ddf0" }} />
        </div>
        <div className="flex shrink-0 items-center justify-between px-5 pb-3">
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
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
