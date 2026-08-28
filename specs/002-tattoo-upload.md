# 002 — Tattoo upload

**Status:** shipped
**Roadmap item:** Now / Prototype v1

## What it does

The customer gets their tattoo image into the app — from their camera roll, a file
picker, or by dragging it in on desktop.

## Why it matters

The image is already on their phone; the entire premise is that they can act on it
themselves. Any friction here is fatal because it's before they've seen any value.

## How it works

Standard file input plus drag-and-drop. Accept PNG, JPG, WebP, HEIC. Handle everything
client-side — the image doesn't need to leave the browser until they share.

Transparency is the happy path. A JPG with a white background will look like a white
sticker on skin, so when we detect an opaque image we offer a one-tap "remove white
background" (simple luminance-threshold knockout, not ML). Offer it, don't require it.

Downscale oversized images on upload; a 12MP photo of a sketch will make the canvas
sluggish on a phone for no benefit.

## Done when

- [ ] Upload works from a phone camera roll
- [ ] Transparent PNGs preserve their alpha
- [ ] Opaque images get the optional background knockout
- [ ] Large images are downscaled without visible quality loss at placement size
- [ ] Clear error for unsupported or corrupt files
- [ ] Works on a phone browser
- [ ] Needs no account

## Explicitly not in this

Editing the artwork — no cropping, recoloring, filters, or AI cleanup. We don't touch
the design.

## Open questions

- Is the luminance knockout good enough for a pencil sketch photographed on paper, or
  does that case need its own handling?
