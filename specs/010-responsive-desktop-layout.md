# 010 — Responsive desktop layout

**Status:** building
**Roadmap item:** Now / Prototype v1

## What it does

The same app, opened on a laptop or desktop browser, stops looking like a phone
screen stretched into a black column in the middle of the page. Above a width
breakpoint, the edit controls (body type, body region, tattoo artwork) become a
persistent side panel instead of a bottom sheet that has to be opened and closed, and
the canvas gets real room to work with instead of being capped at phone width.

Below the breakpoint, nothing changes — same markup, same components, same gestures.

## Why it matters

Artists and customers increasingly open the link on whatever's in front of them —
laptop at the shop, desktop at home. A mobile layout on a 1440px screen reads as
broken, not "not done yet," and that's the artist's first impression of the product.
This doesn't touch the mobile experience, which is the primary device and stays
untouched.

## How it works

One breakpoint (`lg`, 1024px), added as Tailwind `lg:` variants on the existing
components — no separate desktop route or component tree.

- **Landing/upload screen:** below `lg`, unchanged (full-bleed hero image, copy block
  pinned to the bottom). At `lg` and up, hero image and the copy+upload block sit
  side by side, centered in the viewport, both capped in width so they read as a
  composed screen rather than a stretched phone frame.
- **Workspace screen:** below `lg`, unchanged (canvas + bottom Edit/Share bar, edit
  sheet slides up as an overlay). At `lg` and up:
  - The edit controls (`BodyPicker`, `PartsPicker`, tattoo artwork row) render once,
    in a new shared `EditPanel` component, and are placed in a persistent left column
    instead of a bottom-sheet overlay. No open/close state, no backdrop, no Save
    button — the canvas already reflects every change live.
  - The canvas region is capped at a max width so it doesn't stretch edge-to-edge on
    an ultrawide monitor, and centered in the remaining space.
  - The mobile bottom Edit/Share bar is hidden; Share becomes a small button in a top
    corner instead, since there's nothing left to "Edit" toward.
  - Front/back toggle (when a group has both) keeps its current placement.

`PlaceCanvas` and `FigureSvg` need no changes — the canvas already sizes itself off
its host via `ResizeObserver`, so handing it a wider or differently-shaped container
is enough.

## Done when

- [ ] Below 1024px, pixel-identical to today (bottom sheet, bottom bar, full-bleed
      landing)
- [ ] At 1024px and up: edit controls are a persistent side panel, no overlay/backdrop
- [ ] At 1024px and up: canvas isn't stretched full-bleed on a wide monitor
- [ ] Landing screen reads as composed, not stretched, at desktop widths
- [ ] All existing interactions (drag, corner handles, wheel zoom, front/back toggle,
      body type switch, share) still work at desktop widths
- [ ] Works on a phone browser (unchanged)
- [ ] Needs no account

## Explicitly not in this

A distinct desktop-only page or route, a different information architecture, drag-and-
drop reflow, keyboard shortcuts, or redesigning any visual language — this is a layout
response to available width, not a new design.

## Open questions

None — mechanical layout work, no new product decisions.
