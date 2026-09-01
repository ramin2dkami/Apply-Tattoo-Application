"use client";

export function Toast({ message, show }: { message: string; show: boolean }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-5 transition-all duration-300"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(-12px)",
      }}
      aria-live="polite"
    >
      <div
        className="flex items-center gap-2 rounded-full py-2.5 pl-2.5 pr-4 text-[13.5px] font-bold tracking-[-0.01em] text-white shadow-lg"
        style={{ background: "var(--ink)" }}
      >
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--violet)" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff"
               strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        {message}
      </div>
    </div>
  );
}
