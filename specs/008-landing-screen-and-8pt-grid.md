# 008 — Landing screen fit + 8pt spacing grid

**Status:** shipped
**Roadmap item:** prototype polish

## What it does

Two things, both about the first impression on a phone:

1. **The landing screen fills the phone properly.** No black strip above the hero, no
   layout jump on load, the language pill never lands on top of the illustration, and
   the artwork stays composed instead of being sliced when the viewport is short (which
   is what an in-app browser or Safari-with-toolbars actually gives you).
2. **Every spacing value in the app sits on an 8pt grid.** Sizes and spacing are
   multiples of 8 (4 allowed as the half-step for tight micro-spacing and for radii).

## Why it matters

The landing screen is the only screen an artist's customer sees before deciding whether
this is worth their time. A screen that renders with dead space or jumps on load reads
as broken, and a broken-looking tool goes back to being a DM thread. The grid is
housekeeping that keeps every later screen consistent for free.

## How it works

**Viewport height.** `--app-height` is set by a tiny inline script in `<head>`
(`layout.tsx`) so the first paint is already correct instead of using `100dvh` and then
snapping when React hydrates. It measures `window.innerHeight` — the number that
matches what the user can actually see in a WKWebView — and only ever lets
`visualViewport.height` raise it, never lower it, because a low reading is what
produces a dead band above the browser toolbar. Because an in-app browser settles its
chrome a beat *after* the first frame and often fires no event about it, the script
re-measures on two animation frames, on `DOMContentLoaded` / `load` / `pageshow` /
`resize` / `orientationchange` / `visualViewport` events, and on a short ladder of
timeouts.

Measurement alone is not trusted: `.app-shell` (globals.css) is
`height: var(--app-height); min-height: 100%` with `html, body { height: 100% }`, so a
stale or under-reported measurement can never leave a gap — `100%` resolves against the
real layout viewport and acts as the floor.

**Language control.** It sits in the dark copy block under the file hint, not floating
over the illustration. Over the artwork it was hard to pick out, and in an in-app
browser it lands directly under the URL bar.

**Landing layout.** The hero image is full-bleed to the very top — the safe-area inset
is applied to the language pill instead of as a margin on the panel, so there is no
black band. A top scrim keeps the pill legible over the artwork without overlapping it,
and a bottom gradient fades the hero into the dark copy block instead of a hard seam.
The copy block has a `min-height` so a short viewport eats into the image rather than
squeezing the button off-screen, and `object-position` keeps the subject centred when
the image is cropped.

**Grid.** `globals.css` declares the scale as `--s-*` tokens and every hand-written
pixel value in the app was snapped to it. Type sizes are not on the grid (type is not
spatial), but line-heights are multiples of 4.

## Done when

- [x] No black strip at the top of the landing screen
- [x] No layout jump between first paint and hydration
- [x] Language control legible — moved off the artwork into the copy block
- [x] No dead band above an in-app browser toolbar even if the measurement is stale
- [x] The select-image button is fully visible at 375×620
- [x] All spacing / sizing values are multiples of 8 (4 for micro-spacing and radii)
- [x] Works on a phone browser
- [x] Needs no account

## Explicitly not in this

No new copy, no new hero art, no change to the workspace's interaction model — only its
spacing.
