# 007 — Rotate the part

**Status:** draft
**Roadmap item:** Now / Prototype v1

## What it does

The customer spins the body part around to place a tattoo anywhere on it — inner
forearm, back of the calf, side of the ribs — not just the side facing forward.

## Why it matters

Roughly half of all placements are somewhere you can't see in a front view, and inner
versus outer forearm are different tattoos at different prices. Without rotation the
tool can only describe half the body, which means the artist still has to ask.

## How it works

**Limbs rotate continuously; the torso doesn't.** This split is forced by geometry,
not preference — see `context/decisions.md` D7.

**Arms and legs — one drawing, 360°.** A limb is a stack of near-circular
cross-sections, so its outline is the same from every angle. Rotating changes which
skin faces the viewer, not the silhouette. Every point on the surface is
`(height, angle)`, and rotation shifts the angle:

```
cx, R  = axis(y)                     // centre and radius at this height
a      = alpha - theta               // alpha = where it sits on the skin
x      = cx + R * sin(a)             // screen position
ink    = cos(a)                      // facing the viewer; <= 0 means hidden
```

The tattoo's horizontal axis is arc length along the skin, so `alpha` varies across
its width and it wraps naturally. Anatomy lines (biceps, elbow crease, ulna ridge) are
surface curves at their own angles, so they rotate too — without that the limb looks
static and the rotation doesn't read.

**Head, torso, hips — discrete views.** Their cross-section is nowhere near circular
and front and back are genuinely different drawings. They step between views rather
than rotating freely. Inventing continuous rotation here would mean inventing side
views the geometry doesn't support.

**Interaction:** horizontal drag on the part spins it. Snap points at 0/90/180/270 so
"the outside of my forearm" is easy to land on exactly. The rotation angle is part of
the placement and must appear in the brief — "outer forearm, rotated 90°" is exactly
the ambiguity we exist to remove.

## Done when

- [x] Projection maths proven for a limb across 360° (`assets/contour-proof.html`)
- [ ] Drag to rotate an arm or leg, smooth on a phone
- [ ] Anatomy lines rotate with the surface
- [ ] Tattoo hides correctly as it passes the silhouette edge
- [ ] Snap points at the quarter turns
- [ ] Front/back toggle for head, torso and hips
- [ ] Rotation appears on the share page
- [ ] Works on a phone browser
- [ ] Needs no account

## Explicitly not in this

Tilting the part up and down, perspective, foreshortening along the limb's length, or
any true 3D camera. One axis of rotation only.

## Open questions

- Forearms and calves are noticeably elliptical, not round. The circular approximation
  may look wrong at 90°, where an ellipse is at its narrowest. Fix is one more number
  per part, not a new model — but check whether it's needed before adding it.
- Does a rotating outline that never changes shape read as rotation, or as a bug? The
  anatomy lines are carrying that entire perception.
- Torso side views: needed, or is front/back enough for quoting?
