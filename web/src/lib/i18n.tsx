"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "es";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const STORAGE_KEY = "tattoo-lang";

const dictionaries: Record<Locale, Record<string, string>> = {
  en: {
    "upload.title": "Upload your tattoo design",
    "upload.subtitle": "Choose an image to unlock placement, scale, and contour tools.",
    "toast.imageUploaded": "Image uploaded",
    "workspace.readyLabel": "Artwork Ready",
    "workspace.readyHint": "Select a body region to place image and then click save.",
    "nav.edit": "Edit",
    "nav.share": "Share",
    "nav.front": "Front",
    "nav.back": "Back",
    "sheet.title": "Edit",
    "sheet.bodyRegion": "Body region",
    "sheet.tattooArtwork": "Tattoo artwork",
    "sheet.selectedImage": "Selected Image",
    "sheet.replace": "Replace",
    "sheet.save": "Save",
    "canvas.returnDefaultView": "Return to default view",
    "canvas.zoomIn": "Zoom in",
    "canvas.zoomOut": "Zoom out",
    "canvas.artSize": "Art size",
    "canvas.width": "Width",
    "canvas.height": "Height",
    "canvas.aspectLocked": "Aspect ratio locked",
    "canvas.aspectUnlocked": "Aspect ratio unlocked",
    "canvas.contourToBody": "Contour to body",
    "upload.selectImage": "Select image",
    "upload.fileHint": "PNG, JPG, WEBP · up to 20 MB",
    "upload.errorNotImage": "That doesn't look like an image. Try a PNG or JPG.",
    "upload.errorUnreadable": "Couldn't read that file. Try another one.",
    "upload.cardTitle": "Upload your tattoo",
    "upload.cardHint": "PNG with a transparent background works best",
    "part.head": "Head",
    "part.torso": "Neck & torso",
    "part.back": "Back",
    "part.hips": "Hips",
    "part.arm-r": "Right arm",
    "part.arm-l": "Left arm",
    "part.leg-r": "Right leg",
    "part.leg-l": "Left leg",
  },
  es: {
    "upload.title": "Sube tu diseño de tatuaje",
    "upload.subtitle": "Elige una imagen para desbloquear la colocación, escala y contorno.",
    "toast.imageUploaded": "Imagen subida",
    "workspace.readyLabel": "Arte listo",
    "workspace.readyHint": "Selecciona una zona del cuerpo para colocar la imagen y luego pulsa guardar.",
    "nav.edit": "Editar",
    "nav.share": "Compartir",
    "nav.front": "Frente",
    "nav.back": "Espalda",
    "sheet.title": "Editar",
    "sheet.bodyRegion": "Zona del cuerpo",
    "sheet.tattooArtwork": "Diseño del tatuaje",
    "sheet.selectedImage": "Imagen seleccionada",
    "sheet.replace": "Reemplazar",
    "sheet.save": "Guardar",
    "canvas.returnDefaultView": "Volver a la vista predeterminada",
    "canvas.zoomIn": "Acercar",
    "canvas.zoomOut": "Alejar",
    "canvas.artSize": "Tamaño del arte",
    "canvas.width": "Ancho",
    "canvas.height": "Alto",
    "canvas.aspectLocked": "Proporción bloqueada",
    "canvas.aspectUnlocked": "Proporción desbloqueada",
    "canvas.contourToBody": "Contornear al cuerpo",
    "upload.selectImage": "Seleccionar imagen",
    "upload.fileHint": "PNG, JPG, WEBP · hasta 20 MB",
    "upload.errorNotImage": "Eso no parece una imagen. Prueba con un PNG o JPG.",
    "upload.errorUnreadable": "No se pudo leer ese archivo. Prueba con otro.",
    "upload.cardTitle": "Sube tu tatuaje",
    "upload.cardHint": "Un PNG con fondo transparente funciona mejor",
    "part.head": "Cabeza",
    "part.torso": "Cuello y torso",
    "part.back": "Espalda",
    "part.hips": "Caderas",
    "part.arm-r": "Brazo derecho",
    "part.arm-l": "Brazo izquierdo",
    "part.leg-r": "Pierna derecha",
    "part.leg-l": "Pierna izquierda",
  },
};

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (key: string, fallback?: string) => string };

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // No accounts/database here — a saved preference just lives in this browser,
  // same as the rest of the app's client-only state.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") {
      setLocaleState(stored);
    } else if (navigator.language.toLowerCase().startsWith("es")) {
      setLocaleState("es");
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(l: Locale) {
    setLocaleState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch {}
  }

  const t = useMemo(() => {
    const dict = dictionaries[locale];
    return (key: string, fallback?: string) => dict[key] ?? dictionaries.en[key] ?? fallback ?? key;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
