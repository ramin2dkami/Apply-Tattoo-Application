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

// Sizing the app to the viewport inside an in-app browser (WhatsApp, Instagram)
// has bitten us twice, in the same direction both times: the app ends up SHORTER
// than the visible area, leaving a dead black band above the browser's toolbar.
//
// Both causes were measurement, not maths. `100dvh` under-reports in a WKWebView,
// and so does `visualViewport.height` — it describes the visual viewport, which at
// load time is not yet the settled layout viewport. `window.innerHeight` is the one
// that matches what the user can actually see, but ONLY once the WebView has
// finished resizing itself, which happens a beat after the first frame.
//
// So: measure early (so the first frame is close), then keep re-measuring through
// every event and tick where a WebView is known to change its mind. `set` is cheap
// and idempotent. The layout also carries a `min-height: 100%` floor, so even a
// stale reading can't leave a gap.
const APP_HEIGHT_SCRIPT = `
(function () {
  var d = document.documentElement;
  function set() {
    var h = window.innerHeight;
    var vv = window.visualViewport;
    // Only ever let visualViewport make it taller, never shorter — a shorter
    // reading is what produces the dead band.
    if (vv && vv.height > h) h = vv.height;
    if (h > 0) d.style.setProperty("--app-height", h + "px");
  }
  set();
  requestAnimationFrame(function () { set(); requestAnimationFrame(set); });
  ["resize", "orientationchange", "pageshow", "load"].forEach(function (e) {
    addEventListener(e, set);
  });
  document.addEventListener("DOMContentLoaded", set);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", set);
    window.visualViewport.addEventListener("scroll", set);
  }
  // In-app browsers settle their chrome after the first paint and fire nothing.
  [50, 150, 350, 700, 1500].forEach(function (t) { setTimeout(set, t); });
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
