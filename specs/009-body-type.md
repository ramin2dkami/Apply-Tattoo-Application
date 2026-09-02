# 009 — Male / female body

**Status:** shipped
**Roadmap item:** Prototype v1 — body part picker (extends `specs/001`)

## What it does

In the Edit sheet, above the body-region buttons, the customer picks the body they're
placing the tattoo on: **Male** or **Female**. The illustration, the silhouettes the
tattoo is warped against, and the real-world size numbers all switch to that body. The
region buttons, the uploaded artwork and everything else stay exactly as they were.

## Why it matters

Roughly half of a shop's customers do not look like the figure we were shipping. The
mismatch costs the artist a message ("that's not my shape") and, worse, it costs
trust in the size readout — the number is only credible if the body it came from is
plausible. Same promise as `specs/004`: an artist can quote from what they're sent.

## How it works

One generator, two anatomy tables. `assets/tools/build_figure.py` now builds a
*variant*: male (unchanged, 180 cm) and female (165 cm), each written to its own
folder — `assets/figure/` and `assets/figure/female/`.

The female tables are derived from the male ones rather than authored from scratch, so
the two figures can never drift apart structurally:

- every height scales by `SY = 165/180`, so landmarks stay in proportion;
- limbs scale separately in centre-offset and width (narrower shoulders, slimmer arms);
- the torso outline is scaled by a **per-height width factor** — narrower ribcage,
  bust, waist at 0.83, hips at 1.14 — so the silhouette that drives the contour warp
  is the female one, not a shrunken male one;
- the torso detail lines are re-curated (bust curve, no pecs or nipples) with the same
  transform applied, so the linework lands on the outline it was drawn for.

Because scale in this pipeline is exact by construction, the female figure's part
lengths and region reference dimensions fall out of the tables — a female forearm
reports 23.8 cm, not 26 cm — and the build still asserts every region span.

The web app fetches `/figure/parts.json` or `/figure/female/parts.json`. Part **ids are
identical across both**, so switching body keeps the customer's region selection; the
placement canvas remounts (the geometry underneath it changed) and re-centres the
tattoo.

## Done when

- [x] Male / female selector in the Edit sheet, above Body region
- [x] Switching re-renders the figure, the warp surface and the size readout
- [x] Region selection survives the switch
- [x] Translated (EN/ES)
- [x] Works on a phone browser
- [x] Needs no account

## Explicitly not in this

- **No real traced artwork for the female figure.** The five good traces in
  `assets/SVG body parts/` are all of the male reference; the female figure is
  procedural everywhere, which the canvas already supports (head and hips have always
  been procedural-only).
- No body-size / build slider. Two figures, not a body-type editor.
- No non-binary or custom figure. Worth revisiting once artists ask; the generator is
  now variant-shaped, so a third table is a small change rather than a rewrite.
- The choice is not persisted between sessions and is not yet in the share link —
  it goes into the payload when `specs/006` ships.

## Open questions

- Is 165 cm the right female reference height, or should both figures be the same
  height so sizes compare directly between them? Ask an artist.
