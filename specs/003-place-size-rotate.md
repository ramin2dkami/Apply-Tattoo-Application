# 003 — Place, size, rotate

**Status:** draft
**Roadmap item:** Now / Prototype v1

## What it does

The customer drags the tattoo around the body part, pinches or drags a handle to
resize it, rotates it, and dials opacity until it looks the way they picture it.

## Why it matters

This is the app. Everything else is setup and delivery. If the manipulation feels
laggy or fiddly on a phone, nobody finishes, and nothing else we build matters.

## How it works

Canvas with two layers: the figure underneath, cropped to the selected region or to the
union of a spanning selection, and the tattoo above. A span is one canvas in one
coordinate space — never two canvases stitched together.

Gestures on touch:

- One finger drag — move
- Two finger pinch — scale, about the pinch midpoint
- Two finger twist — rotate
- Opacity on a slider, not a gesture

On desktop: drag to move, corner handles to scale (shift to constrain), a rotation
handle above the bounding box, same opacity slider.

Constraints that keep it from getting silly:

- The tattoo can't be dragged fully off the body — clamp so a meaningful portion stays
  within the selected region, or within the union when spanning
- Aspect ratio always locked. Nobody wants a stretched tattoo, and an artist can't
  quote from one.
- Sensible min and max scale relative to the body part
- Undo, at minimum for the last action

Interaction has to run at 60fps on a mid-range phone. Transform the layer with CSS
or canvas transforms during the gesture and only re-render the composite on release.
The contour warp (`005`) is expensive — apply it on gesture end, not per frame.

## Done when

- [ ] Move, scale, rotate all work by touch on a real phone
- [ ] Aspect ratio stays locked
- [ ] Tattoo can't be lost off-canvas
- [ ] Undo restores the previous transform
- [ ] Interaction stays smooth on a mid-range Android phone
- [ ] Works on a phone browser
- [ ] Needs no account

## Explicitly not in this

Multiple tattoos at once, layers, flipping/mirroring, snapping guides, freeform
distortion. Mirroring may earn its way in early — watch for it in user sessions.

## Open questions

- Do people expect to rotate at all, or is it noise? Watch first five users before
  investing in the gesture.
