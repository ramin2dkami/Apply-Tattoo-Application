# REVIEW

Running log. Newest at the top. One entry per session where something shipped,
something broke, or something was learned. Keep entries short and specific — this
file is for reconstructing *why*, not for celebrating.

Entry format:

```
## YYYY-MM-DD — short title

**Shipped:** what actually works now
**Learned:** what we found out (from a user, from the code, from being wrong)
**Changed:** what this means for the roadmap
**Open:** what's still unresolved
```

---

## 2026-08-28 — Parts, and 360° rotation

**Shipped:** Parts matching the mockup — head, neck & torso, hips, left/right arm,
left/right leg — emitted alongside the assembled figure from the same profile. A
rotation model per part, and a proof that a limb rotates through 360° from one drawing
with the tattoo staying fixed to the same patch of skin. `specs/007-rotate-part.md`.

**Learned:**

- **Rotating a limb needs no extra drawings.** A limb is a stack of near-circular
  cross-sections, so its outline is identical from every angle — rotating changes which
  skin faces the viewer, not the silhouette. 360° is therefore one extra term in the
  projection, `alpha - theta`, not eight illustrations per limb. This was the thing most
  likely to be expensive and it turned out nearly free.
- **The torso is a different problem, and the mockup already knew that.** Its
  cross-section is nowhere near circular and front and back are genuinely different
  pictures — which is exactly why the mockup lists "neck & torso" and "back" separately
  rather than expecting one rotating torso. Head, torso and hips get discrete views.
- **Anatomy lines carry the entire perception of rotation.** With a fixed outline, a
  rotating limb looks static unless surface detail moves. Putting the biceps, elbow
  crease and ulna ridge on the surface at their own angles is what makes it read as
  turning rather than as a bug.
- **"Individual SVGs or one figure" was a false choice.** The source of truth is the
  measurements; a part and a whole figure are two projections of the same numbers.
  Generating both costs nothing and they can't drift.

**Changed:** D7 and D8 added. `specs/001` reframed around parts with regions underneath;
`specs/007` created. Roadmap gains a rotation item.

**Open:**
- **The back view is the one genuinely new drawing the mockup needs.** Everything else
  is already generated. It's a new profile, not a new system.
- Forearms and calves are noticeably elliptical, not round. The circular approximation
  is at its worst at 90°, where an ellipse is narrowest. Fix is one number per part —
  but check whether it's visible before adding it.
- Rotation has to appear in the brief. "Outer forearm, rotated 90°" is exactly the
  ambiguity the product exists to remove, so it can't live only in the picture.
- Still unresolved from yesterday: the linework is serviceable, not beautiful, and no
  artist has seen any of this.

## 2026-08-28 — Multi-select, and spanning a joint

**Shipped:** Regions are now multi-select. Ten regions (left/right arms and legs, chest,
stomach) and five *chains* — runs of regions sharing a continuous surface, which a
tattoo may span. The contour warp resolves radius per row, so a piece crossing the elbow
pinches where the arm narrows. `contour-proof.html` rebuilt as static SVG.

**Learned:**

- **Spanning settles the architecture question, from an angle D5 didn't anticipate.**
  Asked whether individual per-limb SVGs were needed, the answer turns out to be
  stronger than "no": per-limb files would *break* spanning. A tattoo crossing the elbow
  would have to be split across two coordinate systems and stitched, fighting alignment
  and a seam at every joint, forever. One figure makes it nearly free.
- **A single radius per tattoo is wrong as soon as anything spans.** It looks fine on a
  small piece, which is how it would ship unnoticed, and visibly wrong on a sleeve —
  the limb's width changes underneath the artwork. Radius has to be resolved per row.
- **The preview harness doesn't run page scripts.** Two rounds were spent looking at a
  blank canvas before checking. Computing the warp at build time and emitting static
  SVG is better anyway: the proof now renders anywhere, needs no JS, and warping vector
  geometry makes the distortion exact rather than sampled.

**Changed:** D6 added. `specs/001` covers multi-select and chains, `specs/003` states a
span is one canvas, `specs/005` carries the per-row algorithm. Roadmap item 1 now reads
ten regions with multi-select.

**Open:**
- Cross-chain spans (shoulder into arm) have no junction model. Selection is allowed;
  contouring is per-surface. Moved to Next rather than faked.
- Multi-select needs an interaction that reads on a phone. Tap-to-toggle is obvious;
  whether anyone *discovers* spanning is possible is not.
- The linework is still serviceable rather than beautiful. Unchanged from yesterday,
  and still the thing most worth an artist's opinion.

## 2026-08-27 — Neutral outline figure, replacing the shaded limbs

**Shipped:** `assets/tools/build_figure.py` and the figure it generates — one neutral
front-view line drawing, 180 cm at 10 px/cm, with six named regions (forearm, upper
arm, thigh, calf, chest, stomach). `contour-proof.html` rebuilt against it. The shaded
per-limb assets from this morning are deleted.

**Learned:**

- **Neutral outline removes two problems at once.** No skin tone means no "which body
  is the default" decision and nothing for a customer to feel excluded by. It's also
  the register artists already read — flash sheets and placement charts look like this,
  so it lands as a professional tool rather than a toy.
- **Regions beat separate assets.** "Left inner forearm" is a place on a body, not a
  standalone object. Vector art makes a region view a zoomed viewBox into the same
  file, so there's one drawing to maintain instead of seven and zooming is free.
- **The contour warp survived the style change unaltered.** Worth noting because it
  was the risky item: the warp was always geometric, never dependent on shading. It
  reads on plain outline with nothing but compression selling the curve. Only change
  was raising the opacity floor to ~0.45 — on white, ink that fades too far at the
  edges looks like a bug rather than a surface turning away.
- Two things in the drawing are load-bearing and were not obvious: the shorts exist to
  hide the torso/leg junction, and the arms must be drawn *in front* of the torso so
  their inner edge reads as the deltoid line instead of the arm floating beside the body.

**Changed:** `specs/001` is now a region picker rather than a grid of body parts. D5
added to `context/decisions.md`. Skin tone options dropped from the roadmap entirely —
the neutral figure makes them moot.

**Open:**
- **The linework is serviceable, not beautiful.** Proportion and geometry are right,
  but it's a weaker drawing than the reference it came from, and hand-tuning
  coordinates converges slowly. Options: keep iterating, commission linework, or
  vectorise a reference image and fit the region geometry to it. The third is cheapest
  and needs `potrace` (not installed) plus a clear answer on where the source art came
  from — tracing someone else's illustration into a commercial product is a licensing
  problem, tracing your own or a generated one isn't.
- Regions give no affordance on an outline drawing. Needs a visible hit state.
- `wrapDegrees` for chest and stomach (105–110) is a guess. Untested against a real
  placement.
- One figure means one set of proportions. Whether that's enough for an artist to quote
  from is a question for the first artist conversation.

## 2026-08-27 — Body part assets are generated, not commissioned

**Shipped:** An asset pipeline (`assets/tools/build_body_part.py`) and the first three
body parts — forearm, upper arm, calf — as hand-authored SVG. Plus
`assets/contour-proof.html`, a working demonstration of the contour warp.

**Learned:** Two things, and the second is the useful one.

1. The illustrations don't need commissioning or licensing. They're authored as SVG
   from a table of ~12 `(y, left, right)` rows at a fixed 30 px/cm. One profile emits
   both the artwork and `meta.json`, so scale and geometry can't drift apart, and the
   build asserts px/cm on every run.

2. **The displacement map doesn't need painting either.** A limb is close enough to a
   cylinder that the silhouette *is* the surface model — half-width at a height is the
   radius, and the normal follows from horizontal position within it. Foreshortening
   and the edge fade both fall out of `s = R·asin((x−cx)/R)`. This was the real cost
   worry: a hand-painted map per asset would have made a seven-part library expensive
   and a twenty-part library untenable. It's now zero marginal cost per asset.

**Changed:** `specs/001` and `specs/005` rewritten. `displacement.png` is gone from the
asset format. The blocking open question from the setup entry below is closed. Adding
the remaining four body parts is now editing a table rather than a procurement
decision.

**Open:**
- The three assets are anatomically plausible but generic — they read as "a limb"
  rather than a specific person's forearm. Unknown whether that's good enough for an
  artist to quote from. This is a question for the first artist conversation, not
  something to solve by drawing harder.
- Back and chest aren't cylinders. They need a different surface model, or none.
- The warp uses the radius at the tattoo's centre and ignores taper across its height.

## 2026-08-27 — Workspace set up

**Shipped:** The workspace scaffold — `CLAUDE.md`, `ROADMAP.md`, this file, and the
`context/`, `customers/`, `specs/`, `demos/`, `routines/` folders. No product code yet.

**Learned:** Four decisions locked in up front (see `context/decisions.md`):
responsive web app rather than native; illustrated body parts rather than user photos;
shareable link as the handoff; no accounts in v1. The illustration choice is the
important one — because we draw the body parts ourselves, we know their real
dimensions and their surface geometry, which is what makes both accurate sizing and
believable contouring achievable in a prototype.

**Changed:** Roadmap v1 is six items ending in a shareable link. Everything about
artist accounts moved to Later.

**Open:** Where the body-part illustrations come from (commission, stock, or generate)
and how many we need before the picker feels real. Blocking `specs/001`.
