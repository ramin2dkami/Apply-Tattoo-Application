# 004 — Real-world sizing

**Status:** shipped
**Roadmap item:** Now / Prototype v1

## What it does

Shows the tattoo's actual size — "4.5 in × 3.1 in" — live, updating as the customer
resizes, with an inches/cm toggle.

## Why it matters

This is the single number the artist needs and the one customers are worst at
estimating. "Medium" costs an artist three messages; "4.5 inches wide" costs zero.
Of everything in v1, this is the piece that most directly delivers the promise.

## How it works

Each body part asset declares `referenceDimension.cm` and `referencePixels`
(see `001`), giving px-per-cm for that illustration. The tattoo's on-screen bounding
box in body-part pixel space, divided by that ratio, is its real-world size.

Two things to get right:

- Measure the tattoo's **visible content**, not its transparent bounding box. A PNG
  with 200px of empty margin would otherwise report a size that's flatly wrong.
- Report the size **before** contour warping. The warp shortens the image where the
  surface curves away; the flat dimensions are what the artist stencils from.

Display it persistently near the tattoo, not hidden in a panel — the number is a
primary output, and seeing it change while resizing is what teaches people what
"4 inches" actually looks like on a forearm.

## Done when

- [x] Live size readout updates during resize
- [x] Inches/cm toggle
- [x] Measures visible content, ignoring transparent padding (`web/src/lib/image.ts`)
- [ ] Verified against known reference dimensions on at least three assets
- [ ] Size appears on the share page (`006`)
- [ ] Works on a phone browser
- [ ] Needs no account

## Explicitly not in this

Calibrating to the customer's actual body. Our illustrations are average proportions;
the number is an accurate specification of intent, not a measurement of that person.
Say so plainly on the share page rather than implying a precision we don't have.

## Open questions

- Inches or cm as the default? Probably inches for US, but detect locale rather than
  guessing.
- Do artists want width × height, or the longest dimension? Ask the first three.
