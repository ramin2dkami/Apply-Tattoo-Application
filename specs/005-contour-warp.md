# 005 — Contour warp

**Status:** draft
**Roadmap item:** Now / Prototype v1

## What it does

Bends the tattoo to follow the curve of the body part, so it reads as being *on* an
arm rather than pasted over a picture of one.

## Why it matters

It's the difference between a mockup and a preview. It's also what makes the customer
trust the placement enough to commit to it, and what makes the artist take the brief
seriously instead of treating it as a rough idea.

## How it works

**The displacement map is derived, not painted.** A limb is close enough to a cylinder
that the silhouette already contains the surface model: the half-width at a given
height *is* the radius, and the surface normal follows from horizontal position within
it. `regions.json` carries the silhouette; nothing needs authoring per region.

The mapping. **Resolve the radius per row, not once for the whole tattoo** — that is
what lets a piece span a joint where the limb narrows and widens again:

```
for each destination row y:
    R  = (right(y) - left(y)) / 2    // cylinder radius AT THIS HEIGHT
    cx = (right(y) + left(y)) / 2
    st = R * asin((tattooCx - cx) / R)
    for each x in that row:
        s = R * asin((x - cx) / R)   // arc length from the limb's centre
        u = (s - st) + tattooWidth/2 // -> column in the source artwork
        a = cos(s / R)               // surface normal -> ink opacity
```

Vertical lines stay vertical on a vertical cylinder, so rows are independent. Sample
bilinearly: line art aliases badly under nearest-neighbour.

A single radius for the whole tattoo — the obvious first implementation — looks fine on
a short piece and visibly wrong on anything spanning a joint, because the limb's width
changes underneath it.

Proven in `assets/contour-proof.html`, across a 58 cm span crossing the elbow and in
the neutral outline style — where
there is no shading to help, so the geometry carries it alone. Keep the opacity floor
higher (~0.45) than a shaded illustration would need: on white, ink that fades too far
at the edges just looks like a rendering bug.

Applied to the tattoo layer this should:

- Compress the tattoo horizontally as it approaches the silhouette edge, matching how
  a cylinder foreshortens
- Reduce opacity where the surface turns away
Clamp the tattoo's half-width to about 1.31 R before it wraps out of sight.

Canvas column slicing is fast enough; a WebGL shader is available if profiling says
otherwise. Either way it runs **on gesture end**, not per frame — see `003`.

Ship a toggle: "flat / contoured". Some customers will want to see the artwork
undistorted, and it's a cheap escape hatch if the warp looks wrong on some asset.

## Done when

- [ ] Tattoo visibly follows the curve on a cylindrical part (forearm, calf)
- [ ] Looks right on a flat-ish part too (back, chest) without over-distorting
- [ ] Doesn't block or stutter the drag/resize interaction
- [ ] Flat/contoured toggle works
- [ ] Reported size (`004`) stays the pre-warp flat size
- [ ] Works on a phone browser
- [ ] Needs no account

## Explicitly not in this

Real 3D, depth capture, skin texture simulation, or per-body-type deformation. This is
a convincing 2D effect, and that is the correct scope for a prototype.

## Open questions

- ~~Who paints the displacement maps?~~ Resolved: nobody. Derived from the silhouette.
- Chest and stomach aren't cylinders. They currently use a shallower `wrapDegrees`
  (105–110 vs 150), which is a guess. Check it against a real placement.
- ~~The warp uses a single radius and ignores taper.~~ Resolved: radius is resolved
  per row.
- Chains only cover collinear surfaces. Artwork crossing torso to arm has no model.
- Does the warp actually change how artists respond, or is it polish? Test flat vs
  contoured with the first artists before investing further in it.
