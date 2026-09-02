# assets/

The body figure. Moves to `public/` when the Next.js app is scaffolded.

**Do not hand-edit anything in `figure/`.** It is all generated:

```
python3 assets/tools/build_figure.py   # -> per-part SVGs + front/back + regions.json
python3 assets/tools/build_proof.py    # -> contour-proof.html (static SVG, no JS)
```

## Parts are drawn on their own

Each part is emitted as its own SVG — a clean whole limb, not a crop of a body — and
the same shapes are assembled into the picker figure. Both renderings come from one
table of anatomy, so they cannot drift, and because every part is drawn in the same
coordinate space as the assembly, a part file is a drop-in swap: silhouettes, sizing
and the warp are unaffected by which one is showing.

`head torso back hips arm-r arm-l leg-r leg-l` + `front.svg` `back.svg`

**Anatomical sides, not viewer sides.** A person's right arm is drawn on the viewer's
left. `MIRROR` in the generator is the single place this is decided — getting it
backwards points the artist at the wrong arm, which is the exact ambiguity the product
exists to remove.

## One figure, named regions

Neutral line art — outlines only, no fill colour, no skin tone
(`context/decisions.md` D5). The profile is centimetres on a 180 cm body at a fixed
10 px/cm, mirrored about the centreline. Regions are viewBox windows into that one
drawing, so zooming to a forearm costs nothing and there is only one drawing to
maintain.

Ten regions. Left/right variants are mirrored automatically from one definition.

| region | reference dimension |
|---|---|
| `upper-arm-r` / `-l` | shoulder to elbow, 32 cm |
| `forearm-r` / `-l` | elbow to wrist, 26 cm |
| `thigh-r` / `-l` | hip crease to knee, 25 cm |
| `calf-r` / `-l` | knee to ankle, 42 cm |
| `chest` | collarbone to sternum, 17 cm |
| `abdomen` | sternum to waist, 27 cm |

## Parts and rotation

Parts are what the customer picks. Each is emitted as its own asset and assembled into
the whole figure, both from the same profile.

| part | length | rotation |
|---|---|---|
| Head | 23 cm | front / back views |
| Neck & torso | 73 cm | front / back views |
| Hips | 26.5 cm | front / back views |
| Left / right arm | 56 cm | 360° continuous |
| Left / right leg | 85 cm | 360° continuous |

Limbs rotate freely because a stack of circular cross-sections looks the same from
every angle — rotation changes which skin faces the viewer, not the outline. The torso
is not circular and its front and back are different drawings, so it steps between
views. See `specs/007-rotate-part.md`.

**Back view:** `figure/back.svg`. Same silhouette as the front — body width doesn't
change front-to-back, so every region/chain/part geometry number is shared — with its
own `BACK_DETAILS` table for the surface drawing (spine, shoulder blades, lats, glutes,
hamstrings). No face, no nipples.

## Chains — spanning a joint

Regions sharing a continuous surface form a chain. Selecting several within one chain
merges their silhouettes, so a tattoo crosses the joint in a single coordinate space
with no seam and no stitching:

| chain | regions | continuous length |
|---|---|---|
| `arm-r` / `arm-l` | upper arm + forearm | 58 cm |
| `leg-r` / `leg-l` | thigh + calf | 67 cm |
| `torso` | chest + abdomen | 44 cm |

Selection *across* chains (chest and an arm) is fine to offer, but each surface warps
on its own — there is no junction model for artwork crossing from torso to limb.

Adding a region is a row in `REGIONS`. Adding a *view* (back, side) is a new profile.

## Why generated

Two things follow from authoring the geometry, and both were meant to be expensive:

- **Scale is exact by construction.** The figure is 180 cm because the profile says so
  in centimetres. `build_figure.py` asserts every region's span against its stated
  reference and fails the build on a mismatch. That's what makes `specs/004` (real-world
  sizing) trustworthy rather than approximate.
- **No painted displacement map.** The silhouette is the surface model — half-width at
  a height is the cylinder radius. `specs/005` (contour warp) reads the same numbers.
  Open `contour-proof.html`: it works in outline style with no shading to help, and
  across a 58 cm span crossing the elbow. The radius is resolved per row, which is what
  makes spanning work — a single radius looks fine on a small piece and visibly wrong
  on anything crossing a joint.

## Shape ordering

Shapes are drawn back-to-front: arms, torso, legs, neck, head, ears. Two details are
load-bearing — the **legs are drawn in front of the torso**, whose outline runs all the
way down to the crotch, so the thigh's own sloped top edge becomes the inguinal crease
instead of a line across the thighs (that line, plus a waistband, is what used to read
as underwear); and the arms are drawn *in front* of the torso so their inner edge reads
as the deltoid and armpit line rather than the arm floating beside the body.

The hips have no drawn detail lines at all, and no outline of their own that the warp
can read: `HIP_SURF` is a separate monotone half-width profile for that span. A closed
outline that doubles back — as any pelvis does at the crotch — cannot be sampled as
"left and right edge at height y"; doing so collapsed the radius to nothing on the rows
where it reversed, and the contour warp drew a tattoo placed there as torn bands.

## Known weakness

The linework is serviceable, not beautiful. Anatomy and proportion are correct and the
geometry is exact, but it's a weaker drawing than a good reference. See `REVIEW.md`.


## Real traced artwork (2026-08-29)

`assets/SVG body parts/` holds the user's actual reference illustrations, traced to
vector. `assets/tools/trace_geometry.py` extracts silhouette geometry directly from
the point cloud (no authored curves — the outline IS the real drawing), and
`assets/tools/merge_manifest.py` combines that with the procedural figure into
`assets/figure/combined.json`, copied to `web/public/figure/parts.json`.

A part with real art is shown as-is when it's the only one selected. Several parts
selected together fall back to the procedural assembled figure, since spanning a
joint needs one shared coordinate space that only the assembled body provides.

**QA status of the supplied files:**

| file | result |
|---|---|
| `02_neck_and_torso.svg` | good — outline trace |
| `05_back_with_neck.svg` | good — outline trace |
| `03_left_arm.svg` | good — outline trace (mirrored for `arm-r`) |
| `07_left_leg.svg` / `08_right_leg.svg` | good — outline traces |
| `01_head.svg` | **broken** — solid black fill, not an outline. Excluded; head still uses the procedural drawing. |
| `06_hips.svg` | **broken** — solid black fill, not an outline. Excluded; hips still uses the procedural drawing. |
| `04_right_arm.svg` | **missing** from the folder. `arm-r` mirrors the left-arm file as a stand-in. |

Fill ratio (actual ink area ÷ the path's own bounding box) is what separates the two
groups cleanly: 1–9% for the five outline traces, 64–70% for the two broken ones —
diagnosed with `python3 -c` one-liners during this session, not a rendering bug on
the app's end.

Rebuild after any change to the source SVGs or the profile:

```
python3 assets/tools/build_figure.py
python3 assets/tools/trace_geometry.py
python3 assets/tools/merge_manifest.py
cp assets/figure/*.svg web/public/figure/
cp assets/figure/real/*.svg web/public/figure/real/
cp assets/figure/combined.json web/public/figure/parts.json
cp assets/figure/female/*.svg web/public/figure/female/
cp assets/figure/female/regions.json web/public/figure/female/parts.json
```

## Two figures (2026-09-01)

`build_figure.py` builds a **variant** per body (`specs/009`): male at 180 cm into
`assets/figure/`, female at 165 cm into `assets/figure/female/`. The female anatomy is
derived from the male tables, not authored separately — heights by one factor, limbs by
their own centre/width factors, the torso by a per-height width factor (waist 0.83,
hips 1.14) — so the two figures cannot drift structurally, and the female *silhouette*,
which is what the contour warp reads, is genuinely female rather than a scaled-down
male one. Only the chest linework is replaced outright; pecs are not breasts.

Female part files carry a `female/` prefix in their `art` field so the app's fetch path
needs no special case. Ids match the male set, so a region selection survives the
switch. There is no real traced artwork for the female figure — every part is
procedural, which the canvas has always supported.
