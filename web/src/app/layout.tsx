import type { Metadata, Viewport } from "next";
import { Gabarito, DM_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const gabarito = Gabarito({ subsets: ["latin"], variable: "--font-gabarito" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" });

export const metadata: Metadata = {
  title: "Tattoo Placement",
  description: "Show your artist exactly where and how big.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b0c0d",
};

// Runs before first paint, so the very first frame is already the right height.
// Doing this in a useEffect meant the landing screen painted at 100dvh and then
// snapped once React hydrated — visible as a jump on a slow (GitHub Pages) load.
// visualViewport.height is the only measurement that matches what is actually
// visible inside an in-app WebView (Instagram, WhatsApp) or under iOS Safari's
// collapsing toolbar; innerHeight is the fallback for browsers without it.
const APP_HEIGHT_SCRIPT = `
(function () {
  var d = document.documentElement;
  function set() {
    var vv = window.visualViewport;
    var h = vv && vv.height ? vv.height : window.innerHeight;
    d.style.setProperty("--app-height", h + "px");
  }
  set();
  addEventListener("resize", set);
  addEventListener("orientationchange", set);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", set);
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: APP_HEIGHT_SCRIPT }} />
      </head>
      <body className={`${gabarito.variable} ${dmMono.variable}`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
