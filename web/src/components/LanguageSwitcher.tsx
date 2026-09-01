"use client";

import { LOCALES, useLanguage, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Language"
      className={className}
      style={{
        appearance: "none",
        background: "rgba(0,0,0,0.45)",
        color: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: 999,
        fontSize: 11,
        letterSpacing: "1px",
        textTransform: "uppercase",
        fontFamily: "var(--font-dm-mono)",
        padding: "7px 26px 7px 14px",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23ffffff' stroke-opacity='0.7' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      {LOCALES.map((l) => (
        <option key={l.value} value={l.value} style={{ color: "#000" }}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
